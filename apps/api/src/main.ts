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
  app.enableShutdownHooks();
  await app.listen(config.PORT, '0.0.0.0');
}

void bootstrap();
