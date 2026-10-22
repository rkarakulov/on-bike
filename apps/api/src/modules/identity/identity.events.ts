import { z } from 'zod';

import { QUEUE } from '../../queues';

/** Нужно отправить письмо со ссылкой подтверждения. В payload — только id строки ссылки. */
export const VERIFICATION_EMAIL_REQUESTED = 'identity.verification-email-requested';

export const VerificationEmailRequested = z.object({ verificationTokenId: z.uuid() });
export type VerificationEmailRequested = z.infer<typeof VerificationEmailRequested>;

/** Маршруты событий identity для публикатора outbox (подключает worker.module.ts). */
export const identityOutboxRoutes = {
  [VERIFICATION_EMAIL_REQUESTED]: QUEUE.identityEmail,
} as const;
