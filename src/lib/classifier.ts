import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { 
  YNAB_CATEGORIES, 
  YNAB_SUBCATEGORIES, 
  KEYWORD_MAP, 
  YnabCategory, 
  YnabSubcategory 
} from "./categories";

// Define the transaction schema using YNAB enums
export const TransactionSchema = z.object({
  isTransaction: z.boolean().describe("Whether this message is a financial transaction (expense/income) or just general chat"),
  type: z.enum(["expense", "income"]).describe("Whether this is an expense (gasto) or income (ingreso)"),
  amount: z.number().describe("The monetary value of the transaction"),
  category: z.enum(YNAB_CATEGORIES).describe("Select the most appropriate YNAB main category from the allowed enum list"),
  subCategory: z.enum(YNAB_SUBCATEGORIES).describe("Select the most appropriate YNAB subcategory from the allowed enum list"),
  product: z.string().describe("The specific item or service (e.g. '🍎 manzanas', '☕ café')"),
  quantity: z.number().describe("The quantity purchased (default is 1 if not specified)"),
  date: z.string().describe("The date of the transaction in YYYY-MM-DD format. If not specified, default to today's date."),
});

export type Transaction = z.infer<typeof TransactionSchema>;

/**
 * Utility to extract amount and quantity from a text locally.
 */
function extractAmountAndQuantity(text: string): { amount: number; quantity: number } {
  // Extract amount (first number matching decimals or digits)
  const amountMatch = text.match(/\$?(\d+(?:\.\d{2})?)/);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;

  // Extract quantity (looking for x3, 3 units, or a leading quantity like "3 cafes")
  const qtyMatch = text.match(/(?:x\s*|cant:\s*|cantidad:\s*)?(\d+)\s+(?:manzana|cafe|uber|luz|taco)/i) || text.match(/(\d+)\s+unidad/i);
  const quantity = qtyMatch ? parseInt(qtyMatch[1]) : 1;

  return { amount, quantity };
}

/**
 * Classifies an incoming message into a structured financial transaction.
 * First checks the local keyword map (0 tokens cost). Falls back to Google Gemini if not found.
 */
export async function classifyTransaction(text: string): Promise<Transaction> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const today = new Date().toISOString().split("T")[0];

  // 1. LOCAL BYPASS: Scan for static keyword matches to save tokens
  const lowercaseText = text.toLowerCase();
  for (const [keyword, data] of Object.entries(KEYWORD_MAP)) {
    if (lowercaseText.includes(keyword)) {
      const { amount, quantity } = extractAmountAndQuantity(text);
      console.log(`[Local Match] Matched keyword "${keyword}". Cost: 0 tokens.`);
      return {
        isTransaction: true,
        type: data.type,
        amount,
        category: data.category,
        subCategory: data.subCategory,
        product: data.product,
        quantity,
        date: today,
      };
    }
  }

  // Determine if it looks like a transaction for the mock fallback
  const isMockTransaction = text.toLowerCase().includes("manzana") || text.toLowerCase().includes("$") || /\d/.test(text);

  // 2. MOCK FALLBACK (If no API Key configured)
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    console.warn("Using mock classification because Gemini API Key is missing.");
    return {
      isTransaction: isMockTransaction,
      type: "expense",
      amount: 5,
      category: "💳 Immediate Obligations",
      subCategory: "🛒 Groceries",
      product: "🍎 Manzanas",
      quantity: 1,
      date: today,
    };
  }

  // 3. LLM CLASSIFICATION (Calls Gemini with YNAB constraints)
  try {
    const googleProvider = createGoogleGenerativeAI({ apiKey });
    const { object } = await generateObject({
      model: googleProvider("gemini-2.5-flash"),
      schema: TransactionSchema,
      prompt: `Analyze the following user message. If it is a financial transaction (expense/income), extract it and map it to the YNAB categories.
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
      category: "💳 Immediate Obligations", // Fallback to safe standard category
      subCategory: "🛒 Groceries",
      product: `❓ ${text}`,
      quantity: 1,
      date: today,
    };
  }
}
