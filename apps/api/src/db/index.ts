import type { Database as BaseDatabase, DbExecutor as BaseDbExecutor } from '@rkarakulov/api-kit';

import * as schema from './schema';

/** Схема `DatabaseModule.forRoot` и стенда тестов: общие таблицы базы (outbox). */
export { schema };
export { outbox } from './schema';

export type Database = BaseDatabase<typeof schema>;
/** Пул или транзакция: репозитории принимают любой, чтобы сервис собирал шаги в одну транзакцию. */
export type DbExecutor = BaseDbExecutor<typeof schema>;
