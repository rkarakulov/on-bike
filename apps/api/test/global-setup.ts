import { resolve } from 'node:path';

import { recreateTestDatabase } from '@rkarakulov/test-kit';

import { DATABASE_URL_TEST } from './test-env';

/** Пересоздаёт тестовую базу (*_test) и прогоняет миграции — так же, как отдельный шаг деплоя. */
export default async function setup(): Promise<void> {
  await recreateTestDatabase({
    url: DATABASE_URL_TEST,
    migrationsFolder: resolve(__dirname, '../drizzle'),
  });
}
