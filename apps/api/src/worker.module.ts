import { Module } from '@nestjs/common';
import {
  ClockModule,
  ConfigModule,
  DatabaseModule,
  MailModule,
  OutboxModule,
  OutboxPublisherModule,
  QueueModule,
} from '@rkarakulov/api-kit';

import { env } from './config/env';
import { schema } from './db';
import { identityOutboxRoutes, IdentityWorkerModule } from './modules/identity';
import { TracksWorkerModule } from './modules/tracks';

/** Отдельный процесс: CPU-тяжёлые задачи (ffmpeg, Skia, гео) не блокируют API. */
@Module({
  imports: [
    ConfigModule.forRoot(env),
    ClockModule,
    DatabaseModule.forRoot({ schema }),
    QueueModule,
    MailModule,
    OutboxModule,
    // composition root: какие события outbox в какие очереди
    OutboxPublisherModule.forRoot({ routes: { ...identityOutboxRoutes } }),
    TracksWorkerModule,
    IdentityWorkerModule,
  ],
})
export class WorkerModule {}
