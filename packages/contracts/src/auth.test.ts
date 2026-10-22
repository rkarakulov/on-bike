import { describe, expect, it } from 'vitest';

import { ageInYears, RegisterRequest } from './auth.ts';

describe('ageInYears', () => {
  it('не считает год до дня рождения', () => {
    expect(ageInYears(new Date('2008-10-23'), new Date('2026-10-22'))).toBe(17);
    expect(ageInYears(new Date('2008-10-22'), new Date('2026-10-22'))).toBe(18);
  });
});

describe('RegisterRequest', () => {
  const valid = {
    email: 'rider@example.com',
    password: 'long-enough',
    birthDate: '1990-05-01',
    personalDataConsent: true,
  };

  it('принимает валидную регистрацию', () => {
    expect(RegisterRequest.safeParse(valid).success).toBe(true);
  });

  it('отклоняет младше 18 и без согласия', () => {
    expect(RegisterRequest.safeParse({ ...valid, birthDate: '2015-01-01' }).success).toBe(false);
    expect(RegisterRequest.safeParse({ ...valid, personalDataConsent: false }).success).toBe(false);
  });
});
