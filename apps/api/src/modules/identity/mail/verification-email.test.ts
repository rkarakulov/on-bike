import { describe, expect, it } from 'vitest';

import { renderVerificationEmail } from './verification-email';

describe('renderVerificationEmail', () => {
  it('ссылка — в HTML-кнопке и в текстовой версии', () => {
    const link = 'pokatim://auth/verify/abc_DEF-123';
    const mail = renderVerificationEmail({ link });
    expect(mail.subject).toBe('Подтвердите e-mail');
    expect(mail.text).toContain(link);
    expect(mail.html).toContain(`href="${link}"`);
    expect(mail.text).toContain('24 часа');
  });

  it('продукт назван брендом «Покатим» (внутреннее имя pokatim в письме не видно)', () => {
    const mail = renderVerificationEmail({ link: 'https://example.test/auth/verify/abc' });
    for (const body of [mail.text, mail.html]) {
      expect(body).toContain('регистрацию в «Покатим»');
      expect(body).not.toMatch(/pokatim|on-?bike/i);
    }
  });

  it('экранирует HTML в ссылке', () => {
    const mail = renderVerificationEmail({ link: 'exp://host/--/"><script>x</script>' });
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).toContain('&quot;&gt;&lt;script&gt;');
  });
});
