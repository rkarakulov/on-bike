import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/infra/database/schema.ts',
  out: './drizzle',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://onbike:onbike@localhost:5432/onbike',
  },
  // таблицы PostGIS не трогаем
  extensionsFilters: ['postgis'],
});
