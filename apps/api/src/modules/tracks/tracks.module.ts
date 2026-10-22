import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { QUEUE } from '../../infra/queue/queues';
import { TrackProcessingProcessor } from './track-processing.processor';

/** HTTP-часть (загрузка, статусы) — в TracksModule; обработчики очередей — только в воркере. */
@Module({
  imports: [BullModule.registerQueue({ name: QUEUE.trackProcessing })],
  exports: [BullModule],
})
export class TracksModule {}

@Module({
  imports: [TracksModule],
  providers: [TrackProcessingProcessor],
})
export class TracksWorkerModule {}
