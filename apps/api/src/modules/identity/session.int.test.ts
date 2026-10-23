import {
  CookieSession,
  RateLimitedDetails,
  RegisterResponse,
  RegistrationPollResponse,
  Session,
  SESSION_COOKIE,
} from '@on-bike/contracts';
import { eq } from 'drizzle-orm';
import { jwtVerify } from 'jose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createHarness, DAY, MINUTE, type Harness } from '../../../test/harness';
import {
  activeLinkToken,
  call,
  type CallResult,
  confirm,
  poll,
  register,
} from '../../../test/identity';
import { IDENTITY_POLICY } from './identity.policy';
import { sessions, users } from './identity.schema';
import { randomToken, sha256 } from './tokens';

let h: Harness;
beforeAll(async () => {
  h = await createHarness();
});
beforeEach(async () => {
  await h.reset();
});
afterAll(async () => {
  await h.close();
});

const REFRESH = '/v1/auth/session/refresh';
const SIGN_OUT = '/v1/auth/session/sign-out';
const cookieHeader = (token: string) => ({ cookie: `${SESSION_COOKIE.name}=${token}` });

/** Значение cookie сессии из Set-Cookie ответа (`undefined` — не ставилась). */
function setCookie(res: CallResult): string | undefined {
  const header = res.headers['set-cookie'];
  const all = Array.isArray(header) ? header : header === undefined ? [] : [String(header)];
  return all.find((value: unknown) => String(value).startsWith(`${SESSION_COOKIE.name}=`)) as
    string | undefined;
}
const cookieValue = (res: CallResult) =>
  setCookie(res)
    ?.split(';')[0]
    ?.slice(SESSION_COOKIE.name.length + 1);
const isCleared = (res: CallResult) =>
  cookieValue(res) === '' && /Max-Age=0/.test(setCookie(res) ?? '');

/** Регистрация → подтверждение → poll с транспортом: ответ poll. */
async function signUp(transport?: 'body' | 'cookie'): Promise<CallResult> {
  const registered = RegisterResponse.parse((await register(h)).body);
  await confirm(h, await activeLinkToken(h));
  return poll(h, registered.registrationToken, transport);
}

/** Web-вход: refresh из cookie ответа poll. */
async function webSignIn(): Promise<string> {
  const token = cookieValue(await signUp('cookie'));
  if (!token) throw new Error('cookie не выставлена');
  return token;
}

/** Native-вход: refresh из тела ответа poll. */
async function nativeSignIn(): Promise<string> {
  const body = RegistrationPollResponse.parse((await signUp()).body);
  if (body.state !== 'verified') throw new Error('expected verified');
  return Session.parse(body.session).refreshToken;
}

const refreshByCookie = (token: string) => call(h, 'POST', REFRESH, {}, cookieHeader(token));
const refreshByBody = (token: string) => call(h, 'POST', REFRESH, { refreshToken: token });

describe('POST /v1/auth/registration/poll — транспорт сессии', () => {
  it('cookie: Set-Cookie HttpOnly; Secure; SameSite=Strict; Path=/v1/auth/session, в теле refresh нет', async () => {
    const res = await signUp('cookie');

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    const header = setCookie(res) ?? '';
    expect(header).toMatch(/; HttpOnly/);
    expect(header).toMatch(/; Secure/);
    expect(header).toMatch(/; SameSite=Strict/);
    expect(header).toMatch(/; Path=\/v1\/auth\/session(;|$)/);
    expect(header).toMatch(
      new RegExp(`; Max-Age=${IDENTITY_POLICY.refreshTokenTtlMs / 1000}(;|$)`),
    );
    expect(header).not.toMatch(/domain=/i);
    const body = RegistrationPollResponse.parse(res.body);
    if (body.state !== 'verified') throw new Error('expected verified');
    expect(body.session).not.toHaveProperty('refreshToken');
    expect(Object.keys(body.session).sort()).toEqual(
      ['accessToken', 'accessTokenExpiresAt', 'refreshTokenExpiresAt'].sort(),
    );
    const [session] = await h.db.select().from(sessions);
    expect(session?.refreshTokenHash).toBe(sha256(cookieValue(res) ?? ''));
  });

  it('без транспорта (старая сборка native) и body — прежний Session, без Set-Cookie', async () => {
    const legacy = await signUp();
    expect(setCookie(legacy)).toBeUndefined();
    const body = RegistrationPollResponse.parse(legacy.body);
    if (body.state !== 'verified') throw new Error('expected verified');
    expect(Session.safeParse(body.session).success).toBe(true);

    await h.reset();
    const explicit = await signUp('body');
    expect(setCookie(explicit)).toBeUndefined();
    const explicitBody = RegistrationPollResponse.parse(explicit.body);
    if (explicitBody.state !== 'verified') throw new Error('expected verified');
    expect(Session.safeParse(explicitBody.session).success).toBe(true);
  });

  it('sessionTransport вне enum → 400', async () => {
    const registered = RegisterResponse.parse((await register(h)).body);
    const res = await call(h, 'POST', '/v1/auth/registration/poll', {
      registrationToken: registered.registrationToken,
      sessionTransport: 'header',
    });
    expect(res.status).toBe(400);
  });
});

describe('POST /v1/auth/session/refresh', () => {
  it('по cookie: новая cookie, тело — CookieSession, старый refresh → 401; срок сессии не продлевается', async () => {
    const first = await webSignIn();
    const [before] = await h.db.select().from(sessions);
    h.clock.advance(DAY);

    const res = await refreshByCookie(first);

    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('no-store');
    expect(res.body).not.toHaveProperty('refreshToken');
    const body = CookieSession.parse(res.body);
    const next = cookieValue(res);
    expect(next).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(next).not.toBe(first);
    // Max-Age — остаток срока (30 дней от выдачи минус прошедшие сутки)
    expect(setCookie(res)).toMatch(
      new RegExp(`Max-Age=${(IDENTITY_POLICY.refreshTokenTtlMs - DAY) / 1000}(;|$)`),
    );
    expect(body.refreshTokenExpiresAt).toBe(before?.expiresAt.toISOString());
    const [after] = await h.db.select().from(sessions);
    // та же сессия (sid в access), новый хеш, срок прежний; сырого токена в БД нет
    expect(after?.id).toBe(before?.id);
    expect(after?.refreshTokenHash).toBe(sha256(next ?? ''));
    expect(after?.expiresAt).toEqual(before?.expiresAt);
    const { payload } = await jwtVerify(
      body.accessToken,
      new TextEncoder().encode(h.env.JWT_SECRET),
      {
        issuer: 'on-bike',
        audience: 'on-bike-app',
        currentDate: h.clock.now(),
      },
    );
    expect(payload).toMatchObject({ sub: before?.userId, sid: before?.id });

    const replay = await refreshByCookie(first);
    expect(replay.status).toBe(401);
    expect(isCleared(replay)).toBe(true);
    expect((await refreshByCookie(next ?? '')).status).toBe(200);
  });

  it('по телу (native): новый refreshToken в теле, без Set-Cookie; старый → 401', async () => {
    const first = await nativeSignIn();

    const res = await refreshByBody(first);

    expect(res.status).toBe(200);
    expect(setCookie(res)).toBeUndefined();
    const body = Session.parse(res.body);
    expect(body.refreshToken).not.toBe(first);
    const [row] = await h.db.select().from(sessions);
    expect(row?.refreshTokenHash).toBe(sha256(body.refreshToken));
    expect((await refreshByBody(first)).status).toBe(401);
    expect((await refreshByBody(body.refreshToken)).status).toBe(200);
  });

  it('access не живёт дольше сессии', async () => {
    const token = await webSignIn();
    const [row] = await h.db.select().from(sessions);
    h.clock.advance(IDENTITY_POLICY.refreshTokenTtlMs - 5 * MINUTE);

    const body = CookieSession.parse((await refreshByCookie(token)).body);

    expect(body.accessTokenExpiresAt).toBe(row?.expiresAt.toISOString());
  });

  it('истёкшая, отозванная, удалённый пользователь, нет cookie, мусор, неизвестный → одинаковый 401; сброс — только предъявленной cookie', async () => {
    const results: CallResult[] = [];

    const expired = await webSignIn();
    h.clock.advance(IDENTITY_POLICY.refreshTokenTtlMs);
    results.push(await refreshByCookie(expired));

    await h.reset();
    const revoked = await webSignIn();
    await h.db.update(sessions).set({ revokedAt: h.clock.now() });
    results.push(await refreshByCookie(revoked));

    await h.reset();
    const orphan = await webSignIn();
    await h.db.update(users).set({ deletedAt: h.clock.now() });
    results.push(await refreshByCookie(orphan));

    results.push(await refreshByCookie('not-a-token'));
    results.push(await refreshByCookie(randomToken()));
    // без cookie сбрасывать нечего: Set-Cookie сброса стёр бы cookie, выданную тем временем poll другой вкладки
    const anonymous = await call(h, 'POST', REFRESH, {});

    for (const res of [...results, anonymous]) {
      expect(res.status).toBe(401);
      expect(res.body).toEqual({ code: 'UNAUTHORIZED', message: expect.any(String) });
      expect(res.headers['cache-control']).toBe('no-store');
    }
    for (const res of results) expect(isCleared(res)).toBe(true);
    expect(setCookie(anonymous)).toBeUndefined();
    expect(new Set([...results, anonymous].map((res) => JSON.stringify(res.body))).size).toBe(1);
  });

  it('refreshToken в теле не по схеме → 400 (валидация контракта)', async () => {
    expect((await refreshByBody('short')).status).toBe(400);
  });

  it('гонка двух refresh одним токеном — ровно один 200', async () => {
    const token = await webSignIn();

    const results = await Promise.all(Array.from({ length: 5 }, () => refreshByCookie(token)));

    expect(results.map((res) => res.status).sort()).toEqual([200, 401, 401, 401, 401]);
    const winner = results.find((res) => res.status === 200);
    const [row] = await h.db.select().from(sessions);
    expect(row?.refreshTokenHash).toBe(sha256(cookieValue(winner as CallResult) ?? ''));
  });

  it(`лимит по IP: ${IDENTITY_POLICY.refreshPerIpLimit.limit} в окно, дальше 429 с retryAfterSec`, async () => {
    const { limit } = IDENTITY_POLICY.refreshPerIpLimit;
    for (let i = 0; i < limit; i += 1) {
      expect((await refreshByCookie(randomToken())).status).toBe(401);
    }

    const res = await refreshByCookie(randomToken());

    expect(res.status).toBe(429);
    expect(res.body).toMatchObject({ code: 'RATE_LIMITED' });
    const details = RateLimitedDetails.parse((res.body as { details: unknown }).details);
    expect(details.retryAfterSec).toBeGreaterThan(0);
    // 429 не сбрасывает cookie: токен мог быть живым
    expect(setCookie(res)).toBeUndefined();
  });
});

describe('POST /v1/auth/session/sign-out', () => {
  it('по cookie: 204 без тела, cookie сброшена, revoked_at; повтор — 204; refresh после — 401', async () => {
    const token = await webSignIn();

    const res = await call(h, 'POST', SIGN_OUT, {}, cookieHeader(token));

    expect(res.status).toBe(204);
    expect(res.body).toBeUndefined();
    expect(res.headers['cache-control']).toBe('no-store');
    expect(isCleared(res)).toBe(true);
    const [row] = await h.db.select().from(sessions);
    expect(row?.revokedAt).toEqual(h.clock.now());

    const again = await call(h, 'POST', SIGN_OUT, {}, cookieHeader(token));
    expect(again.status).toBe(204);
    expect(again.body).toBeUndefined();
    expect((await refreshByCookie(token)).status).toBe(401);
  });

  it('по телу (native): 204, сессия отозвана, cookie не трогаем', async () => {
    const token = await nativeSignIn();

    const res = await call(h, 'POST', SIGN_OUT, { refreshToken: token });

    expect(res.status).toBe(204);
    expect(setCookie(res)).toBeUndefined();
    const [row] = await h.db
      .select()
      .from(sessions)
      .where(eq(sessions.refreshTokenHash, sha256(token)));
    expect(row?.revokedAt).toEqual(h.clock.now());
    expect((await refreshByBody(token)).status).toBe(401);
  });

  it('без cookie, с мусором или неизвестным токеном — 204 (идемпотентно, без оракула)', async () => {
    for (const headers of [{}, cookieHeader('garbage'), cookieHeader(randomToken())]) {
      const res = await call(h, 'POST', SIGN_OUT, {}, headers);
      expect(res.status).toBe(204);
      expect(res.body).toBeUndefined();
      expect(isCleared(res)).toBe(true);
    }
  });
});
