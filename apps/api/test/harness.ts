import 'reflect-metadata';

import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, type TestingModule } from '@nestjs/testing';
import { Redis } from 'ioredis';
import type { Pool } from 'pg';

import { AppModule } from '../src/app.module';
import { ENV, type Env } from '../src/config/env';
import { configureHttpApp, createFastifyAdapter } from '../src/http-app';
import { CLOCK, type Clock } from '../src/infra/clock/clock.module';
import type { Database } from '../src/infra/database/database.module';
import { MAILER, type MailMessage, type Mailer } from '../src/infra/mail/mailer';
import { WorkerModule } from '../src/worker.module';
import { createTestDb, truncateAll } from './db';
import { REDIS_URL_TEST, testEnv } from './test-env';

/** Время в тестах фиксировано; сдвигается только явно. */
export class TestClock implements Clock {
  constructor(private current = new Date('2026-10-22T09:00:00Z')) {}
  now(): Date {
    return new Date(this.current);
  }
  advance(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

export class FakeMailer implements Mailer {
  readonly sent: MailMessage[] = [];
  private failures = 0;

  /** Следующая отправка падает, как недоступный SMTP. */
  failNext(): void {
    this.failures += 1;
  }

  private gate: Promise<void> | null = null;

  /** Следующие отправки ждут, пока тест не вызовет возвращённую функцию (медленный SMTP). */
  hold(): () => void {
    let release: () => void = () => undefined;
    this.gate = new Promise((resolve) => (release = resolve));
    return () => {
      this.gate = null;
      release();
    };
  }

  async send(message: MailMessage): Promise<void> {
    if (this.gate) await this.gate;
    if (this.failures > 0) {
      this.failures -= 1;
      throw new Error('SMTP unavailable');
    }
    this.sent.push(message);
  }
}

/** Ждём, пока какой-то запрос к тестовой БД встанет в очередь на блокировку строки (без sleep). */
export async function waitForLockWaiter(pool: Pool, timeoutMs = 5_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const { rows } = await pool.query<{ waiting: number }>(
      "SELECT count(*)::int AS waiting FROM pg_stat_activity WHERE datname = current_database() AND wait_event_type = 'Lock'",
    );
    if ((rows[0]?.waiting ?? 0) > 0) return;
    if (Date.now() > deadline) throw new Error('no backend is waiting for a lock');
    await new Promise((resolve) => setImmediate(resolve));
  }
}

export interface Harness {
  env: Env;
  clock: TestClock;
  mailer: FakeMailer;
  /** HTTP API (Fastify) — запросы через `app.inject()`. */
  app: NestFastifyApplication;
  /** Граф worker без запуска (без init): процессоры и публикатор вызываются тестом напрямую. */
  worker: TestingModule;
  pool: Pool;
  db: Database;
  redis: Redis;
  /** Перед каждым тестом: пустые таблицы, пустой Redis db 1, время в исходной точке. */
  reset(): Promise<void>;
  close(): Promise<void>;
}

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

export async function createHarness(
  envOverrides: Parameters<typeof testEnv>[0] = {},
): Promise<Harness> {
  const env = testEnv(envOverrides);
  let clock = new TestClock();
  const mailer = new FakeMailer();
  // провайдеры получают прокси: reset() подменяет часы без пересборки приложения
  const clockProxy: Clock = { now: () => clock.now() };

  const appModule = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ENV)
    .useValue(env)
    .overrideProvider(CLOCK)
    .useValue(clockProxy)
    .compile();
  const app = appModule.createNestApplication<NestFastifyApplication>(createFastifyAdapter(env), {
    logger: false,
  });
  configureHttpApp(app);
  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  const worker = await Test.createTestingModule({ imports: [WorkerModule] })
    .overrideProvider(ENV)
    .useValue(env)
    .overrideProvider(CLOCK)
    .useValue(clockProxy)
    .overrideProvider(MAILER)
    .useValue(mailer)
    .compile();

  const { pool, db } = createTestDb();
  const redis = new Redis(REDIS_URL_TEST);

  const harness: Harness = {
    env,
    get clock() {
      return clock;
    },
    mailer,
    app,
    worker,
    pool,
    db,
    redis,
    async reset() {
      await truncateAll(pool);
      await redis.flushdb();
      clock = new TestClock();
      mailer.sent.length = 0;
    },
    async close() {
      await app.close();
      await worker.close();
      await redis.quit();
      await pool.end();
    },
  };
  return harness;
}
