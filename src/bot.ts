const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("Не задан BOT_TOKEN или CRM_TOKEN");
  process.exit(1);
}

const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

// Отправка сообщения в чат
export async function sendToTelegram(
  chatId: number,
  text: string,
  parseMode = "HTML"
) {
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
