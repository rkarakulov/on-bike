import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import {
  API_ERROR_MESSAGES,
  ApiExceptionFilter,
  ClockModule,
  ConfigModule,
  DatabaseModule,
  OutboxModule,
  QueueModule,
  RedisModule,
} from '@rkarakulov/api-kit';

import { env } from './config/env';
import { schema } from './db';
import { PROJECT_ERROR_MESSAGES } from './error-messages';
import { HealthModule } from './modules/health';
import { IdentityModule } from './modules/identity';
import { TracksModule } from './modules/tracks';

@Module({
  imports: [
    ConfigModule.forRoot(env),
    ClockModule,
    DatabaseModule.forRoot({ schema }),
    RedisModule,
    OutboxModule,
    QueueModule,
    HealthModule,
    TracksModule,
    IdentityModule,
  ],
  // единый формат ошибок ApiError для всех модулей; тексты кодов проекта — рядом с фильтром
  providers: [
    { provide: APP_FILTER, useClass: ApiExceptionFilter },
    { provide: API_ERROR_MESSAGES, useValue: PROJECT_ERROR_MESSAGES },
  ],
})
export class AppModule {}
