import { resolve } from 'node:path';

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Client, Pool } from 'pg';

import { DATABASE_URL_TEST } from './test-env';

/** Пересоздаёт тестовую базу и прогоняет миграции — так же, как отдельный шаг деплоя. */
export default async function setup(): Promise<void> {
  const url = new URL(DATABASE_URL_TEST);
  const database = url.pathname.slice(1);
  if (!/^[a-z0-9_]+_test$/.test(database)) {
    throw new Error('DATABASE_URL_TEST должна указывать на базу *_test — её пересоздают');
  }
  const adminUrl = new URL(url);
  adminUrl.pathname = '/postgres';
  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  try {
    await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
    await admin.query(`CREATE DATABASE "${database}"`);
  } finally {
    await admin.end();
  }

  const pool = new Pool({ connectionString: DATABASE_URL_TEST, max: 1 });
  try {
    await migrate(drizzle(pool), { migrationsFolder: resolve(__dirname, '../drizzle') });
  } finally {
    await pool.end();
  }
}
