import { Chat } from "chat";
import { createTelegramAdapter } from "@chat-adapter/telegram";
import { createMemoryState } from "@chat-adapter/state-memory";
import { classifyTransaction } from "./classifier";
import { insertMovements } from "./supabase";

export const bot = new Chat({
  userName: process.env.TELEGRAM_BOT_USERNAME || "financer_bot",
  adapters: {
    telegram: createTelegramAdapter({
      botToken: process.env.TELEGRAM_BOT_TOKEN,
      secretToken: process.env.TELEGRAM_WEBHOOK_SECRET,
    }),
  },
  state: createMemoryState(),
});

async function handleIncomingMessage(thread: any, message: any) {
  const text = message.text || "";
  if (!text.trim()) return;

  try {
    const classification = await classifyTransaction(text);

    if (classification.isTransaction && classification.transactions.length > 0) {
      // Save to Supabase DB
      await insertMovements(classification.transactions, {
        chatId: thread.id,
        rawMessage: text,
      });

      const replyText = `✅ **${classification.transactions.length} Transactions Classified!**\n\n\`\`\`json\n${JSON.stringify(classification.transactions, null, 2)}\n\`\`\``;
      await thread.post(replyText);
    } else {
      const fallbackText = `⚠️ Lo siento, solo puedo procesar y registrar transacciones financieras. Por favor envía mensajes como "Jitomate 5" o "Gaste $10 en gasolina".`;
      await thread.post(fallbackText);
    }
  } catch (error: any) {
    console.error("Error processing message in bot handler:", error);
    try {
      await thread.post(`❌ Error processing message: ${error.message || String(error)}`);
    } catch (sendErr) {
      console.error("Failed to post error message back to thread:", sendErr);
    }
  }
}

// Bind handlers to cover private chats, group mentions, and subscribed threads
bot.onDirectMessage(handleIncomingMessage);
bot.onNewMention(handleIncomingMessage);
bot.onSubscribedMessage(handleIncomingMessage);
