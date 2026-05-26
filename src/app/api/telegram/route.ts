import { interpretMessage } from "@/lib/interpreter";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText } from "ai";
import { classifyTransaction } from "@/lib/classifier";

export const maxDuration = 30;

export async function GET(req: Request) {
  // Can be used to verify the webhook status or set up the webhook
  const { searchParams } = new URL(req.url);
  const setup = searchParams.get("setup");
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const appUrl = `${proto}://${host}`;

  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (setup === "true") {
    if (!botToken || botToken === "your_telegram_bot_token_here") {
      return Response.json({ error: "TELEGRAM_BOT_TOKEN is not set" }, { status: 400 });
    }

    const secret = process.env.TELEGRAM_WEBHOOK_SECRET || "";
    const webhookUrl = `${appUrl}/api/telegram`;

    try {
      const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: webhookUrl,
          secret_token: secret || undefined,
        }),
      });

      const data = await response.json();
      return Response.json({ success: true, webhookUrl, telegramResponse: data });
    } catch (err: any) {
      return Response.json({ success: false, error: err.message }, { status: 500 });
    }
  }

  return Response.json({
    message: "Telegram Bot webhook handler is active.",
    setupInstructions: "To set up the webhook, hit this endpoint with ?setup=true from your deployed URL.",
  });
}

export async function POST(req: Request) {
  try {
    // Optional: verify Telegram secret token to prevent unauthorized access
    const secretHeader = req.headers.get("x-telegram-bot-api-secret-token");
    const configuredSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

    if (configuredSecret && configuredSecret !== "your_telegram_webhook_secret_here" && secretHeader !== configuredSecret) {
      return new Response("Unauthorized", { status: 403 });
    }

    const body = await req.json();
    console.log("Telegram webhook payload:", JSON.stringify(body));

    // Telegram sends updates. We care about the 'message' object.
    const message = body.message;
    if (!message || !message.chat || !message.chat.id) {
      return Response.json({ ok: true, status: "ignored_no_message" });
    }

    const chatId = message.chat.id;
    const text = message.text;

    if (!text) {
      return Response.json({ ok: true, status: "ignored_no_text" });
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken || botToken === "your_telegram_bot_token_here") {
      console.error("TELEGRAM_BOT_TOKEN not configured");
      return Response.json({ ok: true, status: "bot_token_missing" });
    }

    // Run the classification LLM middleware
    const classification = await classifyTransaction(text);
    let replyText = "";

    if (classification.isTransaction) {
      const cleanJson = {
        category: classification.category,
        subCategory: classification.subCategory,
        product: classification.product,
        quantity: classification.quantity,
        date: classification.date,
      };
      replyText = `✅ **Transaction Classified!**\n\n\`\`\`json\n${JSON.stringify(cleanJson, null, 2)}\n\`\`\``;
    } else {
      // Fallback to conversational response
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (apiKey && apiKey !== "your_gemini_api_key_here") {
        try {
          const googleProvider = createGoogleGenerativeAI({ apiKey });
          const { text: geminiText } = await generateText({
            model: googleProvider("gemini-2.5-flash"),
            system: "You are a helpful and friendly financial AI assistant. Keep your answers concise, clear, and easy to read on mobile devices.",
            prompt: text,
          });
          replyText = geminiText;
        } catch (err: any) {
          console.error("Gemini Generation Error:", err);
          replyText = `⚠️ Error calling Gemini API: ${err.message || err}`;
        }
      } else {
        replyText = `🤖 Mock Bot Reply: You sent "${text}". Webhook is functional, but GEMINI_API_KEY is not set on Vercel yet!`;
      }
    }

    // Send the reply back to the Telegram chat
    await sendTelegramMessage(botToken, chatId, replyText);

    return Response.json({ ok: true });
  } catch (error: any) {
    console.error("Telegram Webhook Error:", error);
    // Always return 200 to Telegram so it doesn't keep retrying failed messages indefinitely
    return Response.json({ ok: false, error: error.message }, { status: 200 });
  }
}

async function sendTelegramMessage(botToken: string, chatId: number, text: string) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error("Failed to send Telegram message:", errText);
    throw new Error(`Telegram SendMessage Error: ${response.status} - ${errText}`);
  }
}
