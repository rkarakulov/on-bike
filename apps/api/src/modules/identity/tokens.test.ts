import { createHash, createHmac } from 'node:crypto';

import { VerificationToken } from '@on-bike/contracts';
import { describe, expect, it } from 'vitest';

import { deriveVerificationToken, randomToken, sha256, signInLimitKeys } from './tokens';

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
