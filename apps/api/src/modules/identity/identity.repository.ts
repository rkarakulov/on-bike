import { Inject, Injectable } from '@nestjs/common';
import { DB } from '@rkarakulov/api-kit';
import { and, eq, gt, isNotNull, isNull, lt, lte, or, sql } from 'drizzle-orm';

import type { Database, DbExecutor } from '../../db';
import {
  emailVerificationTokens,
  passwordResetTokens,
  registrationTokens,
  type SessionRevokedReason,
  sessions,
  userConsents,
  users,
} from './identity.schema';

export interface UserState {
  id: string;
  email: string;
  emailVerifiedAt: Date | null;
  deletedAt: Date | null;
}

export interface VerificationTokenState {
  id: string;
  userId: string;
  expiresAt: Date;
  usedAt: Date | null;
  supersededAt: Date | null;
  sentAt: Date | null;
}

/** Ссылка сброса пароля: колонки — как у ссылки подтверждения. */
export type PasswordResetTokenState = VerificationTokenState;

export interface RegistrationTokenState {
  userId: string;
  expiresAt: Date;
  consumedAt: Date | null;
}

const userState = {
  id: users.id,
  email: users.email,
  emailVerifiedAt: users.emailVerifiedAt,
  deletedAt: users.deletedAt,
};

const verificationState = {
  id: emailVerificationTokens.id,
  userId: emailVerificationTokens.userId,
  expiresAt: emailVerificationTokens.expiresAt,
  usedAt: emailVerificationTokens.usedAt,
  supersededAt: emailVerificationTokens.supersededAt,
  sentAt: emailVerificationTokens.sentAt,
};

const passwordResetState = {
  id: passwordResetTokens.id,
  userId: passwordResetTokens.userId,
  expiresAt: passwordResetTokens.expiresAt,
  usedAt: passwordResetTokens.usedAt,
  supersededAt: passwordResetTokens.supersededAt,
  sentAt: passwordResetTokens.sentAt,
};

/**
 * Таблицы ссылок из писем с одинаковыми колонками отправки: общий захват отправки (`claimLinkSend`). Подтверждение
 * не нужно уже подтверждённому аккаунту; сброс пароля нужен и неподтверждённому (Q4 слайса 3).
 */
const LINK_TABLES = {
  verification: { table: emailVerificationTokens, accountCondition: isNull(users.emailVerifiedAt) },
  passwordReset: { table: passwordResetTokens, accountCondition: undefined },
} as const;
export type LinkKind = keyof typeof LINK_TABLES;

/** Доступ к таблицам identity. Методы принимают пул или транзакцию — транзакцию собирает сервис. */
@Injectable()
export class IdentityRepository {
  constructor(@Inject(DB) readonly db: Database) {}

  /** UUID v7 из PostgreSQL до вставки: от id строки выводится токен ссылки (HMAC) и sid сессии. */
  async nextId(ex: DbExecutor): Promise<string> {
    const result = await ex.execute<{ id: string }>(sql`SELECT uuidv7() AS id`);
    const row = result.rows[0];
    if (!row) throw new Error('uuidv7() returned no row');
    return row.id;
  }

  async findUserByEmail(ex: DbExecutor, email: string): Promise<UserState | undefined> {
    const [row] = await ex.select(userState).from(users).where(eq(users.email, email));
    return row;
  }

  /** Хеш пароля и состояние аккаунта для входа; только для сравнения на сервере, наружу не уходит. */
  async findCredentialsByEmail(
    ex: DbExecutor,
    email: string,
  ): Promise<(UserState & { passwordHash: string }) | undefined> {
    const [row] = await ex
      .select({ ...userState, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, email));
    return row;
  }

  /** Сериализует мутации одного аккаунта (confirm / resend / poll) — первый шаг каждой транзакции. */
  async lockUser(ex: DbExecutor, userId: string): Promise<UserState | undefined> {
    const [row] = await ex.select(userState).from(users).where(eq(users.id, userId)).for('update');
    return row;
  }

  /**
   * `lockUser` с хешем пароля — для входа (R4 слайса 3): под блокировкой аккаунта вход сверяет, что пароль не сменили
   * с момента проверки (сброс, закоммиченный между проверкой и блокировкой, сессию не выдаёт).
   */
  async lockUserCredentials(
    ex: DbExecutor,
    userId: string,
  ): Promise<(UserState & { passwordHash: string }) | undefined> {
    const [row] = await ex
      .select({ ...userState, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, userId))
      .for('update');
    return row;
  }

  async updatePasswordHash(ex: DbExecutor, userId: string, passwordHash: string): Promise<void> {
    await ex.update(users).set({ passwordHash }).where(eq(users.id, userId));
  }

  async insertUser(
    ex: DbExecutor,
    user: { email: string; passwordHash: string; birthDate: string; createdAt: Date },
  ): Promise<string> {
    const [row] = await ex.insert(users).values(user).returning({ id: users.id });
    if (!row) throw new Error('users insert returned no row');
    return row.id;
  }

  async insertConsents(
    ex: DbExecutor,
    userId: string,
    consents: { kind: 'personal_data' | 'agreement'; version: string }[],
    acceptedAt: Date,
  ): Promise<void> {
    await ex
      .insert(userConsents)
      .values(consents.map((consent) => ({ ...consent, userId, acceptedAt })));
  }

  async markEmailVerified(ex: DbExecutor, userId: string, at: Date): Promise<void> {
    await ex.update(users).set({ emailVerifiedAt: at }).where(eq(users.id, userId));
  }

  // --- ссылки подтверждения ---

  async insertVerificationToken(
    ex: DbExecutor,
    token: { id: string; userId: string; tokenHash: string; createdAt: Date; expiresAt: Date },
  ): Promise<void> {
    await ex.insert(emailVerificationTokens).values(token);
  }

  /** Новая ссылка отменяет прежние: активной остаётся одна (частичный UNIQUE). */
  async supersedeActiveVerificationTokens(ex: DbExecutor, userId: string, at: Date): Promise<void> {
    await ex
      .update(emailVerificationTokens)
      .set({ supersededAt: at })
      .where(
        and(
          eq(emailVerificationTokens.userId, userId),
          isNull(emailVerificationTokens.usedAt),
          isNull(emailVerificationTokens.supersededAt),
        ),
      );
  }

  async findVerificationByHash(
    ex: DbExecutor,
    tokenHash: string,
  ): Promise<{ token: VerificationTokenState; user: UserState } | undefined> {
    const [row] = await ex
      .select({ token: verificationState, user: userState })
      .from(emailVerificationTokens)
      .innerJoin(users, eq(users.id, emailVerificationTokens.userId))
      .where(eq(emailVerificationTokens.tokenHash, tokenHash));
    return row;
  }

  /**
   * Захват отправки письма со ссылкой (`kind` — таблица ссылок) с ограниченным сроком (`send_claimed_at`), отдельно
   * от факта отправки (`sent_at`). Одна реализация для ссылок подтверждения и сброса пароля:
   * - `claimed` — ссылка актуальна, письмо не отправлено, чужого живого захвата нет → отправляем;
   * - `busy` — другой worker держит живой захват → задача уходит на ретрай (если он упал, захват истечёт);
   * - `undefined` — письмо не нужно: уже отправлено, ссылка заменена/использована/истекла, аккаунт удалён
   *   (подтверждение — ещё и уже подтверждён).
   * Блокирует только строку ссылки и только на один UPDATE — SMTP идёт после коммита.
   */
  async claimLinkSend(
    ex: DbExecutor,
    kind: LinkKind,
    id: string,
    now: Date,
    leaseMs: number,
  ): Promise<{ status: 'claimed'; id: string; email: string } | { status: 'busy' } | undefined> {
    const { table, accountCondition } = LINK_TABLES[kind];
    const leaseExpired = new Date(now.getTime() - leaseMs);
    const sendable = and(
      eq(table.id, id),
      eq(users.id, table.userId),
      isNull(table.sentAt),
      isNull(table.usedAt),
      isNull(table.supersededAt),
      gt(table.expiresAt, now),
      isNull(users.deletedAt),
      accountCondition,
    );
    const [claimed] = await ex
      .update(table)
      .set({ sendClaimedAt: now })
      .from(users)
      .where(and(sendable, or(isNull(table.sendClaimedAt), lte(table.sendClaimedAt, leaseExpired))))
      .returning({ id: table.id, email: users.email });
    if (claimed) return { status: 'claimed', ...claimed };

    const [held] = await ex
      .select({ id: table.id })
      .from(table)
      .innerJoin(users, eq(users.id, table.userId))
      .where(sendable);
    return held ? { status: 'busy' } : undefined;
  }

  /** SMTP принял письмо: фиксируем отправку и снимаем свой захват. */
  async completeLinkSend(
    ex: DbExecutor,
    kind: LinkKind,
    id: string,
    claimedAt: Date,
    sentAt: Date,
  ) {
    const { table } = LINK_TABLES[kind];
    await ex
      .update(table)
      .set({ sentAt, sendClaimedAt: null })
      .where(and(eq(table.id, id), eq(table.sendClaimedAt, claimedAt)));
  }

  /** Сбой SMTP: снимаем свой захват — ретрай задачи отправит письмо заново (та же ссылка). */
  async releaseLinkSend(ex: DbExecutor, kind: LinkKind, id: string, claimedAt: Date) {
    const { table } = LINK_TABLES[kind];
    await ex
      .update(table)
      .set({ sendClaimedAt: null })
      .where(and(eq(table.id, id), eq(table.sendClaimedAt, claimedAt)));
  }

  async markVerificationUsed(ex: DbExecutor, id: string, at: Date): Promise<void> {
    await ex
      .update(emailVerificationTokens)
      .set({ usedAt: at })
      .where(eq(emailVerificationTokens.id, id));
  }

  // --- ссылки сброса пароля ---

  async insertPasswordResetToken(
    ex: DbExecutor,
    token: { id: string; userId: string; tokenHash: string; createdAt: Date; expiresAt: Date },
  ): Promise<void> {
    await ex.insert(passwordResetTokens).values(token);
  }

  /** Новая ссылка отменяет прежние (Q6): активной остаётся одна (частичный UNIQUE); использованные не трогаем. */
  async supersedeActivePasswordResetTokens(ex: DbExecutor, userId: string, at: Date) {
    await ex
      .update(passwordResetTokens)
      .set({ supersededAt: at })
      .where(
        and(
          eq(passwordResetTokens.userId, userId),
          isNull(passwordResetTokens.usedAt),
          isNull(passwordResetTokens.supersededAt),
        ),
      );
  }

  async findPasswordResetByHash(
    ex: DbExecutor,
    tokenHash: string,
  ): Promise<{ token: PasswordResetTokenState; user: UserState } | undefined> {
    const [row] = await ex
      .select({ token: passwordResetState, user: userState })
      .from(passwordResetTokens)
      .innerJoin(users, eq(users.id, passwordResetTokens.userId))
      .where(eq(passwordResetTokens.tokenHash, tokenHash));
    return row;
  }

  /** Использованная ссылка и её владелец — для письма «Пароль изменён» (время смены — `used_at`). */
  async findPasswordResetById(
    ex: DbExecutor,
    id: string,
  ): Promise<{ token: PasswordResetTokenState; user: UserState } | undefined> {
    const [row] = await ex
      .select({ token: passwordResetState, user: userState })
      .from(passwordResetTokens)
      .innerJoin(users, eq(users.id, passwordResetTokens.userId))
      .where(eq(passwordResetTokens.id, id));
    return row;
  }

  async markPasswordResetUsed(ex: DbExecutor, id: string, at: Date): Promise<void> {
    await ex.update(passwordResetTokens).set({ usedAt: at }).where(eq(passwordResetTokens.id, id));
  }

  // --- токен регистрации ---

  async insertRegistrationToken(
    ex: DbExecutor,
    token: { userId: string; tokenHash: string; createdAt: Date; expiresAt: Date },
  ): Promise<void> {
    await ex.insert(registrationTokens).values(token);
  }

  async findRegistrationByHash(
    ex: DbExecutor,
    tokenHash: string,
  ): Promise<{ token: RegistrationTokenState; user: UserState } | undefined> {
    const [row] = await ex
      .select({
        token: {
          userId: registrationTokens.userId,
          expiresAt: registrationTokens.expiresAt,
          consumedAt: registrationTokens.consumedAt,
        },
        user: userState,
      })
      .from(registrationTokens)
      .innerJoin(users, eq(users.id, registrationTokens.userId))
      .where(eq(registrationTokens.tokenHash, tokenHash));
    return row;
  }

  /** Скользящий TTL: живой и не обменянный токен регистрации продлевается до срока новой ссылки. */
  async extendRegistrationToken(
    ex: DbExecutor,
    userId: string,
    expiresAt: Date,
    now: Date,
  ): Promise<void> {
    await ex
      .update(registrationTokens)
      .set({ expiresAt })
      .where(
        and(
          eq(registrationTokens.userId, userId),
          isNull(registrationTokens.consumedAt),
          gt(registrationTokens.expiresAt, now),
        ),
      );
  }

  /**
   * Одноразовый обмен на сессию: условный UPDATE — из параллельных poll проходит ровно один.
   * Возвращает userId, если обмен состоялся.
   */
  async consumeRegistrationToken(
    ex: DbExecutor,
    tokenHash: string,
    now: Date,
  ): Promise<string | undefined> {
    const [row] = await ex
      .update(registrationTokens)
      .set({ consumedAt: now })
      .where(
        and(
          eq(registrationTokens.tokenHash, tokenHash),
          isNull(registrationTokens.consumedAt),
          gt(registrationTokens.expiresAt, now),
          sql`EXISTS (SELECT 1 FROM ${users} WHERE ${users.id} = ${registrationTokens.userId} AND ${isNotNull(users.emailVerifiedAt)})`,
        ),
      )
      .returning({ userId: registrationTokens.userId });
    return row?.userId;
  }

  // --- сессии ---

  async insertSession(
    ex: DbExecutor,
    session: {
      id: string;
      userId: string;
      refreshTokenHash: string;
      createdAt: Date;
      expiresAt: Date;
    },
  ): Promise<void> {
    await ex.insert(sessions).values(session);
  }

  /**
   * Ротация refresh одним условным UPDATE (ADR-0005). Живая (не отозвана, не истекла) сессия не удалённого
   * пользователя принимает текущий refresh или предыдущий в окне повтора (`rotated_at` позже `now − grace`).
   * Предыдущим становится текущий хеш строки до UPDATE: при повторе в окне брошенный текущий токен тоже станет
   * «предыдущим» и вне окна сработает как reuse. Срок скользящий: `now + ttl`, но не дальше `created_at + absolute`.
   * Параллельные ротации одного токена: после ожидания блокировки строки PostgreSQL перепроверяет условие на новой
   * версии — проходят ровно две (текущим и затем предыдущим в окне), остальные — 0 строк.
   */
  async rotateSession(
    ex: DbExecutor,
    rotation: {
      tokenHash: string;
      nextTokenHash: string;
      now: Date;
      graceMs: number;
      ttlMs: number;
      absoluteTtlMs: number;
    },
  ): Promise<{ id: string; userId: string; expiresAt: Date } | undefined> {
    const { tokenHash, now } = rotation;
    const graceStart = new Date(now.getTime() - rotation.graceMs);
    const slidingExpiry = new Date(now.getTime() + rotation.ttlMs);
    const absoluteMs = `${rotation.absoluteTtlMs} milliseconds`;
    const [row] = await ex
      .update(sessions)
      .set({
        // в SET столбец справа — значение строки до UPDATE
        previousRefreshTokenHash: sql`${sessions.refreshTokenHash}`,
        refreshTokenHash: rotation.nextTokenHash,
        rotatedAt: now,
        expiresAt: sql`LEAST(${slidingExpiry}::timestamptz, ${sessions.createdAt} + ${absoluteMs}::interval)`,
      })
      .where(
        and(
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, now),
          sql`EXISTS (SELECT 1 FROM ${users} WHERE ${users.id} = ${sessions.userId} AND ${isNull(users.deletedAt)})`,
          or(
            eq(sessions.refreshTokenHash, tokenHash),
            and(
              eq(sessions.previousRefreshTokenHash, tokenHash),
              gt(sessions.rotatedAt, graceStart),
            ),
          ),
        ),
      )
      .returning({ id: sessions.id, userId: sessions.userId, expiresAt: sessions.expiresAt });
    return row;
  }

  /**
   * Reuse detection: предъявлен предыдущий refresh позже окна повтора — токен, вероятно, украден; живая сессия
   * отзывается целиком (Q8: одна сессия). Возвращает id отозванной сессии (для лога), иначе `undefined`.
   */
  async markReuseDetected(
    ex: DbExecutor,
    tokenHash: string,
    now: Date,
    graceMs: number,
  ): Promise<string | undefined> {
    const [row] = await ex
      .update(sessions)
      .set({ revokedAt: now, revokedReason: 'reuse_detected' })
      .where(
        and(
          eq(sessions.previousRefreshTokenHash, tokenHash),
          lte(sessions.rotatedAt, new Date(now.getTime() - graceMs)),
          isNull(sessions.revokedAt),
        ),
      )
      .returning({ id: sessions.id });
    return row?.id;
  }

  /**
   * Отзыв сессии по хешу текущего или предыдущего refresh (гонка выхода с ротацией не оставляет живую сессию);
   * уже отозванная не меняется (идемпотентно).
   */
  async revokeSession(
    ex: DbExecutor,
    tokenHash: string,
    at: Date,
    reason: SessionRevokedReason,
  ): Promise<void> {
    await ex
      .update(sessions)
      .set({ revokedAt: at, revokedReason: reason })
      .where(
        and(
          or(
            eq(sessions.refreshTokenHash, tokenHash),
            eq(sessions.previousRefreshTokenHash, tokenHash),
          ),
          isNull(sessions.revokedAt),
        ),
      );
  }

  /**
   * Отзыв всех живых сессий пользователя (смена пароля — `password_reset`) одним UPDATE по `sessions_user_id_idx`.
   * Уже отозванные не меняются. Гонка с ротацией: строка, которую ротация держит, после ожидания перепроверяется на
   * новой версии — ротированная сессия тоже отзывается. Возвращает число отозванных.
   */
  async revokeAllSessions(
    ex: DbExecutor,
    userId: string,
    at: Date,
    reason: SessionRevokedReason,
  ): Promise<number> {
    const rows = await ex
      .update(sessions)
      .set({ revokedAt: at, revokedReason: reason })
      .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)))
      .returning({ id: sessions.id });
    return rows.length;
  }

  /**
   * Новый токен регистрации взамен прежнего (вход неподтверждённого, Q4): прежний перестаёт действовать, срок —
   * заново. Строка у пользователя одна (UNIQUE user_id).
   */
  async replaceRegistrationToken(
    ex: DbExecutor,
    token: { userId: string; tokenHash: string; createdAt: Date; expiresAt: Date },
  ): Promise<void> {
    await ex
      .insert(registrationTokens)
      .values(token)
      .onConflictDoUpdate({
        target: registrationTokens.userId,
        set: {
          tokenHash: token.tokenHash,
          createdAt: token.createdAt,
          expiresAt: token.expiresAt,
          consumedAt: null,
        },
      });
  }

  /**
   * Необратимо гасит токен регистрации (смена пароля, R5 слайса 3): `consumed_at` — тот же признак, что проверяет
   * обмен на сессию, поэтому не проходит и poll, начатый раньше сброса и запомнивший более раннее «сейчас» (срок
   * сравнивается с его временем, признак — нет). Уже обменянный токен не меняется.
   */
  async revokeRegistrationToken(ex: DbExecutor, userId: string, now: Date): Promise<void> {
    await ex
      .update(registrationTokens)
      .set({ consumedAt: now })
      .where(and(eq(registrationTokens.userId, userId), isNull(registrationTokens.consumedAt)));
  }

  // --- очистка (V-10) ---

  /**
   * Удаляет пачку неподтверждённых аккаунтов, созданных раньше `createdBefore`; связанные строки — каскадом.
   * Условия повторены во внешнем DELETE: если строку держит confirm, PostgreSQL после ожидания блокировки
   * перепроверит их на новой версии строки — только что подтверждённый аккаунт не удалится.
   */
  async deleteUnverifiedBatch(ex: DbExecutor, createdBefore: Date, limit: number): Promise<number> {
    const unverifiedAndStale = and(
      isNull(users.emailVerifiedAt),
      isNull(users.deletedAt),
      lt(users.createdAt, createdBefore),
    );
    const batch = ex.select({ id: users.id }).from(users).where(unverifiedAndStale).limit(limit);
    const deleted = await ex
      .delete(users)
      .where(and(sql`${users.id} IN ${batch}`, unverifiedAndStale))
      .returning({ id: users.id });
    return deleted.length;
  }
}
