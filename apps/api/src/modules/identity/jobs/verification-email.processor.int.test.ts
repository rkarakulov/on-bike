import { getQueueToken } from '@nestjs/bullmq';
import { RegisterResponse } from '@on-bike/contracts';
import { OutboxPublisher, type OutboxJobData } from '@rkarakulov/api-kit';
import type { Job, Queue } from 'bullmq';
import { desc } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createHarness, MINUTE, type Harness } from '../../../../test/harness';
import { call, confirm, register, resend } from '../../../../test/identity';
import { outbox } from '../../../db';
import { QUEUE } from '../../../queues';
import { emailVerificationTokens } from '../identity.schema';
import { sha256 } from '../tokens';
import { IdentityRepository } from '../identity.repository';
import { VerificationEmailProcessor } from './verification-email.processor';

let h: Harness;
let processor: VerificationEmailProcessor;
let emailQueue: Queue;
beforeAll(async () => {
  h = await createHarness();
  processor = h.worker.get(VerificationEmailProcessor);
  emailQueue = h.worker.get(getQueueToken(QUEUE.identityEmail), { strict: false });
});
beforeEach(async () => {
  await h.reset();
});
afterAll(async () => {
  await h.close();
});

const linkPattern = /onbike:\/\/auth\/verify\/([A-Za-z0-9_-]{43})/;
const lastEventId = async () => {
  const [event] = await h.db.select().from(outbox).orderBy(desc(outbox.createdAt), desc(outbox.id));
  if (!event) throw new Error('no outbox event');
  return event.id;
};
const tokenFromMail = (index: number) => {
  const text = h.mailer.sent[index]?.text ?? '';
  const match = linkPattern.exec(text);
  if (!match?.[1]) throw new Error('no link in mail');
  return match[1];
};

describe('VerificationEmailProcessor', () => {
  it('публикатор worker кладёт событие в очередь email; задача отправляет письмо со ссылкой', async () => {
    await register(h);
    const eventId = await lastEventId();

    expect(await h.worker.get(OutboxPublisher).publishBatch()).toBe(1);
    const job = (await emailQueue.getJob(eventId)) as Job<OutboxJobData>;
    expect(job.name).toBe('identity.verification-email-requested');

    expect(await processor.process(job)).toBe('sent');

    expect(h.mailer.sent).toHaveLength(1);
    const mail = h.mailer.sent[0];
    expect(mail).toMatchObject({ to: 'rider@example.com', subject: 'Подтвердите e-mail' });
    const token = tokenFromMail(0);
    expect(mail?.html).toContain(`href="onbike://auth/verify/${token}"`);
    const [row] = await h.db.select().from(emailVerificationTokens);
    expect(row?.tokenHash).toBe(sha256(token));
    expect(row?.sentAt).toEqual(h.clock.now());
    expect((await call(h, 'GET', `/v1/auth/verification/${token}`)).body).toMatchObject({
      state: 'valid',
    });
  });

  it('повторная доставка уже отправленного события — второго письма нет (идемпотентно)', async () => {
    await register(h);
    const eventId = await lastEventId();
    expect(await processor.handle(eventId)).toBe('sent');
    expect(await processor.handle(eventId)).toBe('skipped');
    expect(h.mailer.sent).toHaveLength(1);
  });

  it('ретрай после сбоя SMTP — письмо уходит с той же ссылкой', async () => {
    await register(h);
    const eventId = await lastEventId();
    h.mailer.failNext();
    await expect(processor.handle(eventId)).rejects.toThrow();
    expect(await processor.handle(eventId)).toBe('sent');
    expect(h.mailer.sent).toHaveLength(1);
    const [row] = await h.db.select().from(emailVerificationTokens);
    expect(row?.tokenHash).toBe(sha256(tokenFromMail(0)));
  });

  it('две параллельные доставки одного события — одно письмо; вторая уходит на ретрай и потом пропускается', async () => {
    await register(h);
    const eventId = await lastEventId();
    const release = h.mailer.hold(); // первая доставка захватила отправку и ждёт SMTP
    const first = processor.handle(eventId);
    await expect
      .poll(async () => (await h.db.select().from(emailVerificationTokens))[0]?.sendClaimedAt)
      .not.toBeNull();

    await expect(processor.handle(eventId)).rejects.toThrow(/in progress/);
    release();
    expect(await first).toBe('sent');
    expect(h.mailer.sent).toHaveLength(1);
    expect(await processor.handle(eventId)).toBe('skipped'); // ретрай после отправки
  });

  it('worker упал после захвата — пока захват жив, ретрай ждёт; после срока захвата письмо уходит', async () => {
    await register(h);
    const eventId = await lastEventId();
    const [token] = await h.db.select().from(emailVerificationTokens);
    const repository = h.worker.get(IdentityRepository);
    // «упавший» worker: захватил отправку и не дошёл до SMTP
    expect(
      await repository.claimVerificationSend(h.db, token!.id, h.clock.now(), MINUTE),
    ).toMatchObject({
      status: 'claimed',
    });

    await expect(processor.handle(eventId)).rejects.toThrow(/in progress/);
    expect(h.mailer.sent).toHaveLength(0);

    h.clock.advance(MINUTE + 1);
    expect(await processor.handle(eventId)).toBe('sent');
    expect(h.mailer.sent).toHaveLength(1);
  });

  it('заменённая ссылка — письмо не отправляется; новая — другая ссылка', async () => {
    const { registrationToken } = RegisterResponse.parse((await register(h)).body);
    const first = await lastEventId();
    h.clock.advance(MINUTE);
    await resend(h, { registrationToken });
    const second = await lastEventId();
    expect(second).not.toBe(first);

    expect(await processor.handle(first)).toBe('skipped');
    expect(await processor.handle(second)).toBe('sent');
    expect(h.mailer.sent).toHaveLength(1);
  });

  it('аккаунт уже подтверждён — письмо не отправляется', async () => {
    await register(h);
    const eventId = await lastEventId();
    await processor.handle(eventId);
    await confirm(h, tokenFromMail(0));

    expect(await processor.handle(eventId)).toBe('skipped');
    expect(h.mailer.sent).toHaveLength(1);
  });

  it('событие без строки ссылки (аккаунт удалён очисткой) — пропуск без ошибки', async () => {
    await register(h);
    const eventId = await lastEventId();
    await h.pool.query('DELETE FROM users');
    expect(await processor.handle(eventId)).toBe('skipped');
  });

  it('незнакомая задача в очереди email — ошибка (ретрай и видимый провал)', async () => {
    await expect(
      processor.process({ name: 'other', data: { outboxEventId: 'x' } } as Job<OutboxJobData>),
    ).rejects.toThrow('unknown job');
  });
});
