import { createHash, createHmac } from 'node:crypto';

import { VerificationToken } from '@on-bike/contracts';
import { describe, expect, it } from 'vitest';

import { deriveVerificationToken, randomToken, sha256 } from './tokens';

describe('tokens', () => {
  it('случайный токен — 32 байта base64url по контракту, каждый раз новый', () => {
    const a = randomToken();
    expect(VerificationToken.safeParse(a).success).toBe(true);
    expect(randomToken()).not.toBe(a);
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
