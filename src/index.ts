// server.js
import bodyParser from "body-parser";
import express, { json } from "express";
import { existsSync, readFileSync, writeFileSync } from "fs";
import z from "zod";
import APIService from "./api-service";
import { sendToTelegram } from "./bot";
import { RawLeadDataSchema } from "./lead.dto";
import { apiMiddleware } from "./middleware";
import { escapeHtml } from "./utils";
import { LeadActionSchema, WebhookSchema } from "./webhook.dto";
import APIController from "./api-controller";

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
  async (req, res) => {
    try {
      const payload = req.body || {};
      const subdomain = payload.account.subdomain;
      const actions = payload.leads.add ?? [];

      const messages = [];

      if (!Array.isArray(actions) || actions.length === 0) {
        const short = JSON.stringify({ message: "Нет данных" }, null, 2);
        messages.push(`<b>Новый вебхук:</b>\n<pre>${escapeHtml(short)}</pre>`);
      } else {
        const controller = new APIController(subdomain);
        for (const action of actions) {
          const leadId = action.id;
          const lead = await controller.getLead(leadId);
          if (!lead) {
            continue;
          }
          const lastCatalogElement = lead._embedded.catalogElements.at(-1)       
        }
      }

      for (const chatId of subscribers) {
        for (const message of messages) {
          try {
            const res = await sendToTelegram(chatId, message);
            if (!res.ok) {
              throw new Error(res.description);
            }
          } catch (err) {
            if (err instanceof Error) {
              console.error(
                `Ошибка при отправке в Telegram (${chatId}):`,
                err.message
              );
            } else {
              console.log("Неизвестная ошибка", err);
            }
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
  }
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

    for (const chatId of subscribers) {
      for (const message of messages) {
        try {
          const res = await sendToTelegram(chatId, message);
          if (!res.ok) {
            throw new Error(res.description);
          }
        } catch (err) {
          if (err instanceof Error) {
            console.error(
              `Ошибка при отправке в Telegram (${chatId}):`,
              err.message
            );
          } else {
            console.log("Неизвестная ошибка", err);
          }
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
      await sendToTelegram(chatId, "Вы подписаны на уведомления ✅");
    }

    if (text === "/stop") {
      subscribers.delete(chatId);
      saveSubscribers();
      await sendToTelegram(chatId, "Вы отписались от уведомлений ❌");
    }
  }

  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));