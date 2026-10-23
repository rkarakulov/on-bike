import { Inject, Injectable } from '@nestjs/common';
import type { RateLimitedDetails, Session } from '@on-bike/contracts';
import { CLOCK, type Clock, ENV, RateLimiter } from '@rkarakulov/api-kit';
import { SignJWT } from 'jose';

import type { Env } from '../../config/env';
import type { DbExecutor } from '../../db';
import { domainError } from '../../error-messages';
import { IDENTITY_POLICY, JWT_AUDIENCE, JWT_ISSUER } from './identity.policy';
import { IdentityRepository } from './identity.repository';
import { randomToken, rateLimitKeyForIp, sha256 } from './tokens';

/**
 * Жизненный цикл сессии: выдача, ротация refresh, отзыв. Access — JWT HS256 (sub + sid), refresh — случайный,
 * в БД — только sha256. Транспорт refresh (тело или cookie) — забота контроллера.
 */
@Injectable()
export class SessionService {
  private readonly key: Uint8Array;

  constructor(
    private readonly repository: IdentityRepository,
    @Inject(ENV) private readonly env: Pick<Env, 'JWT_SECRET' | 'EMAIL_TOKEN_SECRET'>,
    @Inject(CLOCK) private readonly clock: Clock,
    private readonly rateLimiter: RateLimiter,
  ) {
    this.key = new TextEncoder().encode(env.JWT_SECRET);
  }

  async issue(tx: DbExecutor, userId: string): Promise<Session> {
    const now = this.clock.now();
    const sessionId = await this.repository.nextId(tx);
    const expiresAt = new Date(now.getTime() + IDENTITY_POLICY.refreshTokenTtlMs);
    const refreshToken = randomToken();

    await this.repository.insertSession(tx, {
      id: sessionId,
      userId,
      refreshTokenHash: sha256(refreshToken),
      createdAt: now,
      expiresAt,
    });
    return this.compose({ id: sessionId, userId, expiresAt }, refreshToken, now);
  }

  /**
   * Новый refresh взамен предъявленного; срок сессии не продлевается. Отозванная, истёкшая, чужая, сессия
   * удалённого пользователя и проигравший гонку токен — один и тот же 401 (без оракула). Лимит — по IP.
   */
  async rotate(refreshToken: string, ip: string): Promise<Session> {
    const now = this.clock.now();
    const limit = await this.rateLimiter.consume(
      `refresh-ip:${rateLimitKeyForIp(this.env.EMAIL_TOKEN_SECRET, ip)}`,
      IDENTITY_POLICY.refreshPerIpLimit,
      now,
    );
    if (!limit.allowed) {
      const details: RateLimitedDetails = { retryAfterSec: limit.retryAfterSec };
      throw domainError('RATE_LIMITED', 429, details);
    }

    const nextToken = randomToken();
    const rotated = await this.repository.rotateSession(this.repository.db, {
      tokenHash: sha256(refreshToken),
      nextTokenHash: sha256(nextToken),
      now,
    });
    if (!rotated) throw domainError('UNAUTHORIZED', 401);
    return this.compose(rotated, nextToken, now);
  }

  /** Выход: отзыв сессии; неизвестный или уже отозванный токен — без ошибки (идемпотентно). */
  async revoke(refreshToken: string): Promise<void> {
    await this.repository.revokeSession(this.repository.db, sha256(refreshToken), this.clock.now());
  }

  private async compose(
    session: { id: string; userId: string; expiresAt: Date },
    refreshToken: string,
    now: Date,
  ): Promise<Session> {
    // access не переживает сессию: в конце срока — не дольше её остатка
    const accessExpiresAt = new Date(
      Math.min(now.getTime() + IDENTITY_POLICY.accessTokenTtlMs, session.expiresAt.getTime()),
    );
    const accessToken = await new SignJWT({ sid: session.id })
      .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
      .setIssuer(JWT_ISSUER)
      .setAudience(JWT_AUDIENCE)
      .setSubject(session.userId)
      .setIssuedAt(now)
      .setExpirationTime(accessExpiresAt)
      .sign(this.key);

    return {
      accessToken,
      accessTokenExpiresAt: accessExpiresAt.toISOString(),
      refreshToken,
      refreshTokenExpiresAt: session.expiresAt.toISOString(),
    };
  }
}
