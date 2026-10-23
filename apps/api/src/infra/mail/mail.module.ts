import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';

import { ENV, type Env } from '../../config/env';
import { MAILER, SmtpMailer } from './mailer';

const SMTP_TRANSPORT = Symbol('SMTP_TRANSPORT');

@Global()
@Module({
  providers: [
    {
      provide: SMTP_TRANSPORT,
      inject: [ENV],
      // короткие таймауты: зависший SMTP не держит задачу минутами (умолчания nodemailer — 2–10 мин)
      useFactory: (env: Env) =>
        createTransport({
          url: env.SMTP_URL,
          connectionTimeout: 10_000,
          greetingTimeout: 10_000,
          socketTimeout: 15_000,
        }),
    },
    {
      provide: MAILER,
      inject: [SMTP_TRANSPORT, ENV],
      useFactory: (transport: Transporter, env: Env) => new SmtpMailer(transport, env.MAIL_FROM),
    },
  ],
  exports: [MAILER],
})
export class MailModule implements OnApplicationShutdown {
  constructor(@Inject(SMTP_TRANSPORT) private readonly transport: Transporter) {}

  onApplicationShutdown(): void {
    this.transport.close();
  }
}
