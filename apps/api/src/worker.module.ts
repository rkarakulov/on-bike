import { Module } from '@nestjs/common';

import { ConfigModule } from './config/config.module';
import { ClockModule } from './infra/clock/clock.module';
import { DatabaseModule } from './infra/database/database.module';
import { MailModule } from './infra/mail/mail.module';
import { OutboxModule, OutboxPublisherModule } from './infra/outbox/outbox.module';
import { QueueModule } from './infra/queue/queue.module';
import { identityOutboxRoutes, IdentityWorkerModule } from './modules/identity';
import { TracksWorkerModule } from './modules/tracks';

/** Отдельный процесс: CPU-тяжёлые задачи (ffmpeg, Skia, гео) не блокируют API. */
@Module({
  imports: [
    ConfigModule,
    ClockModule,
    DatabaseModule,
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
