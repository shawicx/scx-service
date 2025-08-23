import { MailerOptions } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { registerAs } from '@nestjs/config';
import { join } from 'path';

export default registerAs(
  'mail',
  (): MailerOptions => ({
    transport: {
      host: process.env.MAIL_HOST,
      port: Number(process.env.MAIL_PORT),
      secure: process.env.MAIL_SECURE === 'true', // SSL
      // 调试与日志
      logger: process.env.MAIL_LOGGER === 'true',
      debug: process.env.MAIL_DEBUG === 'true',
      // TLS/STARTTLS
      requireTLS: process.env.MAIL_REQUIRE_TLS === 'true',
      tls: {
        // 仅在排障时设置为 false，生产请保持默认
        rejectUnauthorized:
          process.env.MAIL_TLS_REJECT_UNAUTHORIZED === 'false' ? false : undefined,
        minVersion: 'TLSv1.2',
      },
      // 超时设置（单位：毫秒）
      connectionTimeout: process.env.MAIL_CONNECTION_TIMEOUT
        ? Number(process.env.MAIL_CONNECTION_TIMEOUT)
        : undefined,
      greetingTimeout: process.env.MAIL_GREETING_TIMEOUT
        ? Number(process.env.MAIL_GREETING_TIMEOUT)
        : undefined,
      socketTimeout: process.env.MAIL_SOCKET_TIMEOUT
        ? Number(process.env.MAIL_SOCKET_TIMEOUT)
        : undefined,
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD,
      },
    },
    defaults: {
      from: process.env.MAIL_FROM || 'noreply@example.com',
    },
    template: {
      dir: join(__dirname, '..', '..', 'templates'),
      adapter: new HandlebarsAdapter(),
      options: {
        strict: true,
      },
    },
  }),
);
