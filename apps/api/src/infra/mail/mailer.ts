import type { Transporter } from 'nodemailer';

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

/** Отправка письма; вызывается только из задач worker, не из HTTP-обработчиков. */
export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

export const MAILER = Symbol('MAILER');

/** SMTP через nodemailer: в dev — Mailpit (`smtp://127.0.0.1:1025`). */
export class SmtpMailer implements Mailer {
  constructor(
    private readonly transport: Pick<Transporter, 'sendMail'>,
    private readonly from: string,
  ) {}

  async send({ to, subject, html, text }: MailMessage): Promise<void> {
    await this.transport.sendMail({ from: this.from, to, subject, html, text });
  }
}
