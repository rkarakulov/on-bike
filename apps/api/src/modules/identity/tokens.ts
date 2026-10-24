import { createHash, createHmac, randomBytes } from 'node:crypto';
import { isIPv6 } from 'node:net';

/** 32 случайных байта в base64url (43 символа) — токен регистрации и refresh. */
export function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

/** В БД токены хранятся только так: утечка таблицы не даёт рабочих ссылок и сессий. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Восемь 16-битных групп IPv6: `::` раскрывается, IPv4 в хвосте — две группы. Адрес уже проверен `isIPv6`. */
function ipv6Groups(address: string): number[] {
  const parse = (part: string | undefined) =>
    part
      ? part.split(':').flatMap((group) => {
          if (!group.includes('.')) return [parseInt(group, 16)];
          const [a = 0, b = 0, c = 0, d = 0] = group.split('.').map(Number);
          return [(a << 8) | b, (c << 8) | d];
        })
      : [];
  const [head, tail] = address.split('::');
  const left = parse(head);
  if (tail === undefined) return left;
  const right = parse(tail);
  return [...left, ...Array<number>(8 - left.length - right.length).fill(0), ...right];
}

/**
 * Адрес для лимитов по IP: IPv4 — как есть; IPv6 — сеть /64 (провайдер выдаёт клиенту целую /64, суффикс тот меняет
 * свободно — иначе каждый запрос с нового адреса обходил бы лимит); IPv4, отображённый в IPv6 (`::ffff:0:0/96` в любой
 * записи), — как IPv4.
 */
export function rateLimitAddress(ip: string): string {
  const address = ip.split('%')[0] ?? ip;
  if (!isIPv6(address)) return ip;
  const groups = ipv6Groups(address);
  const mapped = groups.slice(0, 6).every((group, index) => group === (index === 5 ? 0xffff : 0));
  if (mapped) {
    const [high = 0, low = 0] = groups.slice(6);
    return [high >> 8, high & 0xff, low >> 8, low & 0xff].join('.');
  }
  return `${groups
    .slice(0, 4)
    .map((group) => group.toString(16))
    .join(':')}::/64`;
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
