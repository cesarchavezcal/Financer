import { generateObject } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import { 
  YNAB_CATEGORIES, 
  YNAB_SUBCATEGORIES, 
  KEYWORD_MAP 
} from "./categories";

// Schema for a single transaction supporting expense, income, and transfers
export const TransactionSchema = z.object({
  type: z.enum(["expense", "income", "transfer"]).describe("Whether this is an expense (gasto), income (ingreso), or transfer (transferencia)"),
  amount: z.number().describe("The monetary value of the transaction"),
  category: z.enum(YNAB_CATEGORIES).describe("Select the most appropriate YNAB main category from the allowed list"),
  subCategory: z.enum(YNAB_SUBCATEGORIES).describe("Select the most appropriate YNAB subcategory from the allowed list"),
  product: z.string().describe("The specific item, account, or service (e.g. '🍎 manzanas', '💼 salario', '🏦 ahorros')"),
  quantity: z.number().describe("The quantity purchased (default is 1 if not specified)"),
  date: z.string().describe("The date of the transaction in YYYY-MM-DD format."),
});

// Schema for multiple transactions parsed at once
export const MultiTransactionSchema = z.object({
  isTransaction: z.boolean().describe("Whether any transactions were successfully parsed from the message"),
  transactions: z.array(TransactionSchema).describe("List of parsed financial transactions"),
});

export type Transaction = z.infer<typeof TransactionSchema>;

/**
 * Utility to extract amount and quantity from a single line locally.
 */
function extractAmountAndQuantity(text: string): { amount: number; quantity: number } {
  const amountMatch = text.match(/\$?(\d+(?:\.\d{2})?)/);
  const amount = amountMatch ? parseFloat(amountMatch[1]) : 0;

  const qtyMatch = text.match(/(?:x\s*|cant:\s*|cantidad:\s*)?(\d+)\s+(?:manzana|cafe|uber|luz|taco)/i) || text.match(/(\d+)\s+unidad/i);
  const quantity = qtyMatch ? parseInt(qtyMatch[1]) : 1;

  return { amount, quantity };
}

/**
 * Parses a single line locally using the static keyword map or slash commands.
 */
function parseLineLocally(line: string, today: string): Transaction | null {
  const cleanLine = line.trim();
  if (!cleanLine) return null;

  // Check if it is a command prefix
  const isIncomeCmd = cleanLine.toLowerCase().startsWith("/income");
  const isTransferCmd = cleanLine.toLowerCase().startsWith("/transfer");

  if (isIncomeCmd || isTransferCmd) {
    const type = isIncomeCmd ? "income" : "transfer";
    const textWithoutCommand = cleanLine.replace(/^\/(income|transfer)\s*/i, "").trim();

    // Extract amount and quantity
    const { amount, quantity } = extractAmountAndQuantity(textWithoutCommand);
    // Extract description (remove the amount from the text)
    const product = textWithoutCommand.replace(/\$?(\d+(?:\.\d{2})?)/, "").trim() || (isIncomeCmd ? "Ingreso" : "Transferencia");

    return {
      type,
      amount,
      category: isIncomeCmd ? "📈 Income" : "💸 Debt Payments",
      subCategory: isIncomeCmd ? "🪙 Other Income" : "💸 Transfer to/from Account",
      product: product,
      quantity,
      date: today,
    };
  }

  // Fallback to keyword dictionary matching
  const lowercaseLine = cleanLine.toLowerCase();
  for (const [keyword, data] of Object.entries(KEYWORD_MAP)) {
    if (lowercaseLine.includes(keyword)) {
      const { amount, quantity } = extractAmountAndQuantity(cleanLine);
      return {
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
  return null;
}

/**
 * Classifies an incoming message containing one or more lines into structured YNAB transactions.
 * Uses a hybrid approach: local parsing per-line where possible, and batch LLM parsing for the rest.
 */
export async function classifyTransaction(text: string): Promise<{ isTransaction: boolean; transactions: Transaction[] }> {
  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  const today = new Date().toISOString().split("T")[0];

  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  const localTransactions: Transaction[] = [];
  const unresolvedLines: string[] = [];

  // 1. Process each line locally first (handles /income, /transfer commands & keywords)
  for (const line of lines) {
    const localMatch = parseLineLocally(line, today);
    if (localMatch) {
      localTransactions.push(localMatch);
    } else {
      unresolvedLines.push(line);
    }
  }

  // If everything was parsed locally, return immediately (0 tokens cost)
  if (unresolvedLines.length === 0) {
    console.log(`[Local Match] Parsed ${localTransactions.length} lines locally. Cost: 0 tokens.`);
    return {
      isTransaction: localTransactions.length > 0,
      transactions: localTransactions,
    };
  }

  // Determine if it looks like a transaction for mock fallback
  const isMockTransaction = text.toLowerCase().includes("manzana") || text.toLowerCase().includes("$") || /\d/.test(text) || text.startsWith("/");

  // 2. Fallback Mock response if API key is missing
  if (!apiKey || apiKey === "your_gemini_api_key_here") {
    console.warn("Using mock classification because Gemini API Key is missing.");
    const mockTransactions = unresolvedLines.map(line => {
      const { amount, quantity } = extractAmountAndQuantity(line);
      return {
        type: "expense" as const,
        amount: amount || 10,
        category: "💳 Immediate Obligations" as const,
        subCategory: "🛒 Groceries" as const,
        product: line.replace(/\d+/g, "").trim() || "Grocery Item",
        quantity: quantity,
        date: today,
      };
    });

    return {
      isTransaction: isMockTransaction || localTransactions.length > 0,
      transactions: [...localTransactions, ...mockTransactions],
    };
  }

  // 3. Batch LLM parsing for unresolved lines
  try {
    const googleProvider = createGoogleGenerativeAI({ apiKey });
    const promptText = unresolvedLines.join("\n");

    const { object } = await generateObject({
      model: googleProvider("gemini-2.5-flash"),
      schema: MultiTransactionSchema,
      prompt: `Analyze the following lines. Each line represents a separate transaction. Extract the transaction details for each line (expense, income, or transfer) and map them to YNAB categories.
Today's date is: ${today}.

Lines to analyze:
${promptText}`,
    });

    return {
      isTransaction: object.isTransaction || localTransactions.length > 0,
      transactions: [...localTransactions, ...object.transactions],
    };
  } catch (error) {
    console.error("Error in batch classifyTransaction:", error);
    // Return local matches if any, plus fallback for failed lines
    const failedTransactions = unresolvedLines.map(line => {
      const { amount, quantity } = extractAmountAndQuantity(line);
      return {
        type: "expense" as const,
        amount,
        category: "💳 Immediate Obligations" as const,
        subCategory: "🛒 Groceries" as const,
        product: `❓ ${line}`,
        quantity,
        date: today,
      };
    });

    return {
      isTransaction: localTransactions.length > 0 || failedTransactions.length > 0,
      transactions: [...localTransactions, ...failedTransactions],
    };
  }
}
