import { ENV, MAILER } from '@rkarakulov/api-kit';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { outbox } from '../src/db';
import { users } from '../src/modules/identity/identity.schema';
import { createHarness, type Harness } from './harness';
import { register } from './identity';

let h: Harness;
beforeAll(async () => {
  h = await createHarness({ TRUST_PROXY: '1' });
});
beforeEach(async () => {
  await h.reset();
});
afterAll(async () => {
  await h.close();
});

describe('стенд on-bike (обёртка createApiHarness)', () => {
  it('HTTP API on-bike под префиксом версии контракта', async () => {
    const res = await h.app.inject({ method: 'GET', url: '/v1/health' });
    expect(res.statusCode).toBe(200);
  });

  it('окружение тестов с переопределениями — в ENV API и worker; MAILER worker — FakeMailer стенда', () => {
    expect(h.env.TRUST_PROXY).toBe(1);
    expect(h.app.get(ENV)).toBe(h.env);
    expect(h.worker.get(ENV)).toBe(h.env);
    expect(h.worker.get(MAILER)).toBe(h.mailer);
  });

  it('reset() чистит таблицы on-bike и outbox, справочник PostGIS не трогает', async () => {
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
