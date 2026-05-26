import { MockLanguageModelV3 } from "ai/test";
import { streamText } from "ai";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1]?.content || "";

    const model = new MockLanguageModelV3({
      doStream: async () => {
        const textDelta1 = `Mock Echo: "${lastMessage}"\n\n`;
        const textDelta2 = `This is a simulated AI response streaming live from your local server using Vercel AI SDK's Mock Language Model. No LLM API keys are required to run this sandbox!`;

        return {
          stream: new ReadableStream({
            async start(controller) {
              controller.enqueue({ type: "text-delta", id: "part-0", delta: textDelta1 });
              await new Promise((resolve) => setTimeout(resolve, 300));
              
              // Stream the rest word by word
              const words = textDelta2.split(" ");
              let index = 1;
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
