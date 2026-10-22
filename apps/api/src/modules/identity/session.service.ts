import { Inject, Injectable } from '@nestjs/common';
import type { Session } from '@on-bike/contracts';
import { CLOCK, type Clock, ENV } from '@rkarakulov/api-kit';
import { SignJWT } from 'jose';

import type { Env } from '../../config/env';
import type { DbExecutor } from '../../db';
import { IDENTITY_POLICY, JWT_AUDIENCE, JWT_ISSUER } from './identity.policy';
import { IdentityRepository } from './identity.repository';
import { randomToken, sha256 } from './tokens';

/** Выдача сессии: access JWT (HS256, sub + sid) и refresh (случайный, в БД — sha256). */
@Injectable()
export class SessionService {
  private readonly key: Uint8Array;

  constructor(
    private readonly repository: IdentityRepository,
    @Inject(ENV) env: Pick<Env, 'JWT_SECRET'>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {
    this.key = new TextEncoder().encode(env.JWT_SECRET);
  }

  async issue(tx: DbExecutor, userId: string): Promise<Session> {
    const now = this.clock.now();
    const sessionId = await this.repository.nextId(tx);
    const accessExpiresAt = new Date(now.getTime() + IDENTITY_POLICY.accessTokenTtlMs);
    const refreshExpiresAt = new Date(now.getTime() + IDENTITY_POLICY.refreshTokenTtlMs);
    const refreshToken = randomToken();

    await this.repository.insertSession(tx, {
      id: sessionId,
      userId,
      refreshTokenHash: sha256(refreshToken),
      createdAt: now,
      expiresAt: refreshExpiresAt,
    });

    const accessToken = await new SignJWT({ sid: sessionId })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuer(JWT_ISSUER)
      .setAudience(JWT_AUDIENCE)
      .setSubject(userId)
      .setIssuedAt(now)
      .setExpirationTime(accessExpiresAt)
      .sign(this.key);

    return {
      accessToken,
      accessTokenExpiresAt: accessExpiresAt.toISOString(),
      refreshToken,
      refreshTokenExpiresAt: refreshExpiresAt.toISOString(),
    };
  }
}
