import { Queue } from 'bullmq';
import { eq, isNull } from 'drizzle-orm';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { createTestDb, truncateAll } from '../../../test/db';
import { REDIS_URL_TEST } from '../../../test/test-env';
import { outbox } from '../database/schema';
import { OutboxPublisher } from './outbox.publisher';
import { OutboxWriter } from './outbox.writer';

const { pool, db } = createTestDb();
const queue = new Queue('outbox-test', { connection: { url: REDIS_URL_TEST } });
const now = new Date('2026-10-22T09:00:00Z');
const publisher = new OutboxPublisher(db, { now: () => now }, new Map([['test.happened', queue]]));
const writer = new OutboxWriter();

beforeEach(async () => {
  await truncateAll(pool);
  await queue.obliterate({ force: true });
});
afterAll(async () => {
  await queue.close();
  await pool.end();
});

describe('OutboxPublisher', () => {
  it('ставит задачу с jobId = id события и отмечает published_at; чужие типы не трогает', async () => {
    const id = await writer.append(db, { type: 'test.happened', payload: { thingId: 'x' } });
    const foreign = await writer.append(db, { type: 'other.module', payload: {} });

    expect(await publisher.publishBatch()).toBe(1);

    const job = await queue.getJob(id);
    expect(job?.name).toBe('test.happened');
    expect(job?.data).toEqual({ outboxEventId: id });
    const rows = await db.select().from(outbox);
    expect(rows.find((r) => r.id === id)?.publishedAt).toEqual(now);
    expect(rows.find((r) => r.id === foreign)?.publishedAt).toBeNull();

    expect(await publisher.publishBatch()).toBe(0);
  });

  it('повторная публикация (сбой после add, до commit) не дублирует задачу', async () => {
    const id = await writer.append(db, { type: 'test.happened', payload: {} });
    await publisher.publishBatch();
    await db.update(outbox).set({ publishedAt: null }).where(eq(outbox.id, id));

    expect(await publisher.publishBatch()).toBe(1);

    const counts = await queue.getJobCounts('waiting', 'delayed', 'active');
    expect(Object.values(counts).reduce((sum, n) => sum + n, 0)).toBe(1);
  });

  it('строки, заблокированные другим публикатором, пропускает (SKIP LOCKED)', async () => {
    const locked = await writer.append(db, { type: 'test.happened', payload: {} });
    const free = await writer.append(db, { type: 'test.happened', payload: {} });
    const other = await pool.connect();
    try {
      await other.query('BEGIN');
      await other.query('SELECT id FROM outbox WHERE id = $1 FOR UPDATE', [locked]);

      expect(await publisher.publishBatch()).toBe(1);
      expect(await queue.getJob(free)).toBeDefined();
      expect(await queue.getJob(locked)).toBeUndefined();

      await other.query('ROLLBACK');
    } finally {
      other.release();
    }
    expect(await publisher.publishBatch()).toBe(1);
    expect(await db.select().from(outbox).where(isNull(outbox.publishedAt))).toEqual([]);
  });

  it('пачка ограничена размером', async () => {
    for (let i = 0; i < 3; i += 1) {
      await writer.append(db, { type: 'test.happened', payload: { i } });
    }
    expect(await publisher.publishBatch(2)).toBe(2);
    expect(await publisher.publishBatch(2)).toBe(1);
  });
});
