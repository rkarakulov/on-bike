import 'reflect-metadata';

import { API_VERSION } from '@on-bike/contracts';
import { NestFactory } from '@nestjs/core';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { configureHttpApp, createFastifyAdapter } from '@rkarakulov/api-kit';

import { AppModule } from './app.module';
import { loadEnv } from './config/env';

async function bootstrap(): Promise<void> {
  const config = loadEnv();
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    createFastifyAdapter(config),
  );
  configureHttpApp(app, { prefix: API_VERSION });
  // web в dev — другой origin; без списка CORS выключен (прод — один origin за прокси)
  if (config.CORS_ORIGINS.length > 0) {
    app.enableCors({ origin: config.CORS_ORIGINS, credentials: false });
  }
  app.enableShutdownHooks();
  await app.listen(config.PORT, '0.0.0.0');
}

void bootstrap();
