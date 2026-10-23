import { describe, expect, it } from 'vitest';

import { renderVerificationEmail } from './verification-email';

describe('renderVerificationEmail', () => {
  it('ссылка — в HTML-кнопке и в текстовой версии', () => {
    const link = 'onbike://auth/verify/abc_DEF-123';
    const mail = renderVerificationEmail({ link });
    expect(mail.subject).toBe('Подтвердите e-mail');
    expect(mail.text).toContain(link);
    expect(mail.html).toContain(`href="${link}"`);
    expect(mail.text).toContain('24 часа');
  });

  it('экранирует HTML в ссылке', () => {
    const mail = renderVerificationEmail({ link: 'exp://host/--/"><script>x</script>' });
    expect(mail.html).not.toContain('<script>');
    expect(mail.html).toContain('&quot;&gt;&lt;script&gt;');
  });
});
