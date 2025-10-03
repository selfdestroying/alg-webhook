// server.js
import bodyParser from "body-parser";
import express, { json } from "express";
import { existsSync, readFileSync, writeFileSync } from "fs";
import webhookController from "./controllers/webhook-controller";
import { WebhookSchema } from "./dto/webhook.dto";
import { apiMiddleware } from "./middleware";
import botService from "./services/bot-service";
import { escapeHtml } from "./utils";

const app = express();
app.use(json());
app.use(bodyParser.urlencoded({ extended: true }));

const SUBSCRIBERS_FILE = "subscribers.json";

let subscribers = new Set<number>();
if (existsSync(SUBSCRIBERS_FILE)) {
  try {
    const data = JSON.parse(readFileSync(SUBSCRIBERS_FILE, "utf8"));
    subscribers = new Set(data);
  } catch (e) {
    console.error("Ошибка чтения subscribers.json:", e);
  }
}

function saveSubscribers() {
  writeFileSync(SUBSCRIBERS_FILE, JSON.stringify([...subscribers]));
}

app.post(
  "/incoming-webhook",
  apiMiddleware(WebhookSchema),
  webhookController.handleWebhook
);

app.post("/sheet-webhook", async (req, res) => {
  try {
    const payload = req.body || {};
    const messages = [];

    const changeType = payload.changeType;
    let message;
    if (changeType == "EDIT") {
      message = `<b>Строка изменена:</b>\n<pre>${escapeHtml(
        JSON.stringify(payload, null, 2)
      )}</pre>\n\n`;
    } else if (changeType == "INSERT_ROW") {
      message = `<b>Строка добавлена:</b>\n<pre>${escapeHtml(
        JSON.stringify(payload, null, 2)
      )}</pre>\n\n`;
    } else {
      message = `<b>Неизвестные данные:</b>\n<pre>${escapeHtml(
        JSON.stringify(payload, null, 2)
      )}</pre>\n\n`;
    }

    messages.push(message);

    for (const message of messages) {
      try {
        await botService.sendToTelegram(message);
      } catch (err) {
        if (err instanceof Error) {
          console.error(`Ошибка при отправке в Telegram:`, err.message);
        } else {
          console.log("Неизвестная ошибка", err);
        }
      }
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    if (err instanceof Error) {
      console.error("Ошибка обработки вебхука:", err.message);
    } else {
      console.log("Неизвестная ошибка", err);
    }
    res.status(500).json({ ok: false, error: "Server error" });
  }
});

app.post(`/webhook`, async (req, res) => {
  const update = req.body;

  if (update.message && update.message.text) {
    const chatId = update.message.chat.id;
    const text = update.message.text;

    if (text === "/start") {
      subscribers.add(chatId);
      saveSubscribers();
      await botService.sendToTelegram(chatId, "Вы подписаны на уведомления ✅");
    }

    if (text === "/stop") {
      subscribers.delete(chatId);
      saveSubscribers();
      await botService.sendToTelegram(
        chatId,
        "Вы отписались от уведомлений ❌"
      );
    }
  }

  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));
