import { Inject, Injectable } from '@nestjs/common';
import type { HealthResponse } from '@on-bike/contracts';
import { Pool } from 'pg';

import { PG_POOL } from '../../infra/database/database.module';

@Injectable()
export class HealthService {
  constructor(@Inject(PG_POOL) private readonly pool: Pool) {}

  async check(): Promise<HealthResponse> {
    const database = await this.pool
      .query('select 1')
      .then(() => 'up' as const)
      .catch(() => 'down' as const);
    return {
      status: database === 'up' ? 'ok' : 'degraded',
      version: process.env.APP_VERSION ?? 'dev',
      checks: { database },
    };
  }
}
