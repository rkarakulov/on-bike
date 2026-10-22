import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { API_VERSION } from '@on-bike/contracts';

import { AppModule } from './app.module';
import type { Env } from './config/env';

/** Fastify за Caddy: при TRUST_PROXY = N доверяем N прокси в X-Forwarded-For (лимит регистраций по IP). */
export function createFastifyAdapter(env: Pick<Env, 'TRUST_PROXY'>): FastifyAdapter {
  // число хопов, а не true: при true Fastify взял бы самый левый адрес, который подставляет клиент
  const hops = env.TRUST_PROXY;
  return new FastifyAdapter({
    trustProxy: hops > 0 ? (_address: string, hop: number) => hop < hops : false,
    bodyLimit: 64 * 1024,
  });
}

/** Общая настройка HTTP-приложения — для main.ts и e2e-тестов. */
export function configureHttpApp(app: NestFastifyApplication): NestFastifyApplication {
  return app.setGlobalPrefix(API_VERSION);
}

export async function createHttpApp(env: Env): Promise<NestFastifyApplication> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    createFastifyAdapter(env),
  );
  return configureHttpApp(app);
}
