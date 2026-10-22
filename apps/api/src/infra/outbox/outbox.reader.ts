import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DB, type Database } from '../database/database.module';
import { outbox } from '../database/schema';

/** Payload события для обработчика задачи: в задаче BullMQ лежит только id события. */
@Injectable()
export class OutboxReader {
  constructor(@Inject(DB) private readonly db: Database) {}

  async payloadOf(eventId: string): Promise<unknown> {
    const [row] = await this.db
      .select({ payload: outbox.payload })
      .from(outbox)
      .where(eq(outbox.id, eventId));
    return row?.payload;
  }
}
