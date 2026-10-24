import { expect, type APIRequestContext } from '@playwright/test';

/** HTTP API Mailpit (письма регистрации). */
const MAILPIT_URL = (process.env.MAILPIT_URL ?? 'http://127.0.0.1:8025').replace(/\/$/, '');

interface MailpitSearch {
  messages: { ID: string }[];
}

interface MailpitMessage {
  Text: string;
}

/**
 * Текст последнего письма по запросу поиска Mailpit (`to:"…" subject:"…"`; новые — первыми). Письма отправляет
 * worker из outbox — ждём появления, а не фиксированную паузу.
 */
export async function latestMailText(request: APIRequestContext, query: string): Promise<string> {
  let id: string | undefined;
  await expect
    .poll(
      async () => {
        const response = await request.get(`${MAILPIT_URL}/api/v1/search`, { params: { query } });
        id = ((await response.json()) as MailpitSearch).messages[0]?.ID;
        return id;
      },
      { message: `письмо ${query} в Mailpit`, timeout: 30_000 },
    )
    .toBeDefined();

  const message = (await (
    await request.get(`${MAILPIT_URL}/api/v1/message/${id}`)
  ).json()) as MailpitMessage;
  return message.Text;
}

/** Ссылка из текста письма по пути экрана приложения (`auth/verify`, `auth/reset`). */
async function mailLink(request: APIRequestContext, query: string, path: string) {
  const text = await latestMailText(request, query);
  const link = new RegExp(`https?://\\S+/${path}/[\\w-]+`).exec(text)?.[0];
  expect(link, `ссылка ${path} в тексте письма`).toBeDefined();
  return link ?? '';
}

/** Ссылка подтверждения из письма регистрации. */
export const verificationLink = (request: APIRequestContext, email: string) =>
  mailLink(request, `to:"${email}" subject:"Подтвердите e-mail"`, 'auth/verify');

/** Ссылка из письма «Восстановление пароля». */
export const passwordResetLink = (request: APIRequestContext, email: string) =>
  mailLink(request, `to:"${email}" subject:"Восстановление пароля"`, 'auth/reset');
