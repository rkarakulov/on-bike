import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { schema, type Database } from '../src/db';
import { DATABASE_URL_TEST } from './test-env';

/** Чистое состояние перед тестом: все таблицы public (CASCADE), кроме таблиц расширений (PostGIS). */
export { truncateAll } from '@rkarakulov/test-kit';

export function createTestDb(): { pool: Pool; db: Database } {
  const pool = new Pool({ connectionString: DATABASE_URL_TEST, max: 10 });
  return { pool, db: drizzle(pool, { schema }) };
}
