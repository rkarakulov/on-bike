import 'reflect-metadata';

import { API_VERSION } from '@on-bike/contracts';
import { createApiHarness, type ApiHarness } from '@rkarakulov/test-kit';

import { AppModule } from '../src/app.module';
import type { Env } from '../src/config/env';
import { schema } from '../src/db';
import { WorkerModule } from '../src/worker.module';
import { testEnv } from './test-env';

export { DAY, FakeMailer, HOUR, MINUTE, TestClock, waitForLockWaiter } from '@rkarakulov/test-kit';

/** Стенд API и worker проекта на реальных PostgreSQL (`*_test`) и Redis (БД 1). */
export type Harness = ApiHarness<Env, typeof schema>;

export function createHarness(envOverrides: Parameters<typeof testEnv>[0] = {}): Promise<Harness> {
  return createApiHarness({
    apiModule: AppModule,
    workerModule: WorkerModule,
    env: testEnv(envOverrides),
    httpPrefix: API_VERSION,
    schema,
  });
}
