import { Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import type { Queue } from 'bullmq';
import { and, asc, inArray, isNull } from 'drizzle-orm';

import type { Clock } from '../clock/clock.module';
import type { Database } from '../database/database.module';
import { outbox } from '../database/schema';

/** Тип события → очередь BullMQ. Маршруты задаёт composition root (worker.module.ts). */
export type OutboxRoutes = Readonly<Record<string, string>>;

export interface OutboxJobData {
  outboxEventId: string;
}

/**
 * Переносит неопубликованные события outbox в BullMQ.
 * `FOR UPDATE SKIP LOCKED` — несколько публикаторов не берут одно событие; jobId = id события —
 * повторная публикация после сбоя (add прошёл, commit нет) не создаёт вторую задачу.
 */
export class OutboxPublisher {
  constructor(
    private readonly db: Database,
    private readonly clock: Clock,
    private readonly queues: ReadonlyMap<string, Queue>,
  ) {}

  async publishBatch(limit = 100): Promise<number> {
    const types = [...this.queues.keys()];
    if (types.length === 0) return 0;
    return this.db.transaction(async (tx) => {
      const events = await tx
        .select({ id: outbox.id, type: outbox.type })
        .from(outbox)
        .where(and(isNull(outbox.publishedAt), inArray(outbox.type, types)))
        .orderBy(asc(outbox.createdAt))
        .limit(limit)
        .for('update', { skipLocked: true });
      if (events.length === 0) return 0;
      for (const event of events) {
        const data: OutboxJobData = { outboxEventId: event.id };
        await this.queues.get(event.type)?.add(event.type, data, { jobId: event.id });
      }
      await tx
        .update(outbox)
        .set({ publishedAt: this.clock.now() })
        .where(
          inArray(
            outbox.id,
            events.map((event) => event.id),
          ),
        );
      return events.length;
    });
  }
}

const IDLE_DELAY_MS = 1_000;
const BATCH_SIZE = 100;

/** Цикл публикатора в worker: полная пачка — сразу следующая, иначе пауза ~1 с. */
export class OutboxPublisherLoop implements OnApplicationBootstrap, OnApplicationShutdown {
  private readonly logger = new Logger('OutboxPublisher');
  private timer: NodeJS.Timeout | undefined;
  private running: Promise<void> | undefined;
  private stopped = false;

  constructor(private readonly publisher: OutboxPublisher) {}

  onApplicationBootstrap(): void {
    this.schedule(0);
  }

  async onApplicationShutdown(): Promise<void> {
    this.stopped = true;
    clearTimeout(this.timer);
    await this.running;
  }

  private schedule(delayMs: number): void {
    if (this.stopped) return;
    this.timer = setTimeout(() => {
      this.running = this.tick();
    }, delayMs);
  }

  private async tick(): Promise<void> {
    let published = 0;
    try {
      published = await this.publisher.publishBatch(BATCH_SIZE);
    } catch (error) {
      this.logger.error(`publish failed: ${error instanceof Error ? error.name : 'unknown'}`);
    }
    this.schedule(published === BATCH_SIZE ? 0 : IDLE_DELAY_MS);
  }
}
