import { and, desc, eq, isNull } from 'drizzle-orm';

import { users, emailVerificationTokens } from '../src/modules/identity/identity.schema';
import { deriveVerificationToken } from '../src/modules/identity/tokens';
import type { Harness } from './harness';

export const validRegistration = (overrides: Record<string, unknown> = {}) => ({
  email: 'rider@example.com',
  password: 'long-enough',
  birthDate: '1990-05-01',
  personalDataConsent: true,
  ...overrides,
});

export interface CallResult {
  status: number;
  body: unknown;
  headers: Record<string, unknown>;
}

export async function call(
  h: Harness,
  method: 'GET' | 'POST',
  url: string,
  payload?: unknown,
  headers: Record<string, string> = {},
): Promise<CallResult> {
  const response = await h.app.inject({
    method,
    url,
    headers,
    ...(payload === undefined ? {} : { payload: payload as Record<string, unknown> }),
  });
  const text = response.body;
  return {
    status: response.statusCode,
    body: text ? (JSON.parse(text) as unknown) : undefined,
    headers: response.headers,
  };
}

export const register = (h: Harness, overrides: Record<string, unknown> = {}) =>
  call(h, 'POST', '/v1/auth/register', validRegistration(overrides));

/** Токен действующей ссылки пользователя — тот же, что окажется в письме (HMAC от id строки). */
export async function activeLinkToken(h: Harness, email = 'rider@example.com'): Promise<string> {
  const [row] = await h.db
    .select({ id: emailVerificationTokens.id })
    .from(emailVerificationTokens)
    .innerJoin(users, eq(users.id, emailVerificationTokens.userId))
    .where(
      and(
        eq(users.email, email),
        isNull(emailVerificationTokens.supersededAt),
        isNull(emailVerificationTokens.usedAt),
      ),
    )
    .orderBy(desc(emailVerificationTokens.createdAt));
  if (!row) throw new Error('no active verification token');
  return deriveVerificationToken(h.env.EMAIL_TOKEN_SECRET, row.id);
}

export const confirm = (h: Harness, token: string) =>
  call(h, 'POST', '/v1/auth/verification/confirm', { token });

export const poll = (h: Harness, registrationToken: string) =>
  call(h, 'POST', '/v1/auth/registration/poll', { registrationToken });

export const resend = (h: Harness, body: Record<string, string>) =>
  call(h, 'POST', '/v1/auth/verification/resend', body);
