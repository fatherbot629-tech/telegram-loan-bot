const http = require("http");
const https = require("https");

const PORT = process.env.PORT || 10000;
const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.error("BOT_TOKEN is missing!");
  process.exit(1);
}

let users = {};

function telegram(method, data) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(data);

    const req = https.request(
      {
        hostname: "api.telegram.org",
        path: `/bot${BOT_TOKEN}/${method}`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(postData)
        }
      },
      (res) => {
        let body = "";

        res.on("data", (chunk) => {
          body += chunk;
        });

        res.on("end", () => {
          try {
            resolve(JSON.parse(body));
          } catch (err) {
            reject(err);
          }
        });
      }
    );

    req.on("error", reject);
    req.write(postData);
    req.end();
  });
}

async function sendMessage(chatId, text, keyboard = null) {
  const data = {
    chat_id: chatId,
    text: text
  };

  if (keyboard) {
    data.reply_markup = keyboard;
  }

  return telegram("sendMessage", data);
}

async function handleMessage(message) {
  if (!message || !message.chat) return;

  const chatId = message.chat.id;
  const text = message.text || "";

  if (!users[chatId]) {
    users[chatId] = {
      step: "none"
    };
  }

  // START
  if (text === "/start") {
    users[chatId] = {
      step: "phone",
      phone: "",
      loanAmount: "",
      loanDuration: "",
      employmentStatus: "",
      repaymentDuration: ""
    };

    await sendMessage(
      chatId,
      "Welcome to Thor Loan Verification Bot. 👋\n\n" +
      "Let's collect your loan application details.\n\n" +
      "📱 Please enter your phone number.",
      {
        keyboard: [
          [
            {
              text: "📱 Share Phone Number",
              request_contact: true
            }
          ]
        ],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    );

    return;
  }

  const user = users[chatId];

  // PHONE NUMBER
  if (user.step === "phone") {
    if (message.contact) {
      user.phone = message.contact.phone_number;
    } else {
      user.phone = text;
    }

    user.step = "loanAmount";

    await sendMessage(
      chatId,
      "✅ Phone number received.\n\n" +
      "💰 How much loan do you need?\n\n" +
      "Example: 50,000",
      {
        remove_keyboard: true
      }
    );

    return;
  }

  // LOAN AMOUNT
  if (user.step === "loanAmount") {
    if (!text) return;

    user.loanAmount = text;
    user.step = "loanDuration";

    await sendMessage(
      chatId,
      "✅ Loan amount received.\n\n" +
      "📅 What is the duration of the loan?\n\n" +
      "Example: 12 months"
    );

    return;
  }

  // LOAN DURATION
  if (user.step === "loanDuration") {
    user.loanDuration = text;
    user.step = "employmentStatus";

    await sendMessage(
      chatId,
      "✅ Loan duration received.\n\n" +
      "💼 What is your employment status?",
      {
        keyboard: [
          [{ text: "Employed" }],
          [{ text: "Self-employed" }],
          [{ text: "Business owner" }],
          [{ text: "Unemployed" }],
          [{ text: "Other" }]
        ],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    );

    return;
  }

  // EMPLOYMENT STATUS
  if (user.step === "employmentStatus") {
    user.employmentStatus = text;
    user.step = "repaymentDuration";

    await sendMessage(
      chatId,
      "✅ Employment status received.\n\n" +
      "💳 What repayment duration do you prefer?\n\n" +
      "Example: 6 months, 12 months, 24 months.",
      {
        remove_keyboard: true
      }
    );

    return;
  }

  // REPAYMENT DURATION
  if (user.step === "repaymentDuration") {
    user.repaymentDuration = text;
    user.step = "confirmation";

    await sendMessage(
      chatId,
      "✅ Repayment duration received.\n\n" +
      "📋 Your loan application:\n\n" +
      `📱 Phone: ${user.phone}\n` +
      `💰 Loan amount: ${user.loanAmount}\n` +
      `📅 Loan duration: ${user.loanDuration}\n` +
      `💼 Employment status: ${user.employmentStatus}\n` +
      `💳 Repayment duration: ${user.repaymentDuration}\n\n` +
      "Is this information correct?",
      {
        keyboard: [
          [{ text: "✅ Yes, Submit" }],
          [{ text: "❌ Start Again" }]
        ],
        resize_keyboard: true,
        one_time_keyboard: true
      }
    );

    return;
  }

  // CONFIRMATION
  if (user.step === "confirmation") {
    if (text === "❌ Start Again") {
      users[chatId] = {
        step: "phone",
        phone: "",
        loanAmount: "",
        loanDuration: "",
        employmentStatus: "",
        repaymentDuration: ""
      };

      await sendMessage(
        chatId,
        "Let's start again. 🔄\n\nPlease enter your phone number.",
        {
          remove_keyboard: true
        }
      );

      return;
    }

    if (text === "✅ Yes, Submit") {
      console.log("NEW LOAN APPLICATION:");
      console.log({
        chatId,
        phone: user.phone,
        loanAmount: user.loanAmount,
        loanDuration: user.loanDuration,
        employmentStatus: user.employmentStatus,
        repaymentDuration: user.repaymentDuration
      });

      await sendMessage(
        chatId,
        "🎉 Your loan application has been submitted successfully!\n\n" +
        "Our team will review your information and contact you.",
        {
          remove_keyboard: true
        }
      );

      user.step = "submitted";

      return;
    }
  }
}

// Telegram webhook
async function processUpdate(update) {
  try {
    if (update.message) {
      await handleMessage(update.message);
    }
  } catch (error) {
    console.error("Bot error:", error);
  }
}

// HTTP server for Render
const server = http.createServer((req, res) => {
  if (req.method === "POST") {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk;
    });

    req.on("end", async () => {
      try {
        const update = JSON.parse(body);
        await processUpdate(update);
      } catch (error) {
        console.error(error);
      }

      res.writeHead(200);
      res.end("OK");
    });

    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/plain"
  });

  res.end("Telegram loan bot is running.");
});

server.listen(PORT, "0.0.0.0", async () => {
  console.log(`Server running on port ${PORT}`);
  console.log("Telegram bot starting...");

  // Tell Telegram where to send messages
  const webhookUrl =
    `https://telegram-loan-bot-5.onrender.com/telegram-webhook`;

  const result = await telegram("setWebhook", {
    url: webhookUrl
  });

  console.log("Webhook result:", result);
  console.log("Telegram bot is live 🎉");
});