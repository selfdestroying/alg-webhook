// server.js
import bodyParser from "body-parser";
import dotenv from "dotenv";
import express, { json } from "express";
import { existsSync, readFileSync, writeFileSync } from "fs";
dotenv.config({ debug: true, path: [".env"], encoding: "UTF-8" });

const app = express();
app.use(json());
app.use(bodyParser.urlencoded({ extended: true }));

const BOT_TOKEN = process.env.BOT_TOKEN;
const CRM_TOKEN = process.env.CRM_TOKEN;

if (!BOT_TOKEN) {
  console.error("Не задан BOT_TOKEN или CRM_TOKEN");
  process.exit(1);
}

const LOG_FILE = "webhooks.log";

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;
const SUBSCRIBERS_FILE = "subscribers.json";

// Загружаем подписчиков из файла
let subscribers = new Set();
if (existsSync(SUBSCRIBERS_FILE)) {
  try {
    const data = JSON.parse(readFileSync(SUBSCRIBERS_FILE, "utf8"));
    subscribers = new Set(data);
  } catch (e) {
    console.error("Ошибка чтения subscribers.json:", e);
  }
}

// Сохраняем подписчиков в файл
function saveSubscribers() {
  writeFileSync(SUBSCRIBERS_FILE, JSON.stringify([...subscribers]));
}

// Отправка сообщения в чат
async function sendToTelegram(chatId, text, parseMode = "HTML") {
  const url = `${TELEGRAM_API}/sendMessage`;
  const payload = { chat_id: chatId, text, parse_mode: parseMode };

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err) {
    console.error("Ошибка отправки:", err);
    return null;
  }
}

async function fetchLead(subdomain, leadId) {
  if (!subdomain || !leadId) {
    throw new Error("Некорректные аргументы: subdomain или leadId пустые");
  }

  const url = `https://${encodeURIComponent(
    subdomain
  )}.amocrm.ru/api/v4/leads/${encodeURIComponent(
    leadId
  )}?with=catalog_elements`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${CRM_TOKEN}`,
      },
      redirect: "follow",
    });

    if (!res.ok) {
      throw new Error(`CRM API вернул ${res.status}: ${res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    console.error("Ошибка при получении лида:", err.message);
    return null; // чтобы обработать выше
  }
}

// Хэндлер вебхука
app.post("/incoming-webhook", async (req, res) => {
  try {
    const payload = req.body || {};

    // Безопасно достаем данные
    const subdomain = payload?.account?.subdomain;
    const actions = payload?.leads?.add ?? [];

    const messages = [];

    if (!Array.isArray(actions) || actions.length === 0) {
      const short = JSON.stringify({ message: "Нет данных" }, null, 2);
      messages.push(`<b>Новый вебхук:</b>\n<pre>${escapeHtml(short)}</pre>`);
    } else {
      for (const action of actions) {
        const leadId = action?.id;
        if (!leadId) continue;

        const lead = await fetchLead(subdomain, leadId);
        if (!lead) continue; // если запрос упал — пропускаем

        const short = JSON.stringify(lead, null, 2);
        const message = `<b>Новый вебхук:</b>\n<pre>${escapeHtml(short)}</pre>`;
        messages.push(message);
      }
    }

    for (const chatId of subscribers) {
      for (const message of messages) {
        try {
          await sendToTelegram(chatId, message);
        } catch (err) {
          console.error(
            `Ошибка при отправке в Telegram (${chatId}):`,
            err.message
          );
        }
      }
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    console.error("Ошибка обработки вебхука:", err.message);
    res.status(500).json({ ok: false, error: "Server error" });
  }
});
// Вебхук от Telegram
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

// Функция для экранирования HTML
function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));
