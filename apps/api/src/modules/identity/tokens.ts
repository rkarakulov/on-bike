import { createHash, createHmac, randomBytes } from 'node:crypto';
import { isIPv4, isIPv6 } from 'node:net';

/** 32 случайных байта в base64url (43 символа) — токен регистрации и refresh. */
export function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

/** В БД токены хранятся только так: утечка таблицы не даёт рабочих ссылок и сессий. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Первые четыре группы IPv6 (сеть /64); `::` раскрывается, IPv4 в хвосте — две группы. */
function ipv6Prefix64(address: string): string {
  const [head = '', tail] = address.split('::');
  const groups = (part: string | undefined) =>
    part ? part.split(':').flatMap((group) => (group.includes('.') ? ['0', '0'] : [group])) : [];
  const left = groups(head);
  const right = groups(tail);
  const full =
    tail === undefined
      ? left
      : [...left, ...Array(8 - left.length - right.length).fill('0'), ...right];
  return `${full
    .slice(0, 4)
    .map((group) => parseInt(group, 16).toString(16))
    .join(':')}::/64`;
}

/**
 * Адрес для лимитов по IP: IPv4 — как есть; IPv6 — сеть /64 (провайдер выдаёт клиенту целую /64, суффикс тот меняет
 * свободно — иначе каждый запрос с нового адреса обходил бы лимит); IPv4, отображённый в IPv6, — как IPv4.
 */
export function rateLimitAddress(ip: string): string {
  const address = ip.split('%')[0] ?? ip;
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address)?.[1];
  if (mapped && isIPv4(mapped)) return mapped;
  return isIPv6(address) ? ipv6Prefix64(address.toLowerCase()) : ip;
}

/**
 * Ключ лимита по IP (все IP-лимиты on-bike): HMAC с серверным секретом — IP не восстановить перебором (в отличие от
 * голого sha256); IPv6 — по сети /64 (`rateLimitAddress`).
 */
export function rateLimitKeyForIp(secret: string, ip: string): string {
  return createHmac('sha256', secret)
    .update(`rate-limit-ip:${rateLimitAddress(ip)}`)
    .digest('base64url');
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
    emailIp: `signin-email-ip:${hmacKey(secret, `signin-email-ip:${email}\n${rateLimitAddress(ip)}`)}`,
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
