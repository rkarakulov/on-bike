import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

import { ApiExceptionFilter } from './common/api-exception.filter';
import { ConfigModule } from './config/config.module';
import { ClockModule } from './infra/clock/clock.module';
import { DatabaseModule } from './infra/database/database.module';
import { OutboxModule } from './infra/outbox/outbox.module';
import { QueueModule } from './infra/queue/queue.module';
import { RedisModule } from './infra/redis/redis.module';
import { HealthModule } from './modules/health';
import { IdentityModule } from './modules/identity';
import { TracksModule } from './modules/tracks';

@Module({
  imports: [
    ConfigModule,
    ClockModule,
    DatabaseModule,
    RedisModule,
    OutboxModule,
    QueueModule,
    HealthModule,
    TracksModule,
    IdentityModule,
  ],
  // единый формат ошибок ApiError для всех модулей
  providers: [{ provide: APP_FILTER, useClass: ApiExceptionFilter }],
})
export class AppModule {}
