import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import {
  normalizeEmail,
  type RateLimitedDetails,
  type RegisterResponse,
  type Session,
} from '@on-bike/contracts';
import { CLOCK, type Clock, ENV, RateLimiter } from '@rkarakulov/api-kit';

import type { Env } from '../../config/env';
import { domainError } from '../../error-messages';
import { IDENTITY_POLICY } from './identity.policy';
import { IdentityRepository } from './identity.repository';
import { PasswordHasher } from './password-hasher';
import { RegistrationService } from './registration.service';
import { SessionService } from './session.service';
import { signInLimitKeys } from './tokens';

export type SignInResult =
  { state: 'signedIn'; session: Session } | ({ state: 'verificationRequired' } & RegisterResponse);

const invalidCredentials = () => domainError('INVALID_CREDENTIALS', 401);

/**
 * Вход по e-mail и паролю (ADR-0005). Порядок: лимиты (до argon2) → проверка пароля (для неизвестного и
 * удалённого адреса — по пустышке, время ответа то же) → неподтверждённому — токен регистрации (AD-28, Q4),
 * подтверждённому — сессия через `SessionService.issue`.
 */
@Injectable()
export class SignInService implements OnModuleInit {
  constructor(
    private readonly repository: IdentityRepository,
    private readonly sessions: SessionService,
    private readonly registration: RegistrationService,
    private readonly hasher: PasswordHasher,
    private readonly rateLimiter: RateLimiter,
    @Inject(ENV) private readonly env: Pick<Env, 'EMAIL_TOKEN_SECRET'>,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /** Пустышка считается при старте: первый вход с неизвестным адресом не дольше остальных. */
  async onModuleInit(): Promise<void> {
    await this.hasher.dummyHash();
  }

  async signIn(input: { email: string; password: string }, ip: string): Promise<SignInResult> {
    const now = this.clock.now();
    const email = normalizeEmail(input.email);
    await this.takeAttempt(email, ip, now);

    const account = await this.repository.findCredentialsByEmail(this.repository.db, email);
    const known = account !== undefined && account.deletedAt === null;
    const passwordHash = known ? account.passwordHash : await this.hasher.dummyHash();
    const valid = await this.hasher.verify(passwordHash, input.password);
    if (!known || !valid) throw invalidCredentials();

    return this.repository.db.transaction(async (tx) => {
      // под блокировкой аккаунта: подтверждение, очистка и poll того же аккаунта идут по очереди
      const user = await this.repository.lockUser(tx, account.id);
      if (!user || user.deletedAt) throw invalidCredentials();
      if (!user.emailVerifiedAt) {
        const pending = await this.registration.reissueToken(tx, user.id, user.email, now);
        return { state: 'verificationRequired' as const, ...pending };
      }
      return { state: 'signedIn' as const, session: await this.sessions.issue(tx, user.id) };
    });
  }

  /**
   * Попытка входа списывается со всех трёх счётчиков (R1б, R2а: считаются все попытки). Отказ любого — 429 с
   * наибольшей паузой, одинаково для существующих и несуществующих адресов; пароль не проверяется.
   */
  private async takeAttempt(email: string, ip: string, now: Date): Promise<void> {
    const keys = signInLimitKeys(this.env.EMAIL_TOKEN_SECRET, email, ip);
    const limits = IDENTITY_POLICY.signInLimits;
    const results = await Promise.all([
      this.rateLimiter.consume(keys.ip, limits.ip, now),
      this.rateLimiter.consume(keys.emailIp, limits.emailIp, now),
      this.rateLimiter.consume(keys.email, limits.email, now),
    ]);
    const waits = results.flatMap((result) => (result.allowed ? [] : [result.retryAfterSec]));
    if (waits.length === 0) return;
    const details: RateLimitedDetails = { retryAfterSec: Math.max(...waits) };
    throw domainError('RATE_LIMITED', 429, details);
  }
}
