import { describe, expect, it } from 'vitest';

import {
  ConfirmVerificationRequest,
  ResendVerificationRequest,
  ResendVerificationResponse,
  VerificationLinkInfo,
  VerificationToken,
} from './verification.schema.ts';

const token = 'Ab9_-'.repeat(8) + 'xyz';

describe('VerificationToken', () => {
  it('base64url из 32 байт — ровно 43 символа', () => {
    expect(token).toHaveLength(43);
    expect(VerificationToken.safeParse(token).success).toBe(true);
    expect(VerificationToken.safeParse(token.slice(1)).success).toBe(false);
    expect(VerificationToken.safeParse(`${token.slice(1)}=`).success).toBe(false);
    expect(VerificationToken.safeParse(`${token.slice(1)}+`).success).toBe(false);
  });
});

describe('VerificationLinkInfo', () => {
  it('каждое состояние несёт e-mail', () => {
    for (const state of ['valid', 'verified', 'expired'] as const) {
      expect(VerificationLinkInfo.parse({ state, email: 'rider@example.com' }).state).toBe(state);
      expect(VerificationLinkInfo.safeParse({ state }).success).toBe(false);
    }
    expect(VerificationLinkInfo.safeParse({ state: 'used', email: 'a@b.by' }).success).toBe(false);
  });
});

describe('ConfirmVerificationRequest', () => {
  it('принимает только токен ссылки', () => {
    expect(ConfirmVerificationRequest.safeParse({ token }).success).toBe(true);
    expect(ConfirmVerificationRequest.safeParse({ token: 'short' }).success).toBe(false);
  });
});

describe('ResendVerificationRequest', () => {
  it('по токену регистрации или по ссылке', () => {
    expect(ResendVerificationRequest.safeParse({ registrationToken: token }).success).toBe(true);
    expect(ResendVerificationRequest.safeParse({ linkToken: token }).success).toBe(true);
    expect(ResendVerificationRequest.safeParse({}).success).toBe(false);
  });

  it('ответ: пауза до следующего повтора или «уже подтверждён»', () => {
    expect(ResendVerificationResponse.parse({ resendAvailableInSec: 60 })).toEqual({
      resendAvailableInSec: 60,
    });
    expect(ResendVerificationResponse.parse({ state: 'verified' })).toEqual({ state: 'verified' });
    expect(ResendVerificationResponse.safeParse({ state: 'pending' }).success).toBe(false);
  });
});
