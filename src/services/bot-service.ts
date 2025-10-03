import dotenv from "dotenv";
import { existsSync, readFileSync } from "fs";
dotenv.config({ debug: true, path: [".env"], encoding: "UTF-8" });

class BotApi {
  private BOT_TOKEN: string;
  private TELEGRAM_API: string;
  private SUBSCRIBERS_FILE = "subscribers.json";
  private SUBSCRIBERS: Set<number>;

  constructor() {
    const token = process.env.BOT_TOKEN;
    if (!token) {
      throw new Error("Не задан BOT_TOKEN");
    }
    this.BOT_TOKEN = token;
    this.TELEGRAM_API = `https://api.telegram.org/bot${token}`;

    this.SUBSCRIBERS = new Set<number>();
    if (existsSync(this.SUBSCRIBERS_FILE)) {
      const data = JSON.parse(readFileSync(this.SUBSCRIBERS_FILE, "utf8"));
      this.SUBSCRIBERS = new Set(data);
    }
  }
  async sendToTelegram(text: string, parseMode = "HTML") {
    const url = `${this.TELEGRAM_API}/sendMessage`;
    for (const chatId of this.SUBSCRIBERS) {
      const payload = { chat_id: chatId, text, parse_mode: parseMode };

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          throw new Error(
            JSON.stringify(
              {
                chatId,
                status: res.status,
                statusText: res.statusText,
                body: res.body,
              },
              null,
              2
            )
          );
        }
      } catch (error) {
        console.error(`Ошибка отправки:`, { text, error });
      }
    }
  }
}

export default new BotApi();
