import 'reflect-metadata';

import { loadEnv } from './config/env';
import { createHttpApp } from './http-app';

async function bootstrap(): Promise<void> {
  const env = loadEnv();
  const app = await createHttpApp(env);
  app.enableShutdownHooks();
  await app.listen(env.PORT, '0.0.0.0');
}

void bootstrap();
