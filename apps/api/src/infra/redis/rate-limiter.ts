import type { Redis } from 'ioredis';

export interface RateLimitRule {
  /** Минимальная пауза между успешными вызовами. */
  cooldownSec?: number;
  /** Не больше `limit` успешных вызовов за фиксированное окно `windowSec` от первого вызова. */
  limit: number;
  windowSec: number;
}

export type RateLimitResult = { allowed: true } | { allowed: false; retryAfterSec: number };

/**
 * Пауза и окно проверяются и списываются одним Lua-скриптом — параллельные запросы не проскакивают.
 * «Сейчас» передаётся параметром (CLOCK приложения), TTL ключа — только для уборки.
 */
const CONSUME = `
local now = tonumber(ARGV[1])
local cooldown = tonumber(ARGV[2])
local window = tonumber(ARGV[3])
local limit = tonumber(ARGV[4])
local state = redis.call('HMGET', KEYS[1], 'cd', 'ws', 'n')
local cd = tonumber(state[1] or '0')
local ws = tonumber(state[2] or '0')
local n = tonumber(state[3] or '0')
if now < cd then return {0, cd - now} end
if now >= ws + window then ws = now; n = 0 end
if n >= limit then return {0, ws + window - now} end
n = n + 1
redis.call('HSET', KEYS[1], 'cd', now + cooldown, 'ws', ws, 'n', n)
redis.call('PEXPIRE', KEYS[1], math.max(ws + window, now + cooldown) - now)
return {1, 0}
`;

export class RateLimiter {
  constructor(private readonly redis: Redis) {}

  async consume(key: string, rule: RateLimitRule, now: Date): Promise<RateLimitResult> {
    const result = (await this.redis.eval(
      CONSUME,
      1,
      `rl:${key}`,
      now.getTime(),
      (rule.cooldownSec ?? 0) * 1000,
      rule.windowSec * 1000,
      rule.limit,
    )) as [number, number];
    const [allowed, retryAfterMs] = result;
    return allowed === 1
      ? { allowed: true }
      : { allowed: false, retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }
}
