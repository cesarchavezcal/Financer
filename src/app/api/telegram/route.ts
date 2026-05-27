import { after } from "next/server";
import { bot } from "../../../lib/bot";

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
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return Response.json({ success: false, error: errorMessage }, { status: 500 });
    }
  }

  return Response.json({
    message: "Telegram Bot webhook handler is active.",
    setupInstructions: "To set up the webhook, hit this endpoint with ?setup=true from your deployed URL.",
  });
}

export async function POST(req: Request) {
  try {
    return await bot.webhooks.telegram(req, {
      waitUntil: (promise) => {
        after(() => promise);
      },
    });
  } catch (error: unknown) {
    console.error("Telegram Webhook Error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Return 200 OK so Telegram doesn't retry failed webhook deliveries indefinitely
    return Response.json({ ok: false, error: errorMessage }, { status: 200 });
  }
}
