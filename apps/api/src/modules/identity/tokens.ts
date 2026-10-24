import { createHash, createHmac, randomBytes } from 'node:crypto';

/** 32 случайных байта в base64url (43 символа) — токен регистрации и refresh. */
export function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

/** В БД токены хранятся только так: утечка таблицы не даёт рабочих ссылок и сессий. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Ключ лимита по IP: HMAC с серверным секретом — IP не восстановить перебором (в отличие от голого sha256). */
export function rateLimitKeyForIp(secret: string, ip: string): string {
  return createHmac('sha256', secret).update(`rate-limit-ip:${ip}`).digest('base64url');
}

const hmacKey = (secret: string, value: string) =>
  createHmac('sha256', secret).update(value).digest('base64url');

/**
 * Ключи лимитов входа (R1б): IP, нормализованный e-mail и их пара — HMAC с серверным секретом, как у
 * `rateLimitKeyForIp`: в Redis нет ни адресов почты, ни IP. Разделитель пары не встречается в e-mail и IP.
 */
export function signInLimitKeys(secret: string, email: string, ip: string) {
  return {
    ip: `signin-ip:${rateLimitKeyForIp(secret, ip)}`,
    email: `signin-email:${hmacKey(secret, `signin-email:${email}`)}`,
    emailIp: `signin-email-ip:${hmacKey(secret, `signin-email-ip:${email}\n${ip}`)}`,
  };
}

/**
 * Токен ссылки подтверждения — HMAC от id строки (B1, ADR-0002): worker пересобирает ссылку по id
 * из outbox, поэтому сырой токен не лежит ни в outbox, ни в Redis, ни в логах; ретрай письма — та же ссылка.
 */

export function deriveVerificationToken(secret: string, verificationTokenId: string): string {
  return createHmac('sha256', secret)
    .update(`email-verify:${verificationTokenId}`)
    .digest('base64url');
}
