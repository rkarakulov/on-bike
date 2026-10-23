import type { NodePgQueryResultHKT } from 'drizzle-orm/node-postgres';
import type { PgDatabase } from 'drizzle-orm/pg-core';

import type * as schema from './schema';

/** Пул или транзакция: репозитории принимают любой, чтобы сервис собирал шаги в одну транзакцию. */
export type DbExecutor = PgDatabase<NodePgQueryResultHKT, typeof schema>;
