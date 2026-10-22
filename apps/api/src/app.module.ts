import { Module } from '@nestjs/common';

import { ConfigModule } from './config/config.module';
import { DatabaseModule } from './infra/database/database.module';
import { QueueModule } from './infra/queue/queue.module';
import { HealthModule } from './modules/health';
import { TracksModule } from './modules/tracks';

@Module({
  imports: [ConfigModule, DatabaseModule, QueueModule, HealthModule, TracksModule],
})
export class AppModule {}
