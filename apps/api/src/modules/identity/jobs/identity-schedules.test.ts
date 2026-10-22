import type { Queue } from 'bullmq';
import { describe, expect, it } from 'vitest';

import { IdentitySchedules } from './identity-schedules';

describe('IdentitySchedules', () => {
  it('ежедневная очистка неподтверждённых в 03:00 по Минску (upsert — без дублей)', async () => {
    const calls: unknown[][] = [];
    const queue = {
      upsertJobScheduler: (...args: unknown[]) => {
        calls.push(args);
        return Promise.resolve();
      },
    } as unknown as Queue;

    await new IdentitySchedules(queue).onApplicationBootstrap();

    expect(calls).toEqual([
      [
        'identity.cleanup-unverified.daily',
        { pattern: '0 3 * * *', tz: 'Europe/Minsk' },
        { name: 'cleanup-unverified' },
      ],
    ]);
  });
});
