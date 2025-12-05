import dotenv from "dotenv";
import nodemailer, { Transporter } from "nodemailer";

dotenv.config();

class EmailLoggerService {
  private transporter: Transporter;
  private readonly smtpHost: string;
  private readonly smtpPort: number;
  private readonly smtpUser: string;
  private readonly smtpPass: string;

  constructor() {
    const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
    const parsedPort = Number(SMTP_PORT);

    if (
      !SMTP_HOST ||
      !SMTP_USER ||
      !SMTP_PASS ||
      !Number.isFinite(parsedPort)
    ) {
      const error =
        "Отсутствуют или некорректны SMTP_HOST/SMTP_PORT/SMTP_USER/SMTP_PASS";
      console.error(`[EmailLogger] ${error}`);
      throw new Error(error);
    }

    this.smtpHost = SMTP_HOST;
    this.smtpPort = parsedPort;
    this.smtpUser = SMTP_USER;
    this.smtpPass = SMTP_PASS;

    this.transporter = nodemailer.createTransport({
      host: this.smtpHost,
      port: this.smtpPort,
      secure: this.smtpPort === 465,
      auth: {
        user: this.smtpUser,
        pass: this.smtpPass,
      },
    });
  }

  async logError(message: string) {
    return this.sendEmail("Error Notification", message);
  }

  async logSuccess(message: string) {
    return this.sendEmail("Success Notification", message);
  }

  async logInfo(message: string) {
    return this.sendEmail("Info Notification", message);
  }

  private async sendEmail(subject: string, message: string) {
    const mailOptions = {
      from: this.smtpUser,
      to: this.smtpUser,
      subject,
      text: message,
      html: this.buildHtmlTemplate(subject, message),
    };

    try {
      await this.transporter.sendMail(mailOptions);
      return true;
    } catch (error) {
      console.error(`[EmailLogger] Failed to send "${subject}" email`, error);
      return false;
    }
  }

  private buildHtmlTemplate(subject: string, message: string) {
    const timestamp = new Date().toLocaleString();
    const formattedMessage = message
      .split(/\n\s*/)
      .map(
        (line) =>
          `<p style="margin: 0 0 12px; color: #1b1e27;">${this.escapeHtml(
            line
          )}</p>`
      )
      .join("");

    return `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta http-equiv="X-UA-Compatible" content="IE=edge" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>${this.escapeHtml(subject)}</title>
        </head>
        <body style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f6f8fb; margin: 0; padding: 24px;">
          <table role="presentation" style="max-width: 640px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 6px 18px rgba(0,0,0,0.08); padding: 32px;">
            <tr>
              <td>
                <p style="text-transform: uppercase; letter-spacing: 0.08em; font-size: 12px; color: #8992a3; margin: 0 0 8px;">${timestamp}</p>
                <h1 style="margin: 0 0 16px; font-size: 22px; color: #0f172a;">${this.escapeHtml(
                  subject
                )}</h1>
                <div style="line-height: 1.5;">${formattedMessage}</div>
                <div style="margin-top: 24px; font-size: 13px; color: #6b7280;">
                  <p style="margin: 0 0 4px;">This email was generated automatically by the webhook logger.</p>
                  <p style="margin: 0;">If delivery issues persist, please check SMTP credentials and network connectivity.</p>
                </div>
              </td>
            </tr>
          </table>
        </body>
      </html>`;
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
}

export default new EmailLoggerService();
