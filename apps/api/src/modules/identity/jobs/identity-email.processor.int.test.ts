import { getQueueToken } from '@nestjs/bullmq';
import { RegisterResponse } from '@pokatim/contracts';
import { OutboxPublisher, type OutboxJobData } from '@rkarakulov/api-kit';
import type { Job, Queue } from 'bullmq';
import { desc, eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createHarness, HOUR, MINUTE, type Harness } from '../../../../test/harness';
import {
  activeLinkToken,
  call,
  confirm,
  confirmPasswordReset,
  register,
  requestPasswordReset,
  resend,
} from '../../../../test/identity';
import { outbox } from '../../../db';
import { QUEUE } from '../../../queues';
import { emailVerificationTokens, passwordResetTokens, users } from '../identity.schema';
import { sha256 } from '../tokens';
import { IdentityRepository } from '../identity.repository';
import { IdentityEmailProcessor } from './identity-email.processor';
import { LinkEmailHandler } from './link-email.handler';

let h: Harness;
let processor: IdentityEmailProcessor;
let linkEmails: LinkEmailHandler;
/** Обработчик письма подтверждения по id события (как задача очереди). */
const handle = (eventId: string) => linkEmails.handle('verification', eventId);
let emailQueue: Queue;
beforeAll(async () => {
  h = await createHarness();
  processor = h.worker.get(IdentityEmailProcessor);
  linkEmails = h.worker.get(LinkEmailHandler);
  emailQueue = h.worker.get(getQueueToken(QUEUE.identityEmail), { strict: false });
});
beforeEach(async () => {
  await h.reset();
});
afterAll(async () => {
  await h.close();
});

const linkPattern = /pokatim:\/\/auth\/verify\/([A-Za-z0-9_-]{43})/;
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

describe('IdentityEmailProcessor: письмо подтверждения', () => {
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
    expect(mail?.html).toContain(`href="pokatim://auth/verify/${token}"`);
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
    expect(await handle(eventId)).toBe('sent');
    expect(await handle(eventId)).toBe('skipped');
    expect(h.mailer.sent).toHaveLength(1);
  });

  it('ретрай после сбоя SMTP — письмо уходит с той же ссылкой', async () => {
    await register(h);
    const eventId = await lastEventId();
    h.mailer.failNext();
    await expect(handle(eventId)).rejects.toThrow();
    expect(await handle(eventId)).toBe('sent');
    expect(h.mailer.sent).toHaveLength(1);
    const [row] = await h.db.select().from(emailVerificationTokens);
    expect(row?.tokenHash).toBe(sha256(tokenFromMail(0)));
  });

  it('две параллельные доставки одного события — одно письмо; вторая уходит на ретрай и потом пропускается', async () => {
    await register(h);
    const eventId = await lastEventId();
    const release = h.mailer.hold(); // первая доставка захватила отправку и ждёт SMTP
    const first = handle(eventId);
    await expect
      .poll(async () => (await h.db.select().from(emailVerificationTokens))[0]?.sendClaimedAt)
      .not.toBeNull();

    await expect(handle(eventId)).rejects.toThrow(/in progress/);
    release();
    expect(await first).toBe('sent');
    expect(h.mailer.sent).toHaveLength(1);
    expect(await handle(eventId)).toBe('skipped'); // ретрай после отправки
  });

  it('worker упал после захвата — пока захват жив, ретрай ждёт; после срока захвата письмо уходит', async () => {
    await register(h);
    const eventId = await lastEventId();
    const [token] = await h.db.select().from(emailVerificationTokens);
    const repository = h.worker.get(IdentityRepository);
    // «упавший» worker: захватил отправку и не дошёл до SMTP
    expect(
      await repository.claimLinkSend(h.db, 'verification', token!.id, h.clock.now(), MINUTE),
    ).toMatchObject({
      status: 'claimed',
    });

    await expect(handle(eventId)).rejects.toThrow(/in progress/);
    expect(h.mailer.sent).toHaveLength(0);

    h.clock.advance(MINUTE + 1);
    expect(await handle(eventId)).toBe('sent');
    expect(h.mailer.sent).toHaveLength(1);
  });

  it('заменённая ссылка — письмо не отправляется; новая — другая ссылка', async () => {
    const { registrationToken } = RegisterResponse.parse((await register(h)).body);
    const first = await lastEventId();
    h.clock.advance(MINUTE);
    await resend(h, { registrationToken });
    const second = await lastEventId();
    expect(second).not.toBe(first);

    expect(await handle(first)).toBe('skipped');
    expect(await handle(second)).toBe('sent');
    expect(h.mailer.sent).toHaveLength(1);
  });

  it('аккаунт уже подтверждён — письмо не отправляется', async () => {
    await register(h);
    const eventId = await lastEventId();
    await handle(eventId);
    await confirm(h, tokenFromMail(0));

    expect(await handle(eventId)).toBe('skipped');
    expect(h.mailer.sent).toHaveLength(1);
  });

  it('событие без строки ссылки (аккаунт удалён очисткой) — пропуск без ошибки', async () => {
    await register(h);
    const eventId = await lastEventId();
    await h.pool.query('DELETE FROM users');
    expect(await handle(eventId)).toBe('skipped');
  });

  it('незнакомая задача в очереди email — ошибка (ретрай и видимый провал)', async () => {
    await expect(
      processor.process({ name: 'other', data: { outboxEventId: 'x' } } as Job<OutboxJobData>),
    ).rejects.toThrow('unknown job');
  });
});

const EMAIL = 'rider@example.com';
const resetPattern = /pokatim:\/\/auth\/reset\/([A-Za-z0-9_-]{43})/;
const resetTokenFromMail = (index: number) => {
  const match = resetPattern.exec(h.mailer.sent[index]?.text ?? '');
  if (!match?.[1]) throw new Error('no reset link in mail');
  return match[1];
};
/** Подтверждённый аккаунт и запрос сброса; письма подтверждения не отправляются (событие не обрабатывается). */
async function requestReset(): Promise<string> {
  await register(h);
  await confirm(h, await activeLinkToken(h));
  await requestPasswordReset(h, EMAIL);
  return lastEventId();
}
const job = (name: string, outboxEventId: string) =>
  ({ name, data: { outboxEventId } }) as Job<OutboxJobData>;

describe('IdentityEmailProcessor: письмо сброса пароля', () => {
  it('через очередь: письмо со ссылкой auth/reset, sha256 токена = token_hash, sent_at', async () => {
    const eventId = await requestReset();
    await h.worker.get(OutboxPublisher).publishBatch();
    const queued = (await emailQueue.getJob(eventId)) as Job<OutboxJobData>;
    expect(queued.name).toBe('identity.password-reset-email-requested');

    expect(await processor.process(queued)).toBe('sent');

    expect(h.mailer.sent).toHaveLength(1);
    const mail = h.mailer.sent[0];
    expect(mail).toMatchObject({ to: EMAIL, subject: 'Восстановление пароля' });
    const token = resetTokenFromMail(0);
    expect(mail?.html).toContain(`href="pokatim://auth/reset/${token}"`);
    const [row] = await h.db.select().from(passwordResetTokens);
    expect(row?.tokenHash).toBe(sha256(token));
    expect(row?.sentAt).toEqual(h.clock.now());
    expect((await call(h, 'GET', `/v1/auth/password-reset/${token}`)).body).toEqual({
      state: 'valid',
      email: EMAIL,
    });
  });

  it('повтор отправленного — пропуск; сбой SMTP — ретрай с той же ссылкой', async () => {
    const eventId = await requestReset();
    const name = 'identity.password-reset-email-requested';
    h.mailer.failNext();
    await expect(processor.process(job(name, eventId))).rejects.toThrow();
    expect(await processor.process(job(name, eventId))).toBe('sent');
    expect(await processor.process(job(name, eventId))).toBe('skipped');
    expect(h.mailer.sent).toHaveLength(1);
  });

  it('живой захват другого worker — ретрай (общий захват отправки)', async () => {
    const eventId = await requestReset();
    const [row] = await h.db.select().from(passwordResetTokens);
    const repository = h.worker.get(IdentityRepository);
    expect(
      await repository.claimLinkSend(h.db, 'passwordReset', row!.id, h.clock.now(), MINUTE),
    ).toMatchObject({ status: 'claimed' });

    await expect(linkEmails.handle('passwordReset', eventId)).rejects.toThrow(/in progress/);
    h.clock.advance(MINUTE + 1);
    expect(await linkEmails.handle('passwordReset', eventId)).toBe('sent');
  });

  it('заменённая, использованная, истёкшая ссылка и удалённый аккаунт — письма нет', async () => {
    const first = await requestReset();
    h.clock.advance(MINUTE);
    await requestPasswordReset(h, EMAIL);
    const second = await lastEventId();
    expect(await linkEmails.handle('passwordReset', first)).toBe('skipped'); // заменена

    h.clock.advance(HOUR);
    expect(await linkEmails.handle('passwordReset', second)).toBe('skipped'); // истекла

    h.clock.advance(MINUTE);
    await requestPasswordReset(h, EMAIL);
    const third = await lastEventId();
    const [, , row] = await h.db
      .select()
      .from(passwordResetTokens)
      .orderBy(passwordResetTokens.createdAt);
    await h.db
      .update(passwordResetTokens)
      .set({ usedAt: h.clock.now() })
      .where(eq(passwordResetTokens.id, row!.id));
    expect(await linkEmails.handle('passwordReset', third)).toBe('skipped'); // использована

    h.clock.advance(MINUTE);
    await requestPasswordReset(h, EMAIL);
    const fourth = await lastEventId();
    await h.db.update(users).set({ deletedAt: h.clock.now() });
    expect(await linkEmails.handle('passwordReset', fourth)).toBe('skipped'); // аккаунт удалён
    expect(h.mailer.sent).toHaveLength(0);
  });

  it('неподтверждённому аккаунту письмо сброса уходит (Q4)', async () => {
    await register(h);
    await requestPasswordReset(h, EMAIL);
    expect(await linkEmails.handle('passwordReset', await lastEventId())).toBe('sent');
  });
});

describe('IdentityEmailProcessor: «Пароль изменён»', () => {
  const name = 'identity.password-changed-email-requested';

  it('после смены пароля — письмо без ссылки с токеном, время по Минску', async () => {
    await requestReset();
    await linkEmails.handle('passwordReset', await lastEventId());
    const token = resetTokenFromMail(0);
    expect((await confirmPasswordReset(h, token, 'brand-new-password')).status).toBe(200);
    const eventId = await lastEventId();

    expect(await processor.process(job(name, eventId))).toBe('sent');

    const mail = h.mailer.sent[1];
    expect(mail).toMatchObject({ to: EMAIL, subject: 'Пароль изменён' });
    for (const body of [mail?.text ?? '', mail?.html ?? '']) {
      expect(body).not.toContain(token);
      expect(body).not.toMatch(/pokatim:\/\/|auth\/reset/);
      expect(body).toContain('по минскому времени');
    }
  });

  it('аккаунт удалён — пропуск; без строки ссылки (каскад) — пропуск', async () => {
    await requestReset();
    const resetEvent = await lastEventId();
    await linkEmails.handle('passwordReset', resetEvent);
    await confirmPasswordReset(h, resetTokenFromMail(0), 'brand-new-password');
    const eventId = await lastEventId();
    await h.db.update(users).set({ deletedAt: h.clock.now() });
    expect(await processor.process(job(name, eventId))).toBe('skipped');
    await h.pool.query('DELETE FROM users');
    expect(await processor.process(job(name, eventId))).toBe('skipped');
    expect(h.mailer.sent).toHaveLength(1);
  });
});
