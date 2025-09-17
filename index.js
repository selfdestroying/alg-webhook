// server.js
import bodyParser from "body-parser";
import dotenv from "dotenv";
import express, { json } from "express";
import { appendFileSync, existsSync, readFileSync, writeFileSync } from "fs";
dotenv.config({ debug: true, path: [".env"], encoding: "UTF-8" });

const app = express();
app.use(json());
app.use(bodyParser.urlencoded({ extended: true }));

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error("Не задан BOT_TOKEN");
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

app.post("/incoming-webhook", async (req, res) => {
  try {
    let payload = req.body;

    if (!payload || Object.keys(payload).length === 0) {
      payload = {};
    }

    const logEntry = {
      receivedAt: new Date().toISOString(),
      headers: req.headers,
      body: payload,
    };
    appendFileSync(LOG_FILE, JSON.stringify(logEntry) + "\n");

    const short = JSON.stringify(payload, null, 2);
    const message = `<b>Новый вебхук:</b>\n<pre>${escapeHtml(short)}</pre>`;

    let sent = 0;
    for (const chatId of subscribers) {
      await sendToTelegram(chatId, message);
      sent++;
    }

    res.status(200).json({ ok: true, sent });
  } catch (err) {
    console.error("Error handling webhook:", err);
    res.status(500).send("Server error");
  }
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
