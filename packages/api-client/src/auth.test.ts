import { describe, expect, it } from 'vitest';

import { ApiHttpError, createApiClient } from './index.ts';

const token = 'T'.repeat(43);

interface Call {
  url: string;
  method: string | undefined;
  body: unknown;
}

function recorder(status: number, response: unknown) {
  const calls: Call[] = [];
  const fetchImpl = ((url: string, init?: RequestInit) => {
    calls.push({
      url,
      method: init?.method,
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    });
    return Promise.resolve(new Response(JSON.stringify(response), { status }));
  }) as typeof fetch;
  return { calls, api: createApiClient({ baseUrl: 'https://api.test', fetchImpl }) };
}

describe('api-client: регистрация и подтверждение e-mail', () => {
  it('register — POST тела запроса, ответ по контракту', async () => {
    const body = {
      email: 'rider@example.com',
      password: 'long-enough',
      birthDate: '1990-05-01',
      personalDataConsent: true as const,
    };
    const response = { registrationToken: token, email: body.email, resendAvailableInSec: 60 };
    const { calls, api } = recorder(201, response);
    await expect(api.register(body)).resolves.toEqual(response);
    expect(calls).toEqual([{ url: 'https://api.test/v1/auth/register', method: 'POST', body }]);
  });

  it('getVerificationLink — GET без тела, токен в пути', async () => {
    const { calls, api } = recorder(200, { state: 'valid', email: 'rider@example.com' });
    await expect(api.getVerificationLink(token)).resolves.toEqual({
      state: 'valid',
      email: 'rider@example.com',
    });
    expect(calls).toEqual([
      { url: `https://api.test/v1/auth/verification/${token}`, method: 'GET', body: undefined },
    ]);
  });

  it('confirm, resend, poll — POST в свои пути', async () => {
    const confirm = recorder(200, { state: 'verified', email: 'rider@example.com' });
    await confirm.api.confirmVerification({ token });
    expect(confirm.calls[0]).toMatchObject({
      url: 'https://api.test/v1/auth/verification/confirm',
      method: 'POST',
      body: { token },
    });

    const resend = recorder(200, { resendAvailableInSec: 60 });
    await expect(resend.api.resendVerification({ linkToken: token })).resolves.toEqual({
      resendAvailableInSec: 60,
    });
    expect(resend.calls[0]).toMatchObject({
      url: 'https://api.test/v1/auth/verification/resend',
      body: { linkToken: token },
    });

    const poll = recorder(200, { state: 'pending' });
    await expect(poll.api.pollRegistration({ registrationToken: token })).resolves.toEqual({
      state: 'pending',
    });
    expect(poll.calls[0]).toMatchObject({
      url: 'https://api.test/v1/auth/registration/poll',
      body: { registrationToken: token },
    });
  });
});

describe('ApiHttpError.apiError — толерантный разбор ошибки', () => {
  const failWith = async (status: number, body: unknown) =>
    (await recorder(status, body)
      .api.getVerificationLink(token)
      .catch((e: unknown) => e)) as ApiHttpError;

  it('известный код — как есть, с деталями', async () => {
    const error = await failWith(429, {
      code: 'RATE_LIMITED',
      message: 'Слишком часто',
      details: { retryAfterSec: 42 },
    });
    expect(error).toBeInstanceOf(ApiHttpError);
    expect(error.apiError).toEqual({
      code: 'RATE_LIMITED',
      message: 'Слишком часто',
      details: { retryAfterSec: 42 },
    });
  });

  it('код из более новой версии сервера — UNKNOWN, сообщение сохраняется', async () => {
    const error = await failWith(409, { code: 'BRAND_NEW', message: 'Новое' });
    expect(error.apiError).toEqual({ code: 'UNKNOWN', message: 'Новое' });
  });

  it('тело не ApiError (прокси, HTML) — UNKNOWN', async () => {
    const error = await failWith(502, null);
    expect(error.status).toBe(502);
    expect(error.apiError.code).toBe('UNKNOWN');
  });
});
