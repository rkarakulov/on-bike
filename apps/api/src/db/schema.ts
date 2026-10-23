/**
 * Общие таблицы базы в drizzle-схеме проекта: миграции генерирует drizzle-kit проекта
 * (drizzle.config.ts), таблицы модулей — в `modules/<context>/*.schema.ts` (реэкспорт сюда).
 */
export { outbox } from '@rkarakulov/api-kit/outbox-schema';
