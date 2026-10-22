import { jwtVerify } from 'jose';
import { describe, expect, it } from 'vitest';

import { sha256 } from './tokens';
import { SessionService } from './session.service';

const secret = 'test-jwt-secret-test-jwt-secret-0000';
const now = new Date('2026-10-22T09:00:00Z');

describe('SessionService', () => {
  it('access JWT HS256 (iss, aud, sub, sid, exp 15 мин) и refresh на 30 дней, в БД — только хеш', async () => {
    const inserted: unknown[] = [];
    const repository = {
      nextId: () => Promise.resolve('0199f0d2-0000-7000-8000-00000000abcd'),
      insertSession: (_tx: unknown, row: unknown) => {
        inserted.push(row);
        return Promise.resolve();
      },
    };
    const service = new SessionService(repository as never, { JWT_SECRET: secret } as never, {
      now: () => now,
    });

    const session = await service.issue({} as never, 'user-1');

    expect(session.accessTokenExpiresAt).toBe('2026-10-22T09:15:00.000Z');
    expect(session.refreshTokenExpiresAt).toBe('2026-11-21T09:00:00.000Z');
    const { payload, protectedHeader } = await jwtVerify(
      session.accessToken,
      new TextEncoder().encode(secret),
      { issuer: 'on-bike', audience: 'on-bike-app', currentDate: now },
    );
    expect(protectedHeader.alg).toBe('HS256');
    expect(payload).toMatchObject({
      sub: 'user-1',
      sid: '0199f0d2-0000-7000-8000-00000000abcd',
      iat: now.getTime() / 1000,
      exp: now.getTime() / 1000 + 15 * 60,
    });
    expect(inserted).toEqual([
      {
        id: '0199f0d2-0000-7000-8000-00000000abcd',
        userId: 'user-1',
        refreshTokenHash: sha256(session.refreshToken),
        createdAt: now,
        expiresAt: new Date('2026-11-21T09:00:00.000Z'),
      },
    ]);
  });
});
