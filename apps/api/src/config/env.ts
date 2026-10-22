import { z } from 'zod';

const Env = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().default(3000),
  DATABASE_URL: z.url(),
  REDIS_URL: z.url(),
});
export type Env = z.infer<typeof Env>;

/** Падаем на старте, если окружение невалидно — лучше, чем в рантайме. */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return Env.parse(source);
}

export const ENV = Symbol('ENV');
