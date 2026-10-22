import { z } from 'zod';

export const HealthResponse = z.object({
  status: z.enum(['ok', 'degraded']),
  version: z.string(),
  checks: z.record(z.string(), z.enum(['up', 'down'])),
});
export type HealthResponse = z.infer<typeof HealthResponse>;
