import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

import { ENV, type Env } from '../../../config/env';
import { CLOCK, type Clock } from '../../../infra/clock/clock.module';
import { MAILER, type Mailer } from '../../../infra/mail/mailer';
import type { OutboxJobData } from '../../../infra/outbox/outbox.publisher';
import { OutboxReader } from '../../../infra/outbox/outbox.reader';
import { QUEUE } from '../../../infra/queue/queues';
import { VERIFICATION_EMAIL_REQUESTED, VerificationEmailRequested } from '../identity.events';
import { IdentityRepository } from '../identity.repository';
import { IDENTITY_POLICY } from '../identity.policy';
import { renderVerificationEmail } from '../mail/verification-email';
import { deriveVerificationToken } from '../tokens';

export type VerificationEmailOutcome = 'sent' | 'skipped';

/**
 * Письмо со ссылкой подтверждения. Ссылка пересобирается из id строки (HMAC) — ретрай даёт ту же ссылку.
 * Заменённая, использованная ссылка или уже подтверждённый аккаунт — письмо не нужно.
 * Одно письмо на ссылку: отправку захватывает атомарный UPDATE с ограниченным сроком (`send_claimed_at`),
 * факт отправки — `sent_at` после ответа SMTP. Повтор отправленного — пропуск; параллельная доставка и живой
 * захват упавшего worker — ретрай BullMQ; сбой SMTP снимает захват. Остаточный риск (at-least-once): SMTP
 * принял письмо, а worker упал до записи `sent_at` — по истечении захвата уйдёт дубль с той же ссылкой.
 */
@Processor(QUEUE.identityEmail)
export class VerificationEmailProcessor extends WorkerHost {
  private readonly logger = new Logger(VerificationEmailProcessor.name);

  constructor(
    private readonly repository: IdentityRepository,
    private readonly outbox: OutboxReader,
    @Inject(MAILER) private readonly mailer: Mailer,
    @Inject(ENV) private readonly env: Env,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {
    super();
  }

  async process(job: Job<OutboxJobData>): Promise<VerificationEmailOutcome> {
    if (job.name !== VERIFICATION_EMAIL_REQUESTED) {
      throw new Error(`unknown job ${job.name} in queue ${QUEUE.identityEmail}`);
    }
    return this.handle(job.data.outboxEventId);
  }

  async handle(outboxEventId: string): Promise<VerificationEmailOutcome> {
    const payload = VerificationEmailRequested.safeParse(
      await this.outbox.payloadOf(outboxEventId),
    );
    if (!payload.success) {
      this.logger.warn(`event ${outboxEventId}: no valid payload, skipped`);
      return 'skipped';
    }
    const tokenId = payload.data.verificationTokenId;
    const now = this.clock.now();
    const claim = await this.repository.claimVerificationSend(
      this.repository.db,
      tokenId,
      now,
      IDENTITY_POLICY.emailSendLeaseMs,
    );
    if (!claim) return 'skipped';
    // другой worker отправляет прямо сейчас (или упал с живым захватом) — ретрай BullMQ с backoff
    if (claim.status === 'busy')
      throw new Error(`verification email for event ${outboxEventId}: send in progress`);

    const linkToken = deriveVerificationToken(this.env.EMAIL_TOKEN_SECRET, claim.id);
    const mail = renderVerificationEmail({
      link: `${this.env.APP_LINK_BASE}auth/verify/${linkToken}`,
    });
    try {
      await this.mailer.send({ to: claim.email, ...mail });
    } catch (error) {
      await this.repository.releaseVerificationSend(this.repository.db, claim.id, now);
      throw error;
    }
    await this.repository.completeVerificationSend(
      this.repository.db,
      claim.id,
      now,
      this.clock.now(),
    );
    this.logger.log(`verification email sent for event ${outboxEventId}`);
    return 'sent';
  }
}
