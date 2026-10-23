import { Injectable } from '@nestjs/common';

import type { DbExecutor } from '../database/executor';
import { outbox } from '../database/schema';

export interface OutboxEvent {
  type: string;
  payload: Record<string, unknown>;
}

/**
 * Запись доменного события в той же транзакции, что и данные.
 * В payload — только идентификаторы: ни токенов, ни персональных данных.
 */
@Injectable()
export class OutboxWriter {
  async append(tx: DbExecutor, event: OutboxEvent): Promise<string> {
    const [row] = await tx
      .insert(outbox)
      .values({ type: event.type, payload: event.payload })
      .returning({ id: outbox.id });
    if (!row) throw new Error('outbox insert returned no row');
    return row.id;
  }
}
