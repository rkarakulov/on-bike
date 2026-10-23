import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  // db/schema.ts — общие таблицы базы (outbox из api-kit), модули — свои *.schema.ts
  schema: ['./src/db/schema.ts', './src/modules/*/*.schema.ts'],
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://onbike:onbike@127.0.0.1:5432/onbike',
  },
  // таблицы PostGIS не трогаем
  extensionsFilters: ['postgis'],
});
