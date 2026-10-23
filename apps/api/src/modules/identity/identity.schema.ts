import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

const id = () =>
  uuid('id')
    .primaryKey()
    .default(sql`uuidv7()`);
const at = (name: string) => timestamp(name, { withTimezone: true });

/**
 * Аккаунт райдера. E-mail хранится нормализованным (lower) — уникальность без citext.
 * UNIQUE полный, включая удалённые аккаунты: адрес удалённого аккаунта не регистрируется заново (D-07).
 */
export const users = pgTable(
  'users',
  {
    id: id(),
    email: text('email').notNull().unique('users_email_unique'),
    passwordHash: text('password_hash').notNull(),
    birthDate: date('birth_date', { mode: 'string' }).notNull(),
    emailVerifiedAt: at('email_verified_at'),
    createdAt: at('created_at').notNull().defaultNow(),
    deletedAt: at('deleted_at'),
  },
  (t) => [
    check('users_email_lowercase', sql`email = lower(email)`),
    // очистка неподтверждённых старше 7 дней (V-10)
    index('users_unverified_created_at_idx')
      .on(t.createdAt)
      .where(sql`email_verified_at IS NULL AND deleted_at IS NULL`),
  ],
);

/** Согласия — append-only журнал (что, какой версии, когда принято); не колонки users. */
export const userConsents = pgTable(
  'user_consents',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    kind: text('kind', { enum: ['personal_data', 'agreement'] }).notNull(),
    version: text('version').notNull(),
    acceptedAt: at('accepted_at').notNull(),
  },
  (t) => [
    index('user_consents_user_id_idx').on(t.userId),
    check('user_consents_kind_check', sql`kind IN ('personal_data', 'agreement')`),
  ],
);

/**
 * Ссылки подтверждения e-mail. Токен ссылки = HMAC(EMAIL_TOKEN_SECRET, id) — в БД только sha256 от него.
 * Активная ссылка у пользователя одна: новая заменяет прежние (superseded_at).
 */
export const emailVerificationTokens = pgTable(
  'email_verification_tokens',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique('email_verification_tokens_token_hash_unique'),
    createdAt: at('created_at').notNull().defaultNow(),
    expiresAt: at('expires_at').notNull(),
    usedAt: at('used_at'),
    supersededAt: at('superseded_at'),
    sentAt: at('sent_at'),
    /** захват отправки письма с ограниченным сроком: упавший worker не блокирует ретрай навсегда */
    sendClaimedAt: at('send_claimed_at'),
  },
  (t) => [
    index('email_verification_tokens_user_id_idx').on(t.userId),
    uniqueIndex('email_verification_tokens_active_unique')
      .on(t.userId)
      .where(sql`used_at IS NULL AND superseded_at IS NULL`),
  ],
);

/** Токен регистрации (ADR-0002): только poll и resend, на сессию меняется один раз. */
export const registrationTokens = pgTable('registration_tokens', {
  id: id(),
  userId: uuid('user_id')
    .notNull()
    .unique('registration_tokens_user_id_unique')
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique('registration_tokens_token_hash_unique'),
  createdAt: at('created_at').notNull().defaultNow(),
  expiresAt: at('expires_at').notNull(),
  consumedAt: at('consumed_at'),
});

/** Сессии: refresh-токен хранится только хешем. id сессии — claim `sid` в access JWT. */
export const sessions = pgTable(
  'sessions',
  {
    id: id(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    refreshTokenHash: text('refresh_token_hash')
      .notNull()
      .unique('sessions_refresh_token_hash_unique'),
    createdAt: at('created_at').notNull().defaultNow(),
    expiresAt: at('expires_at').notNull(),
    revokedAt: at('revoked_at'),
  },
  (t) => [index('sessions_user_id_idx').on(t.userId)],
);
