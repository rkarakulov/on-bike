import { expect, type APIRequestContext } from '@playwright/test';

import { MAILPIT_URL } from './urls';

interface MailpitSearch {
  messages: { ID: string }[];
}

interface MailpitMessage {
  Text: string;
}

/**
 * Ссылка подтверждения из письма регистрации (HTTP API Mailpit: поиск по получателю, текст письма).
 * Письмо отправляет worker из outbox — ждём его появления, а не фиксированную паузу.
 */
export async function verificationLink(request: APIRequestContext, email: string) {
  let id: string | undefined;
  await expect
    .poll(
      async () => {
        const response = await request.get(`${MAILPIT_URL}/api/v1/search`, {
          params: { query: `to:"${email}"` },
        });
        id = ((await response.json()) as MailpitSearch).messages[0]?.ID;
        return id;
      },
      { message: `письмо на ${email} в Mailpit`, timeout: 30_000 },
    )
    .toBeDefined();

  const message = (await (
    await request.get(`${MAILPIT_URL}/api/v1/message/${id}`)
  ).json()) as MailpitMessage;
  const link = /https?:\/\/\S+\/auth\/verify\/[\w-]+/.exec(message.Text)?.[0];
  expect(link, 'ссылка подтверждения в тексте письма').toBeDefined();
  return link ?? '';
}
