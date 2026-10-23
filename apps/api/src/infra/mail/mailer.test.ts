import { createTransport } from 'nodemailer';
import { describe, expect, it } from 'vitest';

import { SmtpMailer } from './mailer';

describe('SmtpMailer', () => {
  it('собирает письмо с отправителем из конфига, HTML и текстовой версией', async () => {
    const sent: unknown[] = [];
    const transport = createTransport({ jsonTransport: true });
    const mailer = new SmtpMailer(
      {
        sendMail: async (options) => {
          const info = await transport.sendMail(options);
          sent.push(JSON.parse(String(info.message)));
          return info;
        },
      },
      'on-bike <no-reply@on-bike.test>',
    );

    await mailer.send({
      to: 'rider@example.com',
      subject: 'Тема',
      html: '<p>Привет</p>',
      text: 'Привет',
    });

    expect(sent).toEqual([
      expect.objectContaining({
        from: { address: 'no-reply@on-bike.test', name: 'on-bike' },
        to: [{ address: 'rider@example.com', name: '' }],
        subject: 'Тема',
        html: '<p>Привет</p>',
        text: 'Привет',
      }),
    ]);
  });
});
