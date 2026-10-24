import { describe, expect, it } from 'vitest';

import { renderPasswordChangedEmail } from './password-changed-email';

describe('renderPasswordChangedEmail', () => {
  // 21:05 UTC — уже следующий день по Минску (UTC+3)
  const changedAt = new Date('2026-10-25T21:05:00.000Z');

  it('тема, дата и время смены — по Минску', () => {
    const mail = renderPasswordChangedEmail({ changedAt });
    expect(mail.subject).toBe('Пароль изменён');
    for (const body of [mail.text, mail.html]) {
      expect(body).toContain('26 октября 2026');
      expect(body).toContain('00:05');
      expect(body).toContain('по минскому времени');
      expect(body).toContain('«Забыли пароль?»');
    }
  });

  it('без ссылок: ни токена, ни адреса приложения', () => {
    const mail = renderPasswordChangedEmail({ changedAt });
    for (const body of [mail.text, mail.html]) {
      expect(body).not.toMatch(/href=|https?:\/\/|pokatim:\/\/|exp:\/\/|auth\/reset/);
    }
  });

  it('продукт назван брендом «Покатим»', () => {
    const mail = renderPasswordChangedEmail({ changedAt });
    for (const body of [mail.text, mail.html]) {
      expect(body).toContain('«Покатим»');
      expect(body).not.toMatch(/pokatim|on-?bike/i);
    }
  });
});
