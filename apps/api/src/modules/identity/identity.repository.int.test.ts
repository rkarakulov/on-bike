import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { createTestDb, truncateAll } from '../../../test/db';
import { IdentityRepository } from './identity.repository';
import { sha256 } from './tokens';

const { pool, db } = createTestDb();
const repository = new IdentityRepository(db);
const now = new Date('2026-10-22T09:00:00Z');
const later = new Date(now.getTime() + 3600_000);

async function userWithRegistrationToken(verified: boolean) {
  const userId = await repository.insertUser(db, {
    email: 'rider@example.com',
    passwordHash: 'x',
    birthDate: '1990-05-01',
    createdAt: now,
  });
  if (verified) await repository.markEmailVerified(db, userId, now);
  await repository.insertRegistrationToken(db, {
    userId,
    tokenHash: sha256('reg'),
    createdAt: now,
    expiresAt: later,
  });
  return userId;
}

beforeEach(async () => {
  await truncateAll(pool);
});
afterAll(async () => {
  await pool.end();
});

describe('IdentityRepository.consumeRegistrationToken', () => {
  it('обменивает ровно один раз', async () => {
    const userId = await userWithRegistrationToken(true);
    expect(await repository.consumeRegistrationToken(db, sha256('reg'), now)).toBe(userId);
    expect(await repository.consumeRegistrationToken(db, sha256('reg'), now)).toBeUndefined();
  });

  it('не обменивает до подтверждения e-mail и после истечения', async () => {
    await userWithRegistrationToken(false);
    expect(await repository.consumeRegistrationToken(db, sha256('reg'), now)).toBeUndefined();
    await pool.query('UPDATE users SET email_verified_at = $1', [now]);
    expect(await repository.consumeRegistrationToken(db, sha256('reg'), later)).toBeUndefined();
  });
});

describe('ограничения схемы', () => {
  it('e-mail хранится только в нижнем регистре (CHECK)', async () => {
    await expect(
      repository.insertUser(db, {
        email: 'Rider@example.com',
        passwordHash: 'x',
        birthDate: '1990-05-01',
        createdAt: now,
      }),
    ).rejects.toThrow();
  });

  it('у пользователя одна активная ссылка (частичный UNIQUE)', async () => {
    const userId = await userWithRegistrationToken(false);
    const link = async (hash: string) =>
      repository.insertVerificationToken(db, {
        id: await repository.nextId(db),
        userId,
        tokenHash: sha256(hash),
        createdAt: now,
        expiresAt: later,
      });
    await link('a');
    await expect(link('b')).rejects.toThrow();
    await repository.supersedeActiveVerificationTokens(db, userId, now);
    await expect(link('b')).resolves.toBeUndefined();
  });
});
