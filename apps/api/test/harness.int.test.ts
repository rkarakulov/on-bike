import { ENV, MAILER } from '@rkarakulov/api-kit';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { outbox } from '../src/db';
import { users } from '../src/modules/identity/identity.schema';
import { createHarness, type Harness } from './harness';
import { register } from './identity';

const WEB = 'http://127.0.0.1:8081';

let h: Harness;
beforeAll(async () => {
  h = await createHarness({ TRUST_PROXY: '1', CORS_ORIGINS: WEB });
});
beforeEach(async () => {
  await h.reset();
});
afterAll(async () => {
  await h.close();
});

describe('стенд pokatim (обёртка createApiHarness)', () => {
  it('HTTP API pokatim под префиксом версии контракта', async () => {
    const res = await h.app.inject({ method: 'GET', url: '/v1/health' });
    expect(res.statusCode).toBe(200);
  });

  it('HTTP-настройка проекта (configureHttp, как в main.ts): CORS только для CORS_ORIGINS', async () => {
    const fromWeb = await h.app.inject({
      method: 'GET',
      url: '/v1/health',
      headers: { origin: WEB },
    });
    expect(fromWeb.headers['access-control-allow-origin']).toBe(WEB);
    const foreign = await h.app.inject({
      method: 'GET',
      url: '/v1/health',
      headers: { origin: 'https://evil.example' },
    });
    expect(foreign.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('окружение тестов с переопределениями — в ENV API и worker; MAILER worker — FakeMailer стенда', () => {
    expect(h.env.TRUST_PROXY).toBe(1);
    expect(h.app.get(ENV)).toBe(h.env);
    expect(h.worker.get(ENV)).toBe(h.env);
    expect(h.worker.get(MAILER)).toBe(h.mailer);
  });

  it('reset() чистит таблицы pokatim и outbox, справочник PostGIS не трогает', async () => {
    expect((await register(h)).status).toBe(201);
    expect(await h.db.select().from(users)).toHaveLength(1);
    expect(await h.db.select().from(outbox)).toHaveLength(1);

    await h.reset();

    expect(await h.db.select().from(users)).toEqual([]);
    expect(await h.db.select().from(outbox)).toEqual([]);
    const { rows } = await h.db.execute<{ n: number }>(
      sql`SELECT count(*)::int AS n FROM spatial_ref_sys`,
    );
    expect(rows[0]?.n).toBeGreaterThan(0);
  });
});
