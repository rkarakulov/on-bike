import type { MailMessage } from '@rkarakulov/api-kit';

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

/** Письмо «Подтвердите e-mail»: HTML с кнопкой и текстовая версия. Адресат подставляет Mailer. */
export function renderVerificationEmail({ link }: { link: string }): Omit<MailMessage, 'to'> {
  const href = escapeHtml(link);
  const subject = 'Подтвердите e-mail';
  const text = [
    'Здравствуйте!',
    '',
    'Чтобы завершить регистрацию в «Покатим», подтвердите адрес электронной почты по ссылке:',
    link,
    '',
    'Ссылка действует 24 часа. Если вы не регистрировались в «Покатим», просто проигнорируйте это письмо.',
  ].join('\n');
  const html = `<!doctype html>
<html lang="ru">
  <body style="font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; line-height: 1.5;">
    <p>Здравствуйте!</p>
    <p>Чтобы завершить регистрацию в «Покатим», подтвердите адрес электронной почты.</p>
    <p><a href="${href}" style="display: inline-block; padding: 12px 20px; background: #111; color: #fff; text-decoration: none;">Подтвердить e-mail</a></p>
    <p>Если кнопка не работает, откройте ссылку: <br /><a href="${href}">${href}</a></p>
    <p>Ссылка действует 24 часа. Если вы не регистрировались в «Покатим», просто проигнорируйте это письмо.</p>
  </body>
</html>`;
  return { subject, html, text };
}
