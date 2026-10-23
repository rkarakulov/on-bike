import { defineConfig } from 'drizzle-kit';

// имя, пользователь и пароль dev-БД (infra/docker-compose.dev.yml)
const DB = 'on_bike';

export default defineConfig({
  dialect: 'postgresql',
  // db/schema.ts — общие таблицы базы (outbox из api-kit), модули — свои *.schema.ts
  schema: ['./src/db/schema.ts', './src/modules/*/*.schema.ts'],
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? `postgres://${DB}:${DB}@127.0.0.1:5432/${DB}`,
  },
  // таблицы PostGIS не трогаем
  extensionsFilters: ['postgis'],
});
