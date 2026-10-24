import { createHash, createHmac } from 'node:crypto';

import { VerificationToken } from '@on-bike/contracts';
import { describe, expect, it } from 'vitest';

import {
  deriveVerificationToken,
  randomToken,
  rateLimitAddress,
  rateLimitKeyForIp,
  sha256,
  signInLimitKeys,
} from './tokens';

describe('tokens', () => {
  it('случайный токен — 32 байта base64url по контракту, каждый раз новый', () => {
    const a = randomToken();
    expect(VerificationToken.safeParse(a).success).toBe(true);
    expect(randomToken()).not.toBe(a);
  });

  it('ключи лимитов входа — HMAC: без сырых e-mail и IP, пара отличается от каждого по отдельности', () => {
    const secret = 'x'.repeat(32);
    const keys = signInLimitKeys(secret, 'rider@example.com', '203.0.113.7');

    expect(Object.keys(keys).sort()).toEqual(['email', 'emailIp', 'ip']);
    for (const key of Object.values(keys)) {
      expect(key).not.toContain('rider');
      expect(key).not.toContain('example.com');
      expect(key).not.toContain('203.0.113');
    }
    expect(keys.ip).toMatch(/^signin-ip:[\w-]{43}$/);
    expect(keys.email).toMatch(/^signin-email:[\w-]{43}$/);
    expect(keys.emailIp).toMatch(/^signin-email-ip:[\w-]{43}$/);
    expect(signInLimitKeys(secret, 'rider@example.com', '203.0.113.8').email).toBe(keys.email);
    expect(signInLimitKeys(secret, 'rider@example.com', '203.0.113.8').emailIp).not.toBe(
      keys.emailIp,
    );
    expect(signInLimitKeys('y'.repeat(32), 'rider@example.com', '203.0.113.7').email).not.toBe(
      keys.email,
    );
  });

  it('адрес лимита: IPv4 как есть, IPv6 — сеть /64 (суффикс клиент меняет свободно), IPv4 в IPv6 — как IPv4', () => {
    expect(rateLimitAddress('203.0.113.7')).toBe('203.0.113.7');
    expect(rateLimitAddress('2001:db8:1:2::1')).toBe('2001:db8:1:2::/64');
    expect(rateLimitAddress('2001:DB8:1:2:ffff:0:0:9')).toBe('2001:db8:1:2::/64');
    expect(rateLimitAddress('2001:0db8:0001:0002:0000:0000:0000:0001')).toBe('2001:db8:1:2::/64');
    expect(rateLimitAddress('::1')).toBe('0:0:0:0::/64');
    expect(rateLimitAddress('fe80::1%eth0')).toBe('fe80:0:0:0::/64');
    expect(rateLimitAddress('::ffff:203.0.113.7')).toBe('203.0.113.7');
    // IPv4-mapped в любой записи: hex-хвост, полная форма, верхний регистр, нули с ведущими нулями
    expect(rateLimitAddress('::ffff:102:304')).toBe('1.2.3.4');
    expect(rateLimitAddress('0:0:0:0:0:ffff:1.2.3.4')).toBe('1.2.3.4');
    expect(rateLimitAddress('0000:0000:0000:0000:0000:FFFF:0102:0304')).toBe('1.2.3.4');
    expect(rateLimitAddress('::FFFF:cb00:7107')).toBe('203.0.113.7');
    // не mapped: другой префикс — обычный IPv6 по /64
    expect(rateLimitAddress('::fffe:102:304')).toBe('0:0:0:0::/64');
    expect(rateLimitAddress('64:ff9b::1.2.3.4')).toBe('64:ff9b:0:0::/64');
    // не IP (так не бывает за Fastify) — как есть, без падения
    expect(rateLimitAddress('unknown')).toBe('unknown');
  });

  it('ключи лимитов по IP: адреса одной IPv6 /64 — один ключ, разные /64 — разные', () => {
    const secret = 'x'.repeat(32);
    expect(rateLimitKeyForIp(secret, '2001:db8:1:2::1')).toBe(
      rateLimitKeyForIp(secret, '2001:db8:1:2::abcd'),
    );
    expect(rateLimitKeyForIp(secret, '2001:db8:1:2::1')).not.toBe(
      rateLimitKeyForIp(secret, '2001:db8:1:3::1'),
    );
    const a = signInLimitKeys(secret, 'rider@example.com', '2001:db8:1:2::1');
    const b = signInLimitKeys(secret, 'rider@example.com', '2001:db8:1:2::2');
    expect(b.ip).toBe(a.ip);
    expect(b.emailIp).toBe(a.emailIp);
  });

  it('sha256 — hex', () => {
    expect(sha256('abc')).toBe(createHash('sha256').update('abc').digest('hex'));
  });

  it('токен ссылки выводится из id строки ключом HMAC: детерминирован и зависит от ключа', () => {
    const id = '0199f0d2-0000-7000-8000-000000000001';
    const secret = 'x'.repeat(32);
    const token = deriveVerificationToken(secret, id);
    expect(token).toBe(
      createHmac('sha256', secret).update(`email-verify:${id}`).digest('base64url'),
    );
    expect(VerificationToken.safeParse(token).success).toBe(true);
    expect(deriveVerificationToken(secret, id)).toBe(token);
    expect(deriveVerificationToken('y'.repeat(32), id)).not.toBe(token);
  });
});
