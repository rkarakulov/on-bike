import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import type { Queue } from 'bullmq';

import { QUEUE } from '../../../infra/queue/queues';
import { CLEANUP_UNVERIFIED_JOB } from './cleanup-unverified.processor';

/** Расписание задач identity; upsert идемпотентен — несколько worker не плодят дубли. */
export const IDENTITY_SCHEDULES = [
  {
    id: 'identity.cleanup-unverified.daily',
    repeat: { pattern: '0 3 * * *', tz: 'Europe/Minsk' },
    job: { name: CLEANUP_UNVERIFIED_JOB },
  },
] as const;

@Injectable()
export class IdentitySchedules implements OnApplicationBootstrap {
  constructor(@InjectQueue(QUEUE.identityMaintenance) private readonly queue: Queue) {}

  async onApplicationBootstrap(): Promise<void> {
    for (const schedule of IDENTITY_SCHEDULES) {
      await this.queue.upsertJobScheduler(schedule.id, schedule.repeat, schedule.job);
    }
  }
}
