// src/services/error-email.service.ts
import nodemailer from 'nodemailer';
import { format } from 'date-fns';

interface ErrorPayload {
  error: Error | any;
  context?: string;
  userId?: string | number;
  request?: {
    method: string;
    url: string;
    ip: string;
    userAgent?: string;
  };
}

class ErrorEmailService {
  private transporter;
  private to: string;

  constructor() {
    this.to = process.env.EMAIL_ERROR_TO || process.env.SMTP_USER!;

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.yandex.ru',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true, // SSL
      auth: {
        user: process.env.SMTP_USER!,
        pass: process.env.SMTP_PASS!,
      },
    });

    // Проверка подключения при старте
    this.transporter.verify((err) => {
      if (err) {
        console.error('Ошибка подключения к SMTP Яндекса:', err.message);
      } else {
        console.log('SMTP Яндекс готов к отправке логов ошибок');
      }
    });
  }

  async sendError(payload: ErrorPayload) {
    const now = format(new Date(), 'dd.MM.yyyy HH:mm:ss');

    const subject = `Ошибка на сервере — ${process.env.NODE_ENV || 'dev'} — ${now}`;

    const html = `
      <h2 style="color:#d32f2f">Ошибка сервера</h2>
      <p><strong>Время:</strong> ${now}</p>
      <p><strong>Окружение:</strong> ${process.env.NODE_ENV || 'unknown'}</p>
      ${payload.context ? `<p><strong>Контекст:</strong> ${payload.context}</p>` : ''}
      ${payload.userId ? `<p><strong>User ID:</strong> ${payload.userId}</p>` : ''}
      
      ${payload.request ? `
        <h3>Запрос</h3>
        <ul>
          <li>Метод: ${payload.request.method}</li>
          <li>URL: ${payload.request.url}</li>
          <li>IP: ${payload.request.ip}</li>
          ${payload.request.userAgent ? `<li>User-Agent: ${payload.request.userAgent}</li>` : ''}
        </ul>
      ` : ''}

      <h3>Ошибка</h3>
      <pre style="background:#f5f5f5;padding:15px;border-radius:8px;overflow-x:auto;">
${payload.error.stack || payload.error.message || String(payload.error)}
      </pre>
    `;

    try {
      await this.transporter.sendMail({
        from: process.env.EMAIL_FROM || `"Server" <${process.env.SMTP_USER}>`,
        to: this.to,
        subject,
        html,
      });
      console.log('Лог ошибки отправлен на', this.to);
    } catch (err: any) {
      console.error('Не удалось отправить письмо с ошибкой:', err.message);
    }
  }
}

// Синглтон
export const errorEmailService = new ErrorEmailService();