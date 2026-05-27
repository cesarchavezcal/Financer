import { MockLanguageModelV3 } from "ai/test";
import { streamText } from "ai";
import { classifyTransaction } from "@/lib/classifier";
import { insertMovements } from "@/lib/supabase";

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const lastMessage = messages[messages.length - 1]?.content || "";

    // Run the classification LLM middleware
    const classification = await classifyTransaction(lastMessage);

    // Save transactions to Supabase DB if any were parsed
    if (classification.isTransaction && classification.transactions.length > 0) {
      await insertMovements(classification.transactions, {
        chatId: "web-ui",
        rawMessage: lastMessage,
      });
    }

    const responseText = classification.isTransaction
      ? `✅ **${classification.transactions.length} Transactions Classified!**\n\n\`\`\`json\n${JSON.stringify(classification.transactions, null, 2)}\n\`\`\``
      : `⚠️ Lo siento, solo puedo procesar y registrar transacciones financieras. Por favor envía mensajes como "Jitomate 5" o "Gaste $10 en gasolina".`;

    const model = new MockLanguageModelV3({
      doStream: async () => ({
        stream: new ReadableStream({
          async start(controller) {
            const words = responseText.split(" ");
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

    const result = streamText({
      model,
      messages,
      system: "You are a helpful financial assistant.",
    });

    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    console.error("Chat API error:", error);
    const errorMessage = error instanceof Error ? error.message : "An error occurred during chat generation.";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
