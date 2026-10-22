import { Module } from '@nestjs/common';

import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './infra/database/database.module';
import { QueueModule } from './infra/queue/queue.module';
import { TracksWorkerModule } from './modules/tracks';

/** Отдельный процесс: CPU-тяжёлые задачи (ffmpeg, Skia, гео) не блокируют API. */
@Module({
  imports: [ConfigModule, DatabaseModule, QueueModule, TracksWorkerModule],
})
export class WorkerModule {}
