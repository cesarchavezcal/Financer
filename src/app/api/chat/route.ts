import { MockLanguageModelV3 } from "ai/test";
import { streamText } from "ai";
import { interpretMessage } from "@/lib/interpreter";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1]?.content || "";

    const interpreted = interpretMessage(lastMessage);
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;

    let model;

    if (interpreted) {
      model = new MockLanguageModelV3({
        doStream: async () => ({
          stream: new ReadableStream({
            async start(controller) {
              const words = interpreted.split(" ");
              let index = 0;
              for (const word of words) {
                controller.enqueue({ type: "text-delta", id: `part-${index++}`, delta: word + " " });
                await new Promise((resolve) => setTimeout(resolve, 80));
              }
              controller.close();
            },
          }),
          rawCall: { rawPrompt: null, rawSettings: {} },
        }),
      });
    } else if (apiKey && apiKey !== "your_gemini_api_key_here") {
      const googleProvider = createGoogleGenerativeAI({ apiKey });
      model = googleProvider("gemini-1.5-flash");
    } else {
      model = new MockLanguageModelV3({
        doStream: async () => {
          const textDelta = `Mock Echo: "${lastMessage}"\n\nThis is a simulated AI response streaming live from your local server using Vercel AI SDK's Mock Language Model. No LLM API keys are required to run this sandbox!`;
          return {
            stream: new ReadableStream({
              async start(controller) {
                const words = textDelta.split(" ");
                let index = 0;
                for (const word of words) {
                  controller.enqueue({ type: "text-delta", id: `part-${index++}`, delta: word + " " });
                  await new Promise((resolve) => setTimeout(resolve, 80));
                }
                controller.close();
              },
            }),
            rawCall: { rawPrompt: null, rawSettings: {} },
          };
        },
      });
    }

    const result = streamText({
      model,
      messages,
      system: "You are a helpful financial assistant.",
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
