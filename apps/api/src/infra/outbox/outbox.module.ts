import { BullModule, getQueueToken } from '@nestjs/bullmq';
import { DynamicModule, Global, Module } from '@nestjs/common';
import type { Queue } from 'bullmq';

import { CLOCK, type Clock } from '../clock/clock.module';
import { DB, type Database } from '../database/database.module';
import { OutboxPublisher, OutboxPublisherLoop, type OutboxRoutes } from './outbox.publisher';
import { OutboxReader } from './outbox.reader';
import { OutboxWriter } from './outbox.writer';

/** Запись и чтение событий — в API и worker. Модули знают только про OutboxWriter. */
@Global()
@Module({
  providers: [OutboxWriter, OutboxReader],
  exports: [OutboxWriter, OutboxReader],
})
export class OutboxModule {}

/** Публикатор — только в worker; маршруты тип → очередь задаёт composition root. */
@Module({})
export class OutboxPublisherModule {
  static forRoot({ routes }: { routes: OutboxRoutes }): DynamicModule {
    const queueNames = [...new Set(Object.values(routes))];
    return {
      module: OutboxPublisherModule,
      imports: [BullModule.registerQueue(...queueNames.map((name) => ({ name })))],
      providers: [
        {
          provide: OutboxPublisher,
          inject: [DB, CLOCK, ...queueNames.map((name) => getQueueToken(name))],
          useFactory: (db: Database, clock: Clock, ...queues: Queue[]) => {
            const byName = new Map(queueNames.map((name, i) => [name, queues[i] as Queue]));
            const byType = new Map(
              Object.entries(routes).map(([type, name]) => [type, byName.get(name) as Queue]),
            );
            return new OutboxPublisher(db, clock, byType);
          },
        },
        {
          provide: OutboxPublisherLoop,
          inject: [OutboxPublisher],
          useFactory: (publisher: OutboxPublisher) => new OutboxPublisherLoop(publisher),
        },
      ],
    };
  }
}
