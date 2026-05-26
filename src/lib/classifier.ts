import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";

// Define the transaction schema based on the user's requirements
export const TransactionSchema = z.object({
  isTransaction: z.boolean().describe("Whether this message is a financial transaction (expense/income) or just general chat"),
  type: z.enum(["expense", "income"]).describe("Whether this is an expense (gasto) or income (ingreso)"),
  amount: z.number().describe("The monetary value of the transaction"),
  category: z.string().describe("The main category, starting with a suitable emoji (e.g., '🍎 Dieta', '🚗 Transporte', '📈 Salario')"),
  subCategory: z.string().describe("The subcategory, starting with a suitable emoji (e.g., '🍓 frutas', '⛽ gasolina', '💻 bonos')"),
  product: z.string().describe("The specific item or service, starting with a suitable emoji (e.g., '🍎 manzana', '☕ café')"),
  quantity: z.number().describe("The quantity purchased (default is 1 if not specified)"),
  date: z.string().describe("The date of the transaction in YYYY-MM-DD format. If not specified, default to today's date."),
});

export type Transaction = z.infer<typeof TransactionSchema>;

/**
 * Classifies an incoming message into a structured financial transaction.
 * Falls back to a mock response if no Gemini API Key is configured.
 */
export async function classifyTransaction(text: string): Promise<Transaction> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const today = new Date().toISOString().split("T")[0];

  const isMockTransaction = text.toLowerCase().includes("manzana") || text.toLowerCase().includes("$") || /\d/.test(text);

  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    console.warn("Using mock classification because Gemini API Key is missing.");
    return {
      isTransaction: isMockTransaction,
      type: "expense",
      amount: 5,
      category: "🍎 Dieta",
      subCategory: "🍓 frutas",
      product: "🍎 manzana",
      quantity: 1,
      date: today,
    };
  }

  try {
    const googleProvider = createGoogleGenerativeAI({ apiKey });
    const { object } = await generateObject({
      model: googleProvider("gemini-2.5-flash"),
      schema: TransactionSchema,
      prompt: `Analyze the following message and extract the transaction details.
Today's date is: ${today}.

Message: "${text}"`,
    });

    return object;
  } catch (error) {
    console.error("Error in classifyTransaction:", error);
    // Return fallback transaction if LLM classification fails
    return {
      isTransaction: true,
      type: "expense",
      amount: 0,
      category: "❓ Desconocido",
      subCategory: "❓ Desconocido",
      product: `❓ ${text}`,
      quantity: 1,
      date: today,
    };
  }
}
