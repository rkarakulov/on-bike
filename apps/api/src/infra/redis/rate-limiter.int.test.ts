import { Redis } from 'ioredis';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { REDIS_URL_TEST } from '../../../test/test-env';
import { RateLimiter } from './rate-limiter';

const redis = new Redis(REDIS_URL_TEST);
const limiter = new RateLimiter(redis);
const t0 = new Date('2026-10-22T09:00:00Z');
const after = (sec: number) => new Date(t0.getTime() + sec * 1000);

const resend = { cooldownSec: 60, limit: 10, windowSec: 24 * 3600 };

beforeEach(async () => {
  await redis.flushdb();
});
afterAll(async () => {
  await redis.quit();
});

describe('RateLimiter (Redis, Lua)', () => {
  it('пауза: повтор раньше срока — отказ с остатком в секундах', async () => {
    expect(await limiter.consume('k', resend, t0)).toEqual({ allowed: true });
    expect(await limiter.consume('k', resend, after(0))).toEqual({
      allowed: false,
      retryAfterSec: 60,
    });
    expect(await limiter.consume('k', resend, after(59.5))).toEqual({
      allowed: false,
      retryAfterSec: 1,
    });
    expect(await limiter.consume('k', resend, after(60))).toEqual({ allowed: true });
  });

  it('окно: не больше limit за окно, затем — до конца окна', async () => {
    for (let i = 0; i < 10; i += 1) {
      expect(await limiter.consume('k', resend, after(i * 60))).toEqual({ allowed: true });
    }
    expect(await limiter.consume('k', resend, after(10 * 60))).toEqual({
      allowed: false,
      retryAfterSec: 24 * 3600 - 600,
    });
    expect(await limiter.consume('k', resend, after(24 * 3600))).toEqual({ allowed: true });
  });

  it('ключи независимы; лимит без паузы', async () => {
    const perIp = { limit: 2, windowSec: 3600 };
    expect(await limiter.consume('ip:a', perIp, t0)).toEqual({ allowed: true });
    expect(await limiter.consume('ip:a', perIp, t0)).toEqual({ allowed: true });
    expect(await limiter.consume('ip:a', perIp, t0)).toEqual({
      allowed: false,
      retryAfterSec: 3600,
    });
    expect(await limiter.consume('ip:b', perIp, t0)).toEqual({ allowed: true });
  });

  it('параллельные вызовы не превышают лимит (атомарность)', async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () => limiter.consume('race', { limit: 5, windowSec: 60 }, t0)),
    );
    expect(results.filter((r) => r.allowed)).toHaveLength(5);
  });

  it('у ключа есть TTL — Redis не копит мусор', async () => {
    await limiter.consume('ttl', resend, new Date());
    const ttl = await redis.pttl('rl:ttl');
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(24 * 3600 * 1000 + 60_000);
  });
});
