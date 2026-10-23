import { Inject, Injectable } from '@nestjs/common';
import {
  normalizeEmail,
  type RateLimitedDetails,
  type RegisterRequest,
  type RegisterResponse,
  type RegistrationPollResponse,
} from '@on-bike/contracts';

import { DomainError } from '../../common/domain-error';
import { ENV, type Env } from '../../config/env';
import { CLOCK, type Clock } from '../../infra/clock/clock.module';
import { isUniqueViolation } from '../../infra/database/errors';
import { RateLimiter } from '../../infra/redis/rate-limiter';
import { IDENTITY_POLICY } from './identity.policy';
import { IdentityRepository } from './identity.repository';
import { PasswordHasher } from './password-hasher';
import { SessionService } from './session.service';
import { randomToken, rateLimitKeyForIp, sha256 } from './tokens';
import { VerificationService } from './verification.service';

const emailTaken = () => new DomainError('EMAIL_TAKEN', 409);

/** Регистрация по e-mail и обмен токена регистрации на сессию после подтверждения (V-09, ADR-0002). */
@Injectable()
export class RegistrationService {
  constructor(
    private readonly repository: IdentityRepository,
    private readonly verification: VerificationService,
    private readonly sessions: SessionService,
    private readonly hasher: PasswordHasher,
    private readonly rateLimiter: RateLimiter,
    @Inject(ENV) private readonly env: Env,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async register(input: RegisterRequest, ip: string): Promise<RegisterResponse> {
    const now = this.clock.now();
    const email = normalizeEmail(input.email);
    // ключ — HMAC от IP (псевдонимизация, TTL окна 1 ч): сам адрес в Redis не храним
    const ipLimit = await this.rateLimiter.consume(
      `register-ip:${rateLimitKeyForIp(this.env.EMAIL_TOKEN_SECRET, ip)}`,
      IDENTITY_POLICY.registerPerIpLimit,
      now,
    );
    if (!ipLimit.allowed) {
      const details: RateLimitedDetails = { retryAfterSec: ipLimit.retryAfterSec };
      throw new DomainError('RATE_LIMITED', 429, details);
    }

    const passwordHash = await this.hasher.hash(input.password);
    const registrationToken = randomToken();
    try {
      return await this.repository.db.transaction(async (tx) => {
        const existing = await this.repository.findUserByEmail(tx, email);
        if (existing) {
          // D-07: адрес удалённого аккаунта — нейтральный отказ без причины
          throw existing.deletedAt ? new DomainError('EMAIL_UNAVAILABLE', 409) : emailTaken();
        }
        const userId = await this.repository.insertUser(tx, {
          email,
          passwordHash,
          birthDate: input.birthDate,
          createdAt: now,
        });
        const version = this.env.AGREEMENT_VERSION;
        await this.repository.insertConsents(
          tx,
          userId,
          [
            { kind: 'personal_data', version },
            { kind: 'agreement', version },
          ],
          now,
        );
        const expiresAt = await this.verification.issueLink(tx, userId, now);
        await this.repository.insertRegistrationToken(tx, {
          userId,
          tokenHash: sha256(registrationToken),
          createdAt: now,
          expiresAt,
        });
        // письмо при регистрации — первое из лимита повторов; Redis недоступен — откат и 500
        await this.verification.takeResendAllowance(userId, now);
        return {
          registrationToken,
          email,
          resendAvailableInSec: IDENTITY_POLICY.resendLimit.cooldownSec,
        };
      });
    } catch (error) {
      // параллельная регистрация того же адреса
      if (isUniqueViolation(error, 'users_email_unique')) throw emailTaken();
      throw error;
    }
  }

  /** `pending` до подтверждения; после — сессия ровно один раз, дальше токен не действует (401). */
  async poll(registrationToken: string): Promise<RegistrationPollResponse> {
    const tokenHash = sha256(registrationToken);
    const now = this.clock.now();
    const found = await this.repository.findRegistrationByHash(this.repository.db, tokenHash);
    if (!found || found.user.deletedAt || found.token.consumedAt || found.token.expiresAt <= now) {
      throw new DomainError('UNAUTHORIZED', 401);
    }
    if (!found.user.emailVerifiedAt) return { state: 'pending' };

    return this.repository.db.transaction(async (tx) => {
      await this.repository.lockUser(tx, found.user.id);
      const userId = await this.repository.consumeRegistrationToken(tx, tokenHash, now);
      if (!userId) throw new DomainError('UNAUTHORIZED', 401);
      const session = await this.sessions.issue(tx, userId);
      return { state: 'verified' as const, session };
    });
  }
}
