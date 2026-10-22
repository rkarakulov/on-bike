import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createHarness, type Harness } from '../test/harness';
import { validRegistration } from '../test/identity';
import { IDENTITY_POLICY } from './modules/identity/identity.policy';

let h: Harness;
beforeAll(async () => {
  // за Caddy: доверяем ровно одному прокси
  h = await createHarness({ TRUST_PROXY: '1' });
});
beforeEach(async () => {
  await h.reset();
});
afterAll(async () => {
  await h.close();
});

/** Запрос «через Caddy»: сокет — адрес прокси, справа в X-Forwarded-For — адрес, который добавил Caddy. */
const registerVia = (spoofedLeft: string, index: number) =>
  h.app.inject({
    method: 'POST',
    url: '/v1/auth/register',
    remoteAddress: '10.0.0.1',
    headers: { 'x-forwarded-for': `${spoofedLeft}, 1.2.3.4` },
    payload: validRegistration({ email: `rider${index}@example.com` }),
  });

describe('IP клиента за прокси (TRUST_PROXY = 1)', () => {
  it('подмена левого X-Forwarded-For не обходит лимит регистраций по IP', async () => {
    const { limit } = IDENTITY_POLICY.registerPerIpLimit;
    for (let i = 0; i < limit; i += 1) {
      expect((await registerVia(`6.6.6.${i}`, i)).statusCode).toBe(201);
    }
    // клиент снова меняет «свой» адрес — лимит считается по адресу от Caddy (1.2.3.4)
    expect((await registerVia('7.7.7.7', limit)).statusCode).toBe(429);
  });
});
