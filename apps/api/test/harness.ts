import 'reflect-metadata';

import { API_VERSION } from '@pokatim/contracts';
import { createApiHarness, type ApiHarness } from '@rkarakulov/test-kit';

import { AppModule } from '../src/app.module';
import type { Env } from '../src/config/env';
import { schema } from '../src/db';
import { configureHttp } from '../src/http-app';
import { WorkerModule } from '../src/worker.module';
import { testEnv } from './test-env';

export { DAY, FakeMailer, HOUR, MINUTE, TestClock, waitForLockWaiter } from '@rkarakulov/test-kit';

/** Стенд API и worker проекта на реальных PostgreSQL (`*_test`) и Redis (БД 1). */
export type Harness = ApiHarness<Env, typeof schema>;

export function createHarness(envOverrides: Parameters<typeof testEnv>[0] = {}): Promise<Harness> {
  const env = testEnv(envOverrides);
  return createApiHarness({
    apiModule: AppModule,
    workerModule: WorkerModule,
    env,
    httpPrefix: API_VERSION,
    // HTTP-настройка как в main.ts (CORS и своё проекта): int-тесты видят те же заголовки и отказы
    configureApp: (app) => configureHttp(app, env),
    schema,
  });
}
