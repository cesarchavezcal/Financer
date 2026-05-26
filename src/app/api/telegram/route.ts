import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

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

    // Determine model
    const geminiApiKey = process.env.GEMINI_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;
    let model;

    if (geminiApiKey && geminiApiKey !== "your_gemini_api_key_here") {
      model = google("gemini-1.5-flash");
    } else if (openaiApiKey && openaiApiKey !== "your_openai_api_key_here") {
      model = openai("gpt-4o-mini");
    } else {
      // Fallback response if no model is configured
      await sendTelegramMessage(botToken, chatId, "Sorry, I am currently misconfigured (missing LLM API keys). Please configure GEMINI_API_KEY or OPENAI_API_KEY.");
      return Response.json({ ok: true, status: "api_key_missing" });
    }

    // Run AI SDK text generation
    const { text: replyText } = await generateText({
      model,
      system: "You are a helpful and friendly financial AI assistant inside Telegram. Keep your answers concise, clear, and easy to read on mobile devices.",
      prompt: text,
    });

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
