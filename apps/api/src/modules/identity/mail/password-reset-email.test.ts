import { describe, expect, it } from 'vitest';

import { renderPasswordResetEmail } from './password-reset-email';

describe('renderPasswordResetEmail', () => {
  it('тема, ссылка — в HTML-кнопке и в текстовой версии, срок 1 час', () => {
    const link = 'onbike://auth/reset/abc_DEF-123';
    const mail = renderPasswordResetEmail({ link });
    expect(mail.subject).toBe('Восстановление пароля');
    expect(mail.text).toContain(link);
    expect(mail.html).toContain(`href="${link}"`);
    expect(mail.html).toContain('Задать новый пароль');
    for (const body of [mail.text, mail.html]) {
      expect(body).toContain('Ссылка действует 1 час.');
      expect(body).toContain(
        'Если вы не запрашивали сброс, проигнорируйте письмо — пароль не изменится.',
      );
    }
  });

  it('продукт назван брендом «Покатим» (внутреннее имя on-bike в письме не видно)', () => {
    const mail = renderPasswordResetEmail({ link: 'https://example.test/auth/reset/abc' });
    for (const body of [mail.text, mail.html]) {
      expect(body).toContain('«Покатим»');
      expect(body).not.toMatch(/on-?bike/i);
    }
  });

  it('экранирует HTML в ссылке', () => {
    const mail = renderPasswordResetEmail({ link: 'exp://host/--/"><script>x</script>' });
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).toContain('&quot;&gt;&lt;script&gt;');
  });
});
