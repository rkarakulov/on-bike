import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { ENV, type Env } from '../../config/env';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ENV],
      useFactory: (env: Env) => ({
        connection: { url: env.REDIS_URL },
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: 'exponential', delay: 5_000 },
          removeOnComplete: 1_000,
          removeOnFail: false,
        },
      }),
    }),
  ],
})
export class QueueModule {}
