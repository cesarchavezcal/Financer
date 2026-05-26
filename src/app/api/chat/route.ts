import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    const geminiApiKey = process.env.GEMINI_API_KEY;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    let model;

    if (geminiApiKey && geminiApiKey !== "your_gemini_api_key_here") {
      model = google("gemini-1.5-flash");
    } else if (openaiApiKey && openaiApiKey !== "your_openai_api_key_here") {
      model = openai("gpt-4o-mini");
    } else {
      // Fallback to mock text or throw a descriptive error
      return new Response(
        JSON.stringify({
          error: "No API keys configured. Please configure GEMINI_API_KEY or OPENAI_API_KEY in your .env.local file.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const result = streamText({
      model,
      messages,
      system: "You are a helpful and friendly financial AI assistant inside Financer. Keep your answers concise, clear, and professional.",
    });

    return result.toUIMessageStreamResponse();
  } catch (error: any) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "An error occurred during chat generation." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
