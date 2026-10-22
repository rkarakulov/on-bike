import type { Job } from 'bullmq';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createHarness, DAY, type Harness, waitForLockWaiter } from '../../../../test/harness';
import { register } from '../../../../test/identity';
import { emailVerificationTokens, registrationTokens, users } from '../identity.schema';
import { CleanupUnverifiedProcessor } from './cleanup-unverified.processor';

let h: Harness;
let processor: CleanupUnverifiedProcessor;
beforeAll(async () => {
  h = await createHarness();
  processor = h.worker.get(CleanupUnverifiedProcessor);
});
beforeEach(async () => {
  await h.reset();
});
afterAll(async () => {
  await h.close();
});

async function insertUser(
  email: string,
  ageMs: number,
  extra: { verified?: boolean; deleted?: boolean } = {},
) {
  const createdAt = new Date(h.clock.now().getTime() - ageMs);
  await h.db.insert(users).values({
    email,
    passwordHash: 'x',
    birthDate: '1990-05-01',
    createdAt,
    emailVerifiedAt: extra.verified ? createdAt : null,
    deletedAt: extra.deleted ? createdAt : null,
  });
}

const emails = async () =>
  (await h.db.select({ email: users.email }).from(users)).map((u) => u.email).sort();

describe('CleanupUnverifiedProcessor', () => {
  it('удаляет неподтверждённые старше 7 дней пачками; подтверждённые, свежие и удалённые остаются', async () => {
    for (let i = 0; i < 5; i += 1) await insertUser(`old${i}@example.com`, 7 * DAY + 1);
    await insertUser('verified@example.com', 30 * DAY, { verified: true });
    await insertUser('fresh@example.com', 7 * DAY);
    await insertUser('deleted@example.com', 30 * DAY, { deleted: true });

    expect(await processor.run(2)).toBe(5);

    expect(await emails()).toEqual([
      'deleted@example.com',
      'fresh@example.com',
      'verified@example.com',
    ]);
    expect(await processor.run(2)).toBe(0);
  });

  it('задача по расписанию удаляет и связанные токены (каскад)', async () => {
    await register(h);
    h.clock.advance(7 * DAY + 1);

    expect(await processor.process({ name: 'cleanup-unverified' } as Job)).toBe(1);

    expect(await h.db.select().from(users)).toEqual([]);
    expect(await h.db.select().from(emailVerificationTokens)).toEqual([]);
    expect(await h.db.select().from(registrationTokens)).toEqual([]);
  });

  it('подтверждение во время очистки — аккаунт остаётся (DELETE перепроверяет условия)', async () => {
    await insertUser('racing@example.com', 7 * DAY + 1);
    const confirmTx = await h.pool.connect();
    try {
      // confirm держит блокировку строки и уже подтвердил, но ещё не закоммитил
      await confirmTx.query('BEGIN');
      await confirmTx.query("SELECT id FROM users WHERE email = 'racing@example.com' FOR UPDATE");
      await confirmTx.query(
        "UPDATE users SET email_verified_at = now() WHERE email = 'racing@example.com'",
      );
      const cleanup = processor.run();
      await waitForLockWaiter(h.pool); // очистка упёрлась в блокировку строки
      await confirmTx.query('COMMIT');

      expect(await cleanup).toBe(0);
      expect(await emails()).toEqual(['racing@example.com']);
    } finally {
      confirmTx.release();
    }
  });
});
