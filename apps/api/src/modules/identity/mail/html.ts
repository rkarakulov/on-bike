/** Экранирование значений, подставляемых в HTML писем (ссылки, даты). */
export const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

/** Каркас HTML-письма: абзацы уже экранированы вызывающим. */
export const htmlEmail = (paragraphs: string[]) => `<!doctype html>
<html lang="ru">
  <body style="font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; line-height: 1.5;">
${paragraphs.map((paragraph) => `    <p>${paragraph}</p>`).join('\n')}
  </body>
</html>`;

/** Кнопка-ссылка письма (href уже экранирован). */
export const buttonHtml = (href: string, label: string) =>
  `<a href="${href}" style="display: inline-block; padding: 12px 20px; background: #111; color: #fff; text-decoration: none;">${label}</a>`;
