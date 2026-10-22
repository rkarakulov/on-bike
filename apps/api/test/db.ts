import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import type { Database } from '../src/infra/database/database.module';
import * as schema from '../src/infra/database/schema';
import { DATABASE_URL_TEST } from './test-env';

export function createTestDb(): { pool: Pool; db: Database } {
  const pool = new Pool({ connectionString: DATABASE_URL_TEST, max: 10 });
  return { pool, db: drizzle(pool, { schema }) };
}

/** Чистое состояние перед каждым тестом: все данные, включая связанные таблицы (CASCADE). */
export async function truncateAll(pool: Pool): Promise<void> {
  await pool.query('TRUNCATE users, outbox CASCADE');
}
