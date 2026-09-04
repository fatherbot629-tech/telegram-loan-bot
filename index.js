const http = require("http");

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN is missing!");
  process.exit(1);
}

const telegramUrl =
  `https://api.telegram.org/bot${BOT_TOKEN}`;

async function telegram(method, body = {}) {
  const response = await fetch(`${telegramUrl}/${method}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return response.json();
}

let offset = 0;

async function pollTelegram() {
  try {
    const result = await telegram("getUpdates", {
      offset,
      timeout: 30
    });

    if (result.ok) {
      for (const update of result.result) {
        offset = update.update_id + 1;

        const message = update.message;

        if (!message || !message.text) continue;

        const chatId = message.chat.id;
        const text = message.text;

        if (text === "/start") {
          await telegram("sendMessage", {
            chat_id: chatId,
            text: "Welcome! Your Telegram bot is connected."
          });
        }
      }
    }
  } catch (error) {
    console.error("Telegram error:", error.message);
  }

  pollTelegram();
}

const server = http.createServer((req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8"
  });

  res.end("Telegram loan bot backend is running.");
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Telegram bot starting...");
  pollTelegram();
});