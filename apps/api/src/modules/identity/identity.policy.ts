/** Сроки и лимиты онбординга — значения прототипа (решение Q4, task 2026-10-22-onboarding-01-signup). */
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

export const IDENTITY_POLICY = {
  /** Ссылка подтверждения и токен регистрации (скользящий — продлевается при повторе). */
  verificationLinkTtlMs: DAY_MS,
  /** Повтор письма: пауза и не больше N за сутки. */
  resendLimit: { cooldownSec: 60, limit: 10, windowSec: DAY_MS / 1000 },
  /** Регистрации с одного IP [ASSUMPTION: CGNAT, поэтому не меньше]. */
  registerPerIpLimit: { limit: 20, windowSec: HOUR_MS / 1000 },
  accessTokenTtlMs: 15 * MINUTE_MS,
  /** Срок сессии от выдачи; ротация refresh его не продлевает (Q2 F5b: продление — слайс 2). */
  refreshTokenTtlMs: 30 * DAY_MS,
  /** Ротация refresh с одного IP: перезагрузки вкладок и повторы — с запасом, перебор — нет (R6 F5b). */
  refreshPerIpLimit: { limit: 60, windowSec: MINUTE_MS / 1000 },
  /** Неподтверждённые аккаунты удаляются через 7 дней (V-10). */
  unverifiedRetentionMs: 7 * DAY_MS,
  cleanupBatchSize: 1_000,
  /** Срок захвата отправки письма: больше худшего SMTP (таймауты 10+10+15 с), меньше суммы ретраев BullMQ. */
  emailSendLeaseMs: MINUTE_MS,
} as const;

export const JWT_ISSUER = 'on-bike';
export const JWT_AUDIENCE = 'on-bike-app';
