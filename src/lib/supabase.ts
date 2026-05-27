import { createClient } from "@supabase/supabase-js";
import { Transaction } from "./classifier";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if variables are valid and not placeholders
const isConfigured = 
  !!supabaseUrl && 
  !!supabaseKey && 
  supabaseUrl !== "your_supabase_url_here" && 
  supabaseKey !== "your_supabase_service_role_key_here" &&
  supabaseKey !== "your_supabase_anon_key_here";

export const supabase = isConfigured 
  ? createClient(supabaseUrl, supabaseKey) 
  : null;

export interface MovementMetadata {
  chatId?: string;
  rawMessage?: string;
}

/**
 * Inserts parsed transactions into the movements table in Supabase.
 * If Supabase is not configured, logs a warning and returns success as false.
 */
export async function insertMovements(transactions: Transaction[], metadata?: MovementMetadata) {
  if (!supabase) {
    console.warn("Supabase is not configured or using placeholders. Skipping db insertion.");
    return { success: false, error: "Supabase not configured" };
  }

  const dbRows = transactions.map(t => ({
    type: t.type,
    amount: t.amount,
    category: t.category,
    sub_category: t.subCategory, // Maps TS camelCase subCategory to DB snake_case sub_category
    product: t.product,
    date: t.date,
    chat_id: metadata?.chatId || null,
    raw_message: metadata?.rawMessage || null,
  }));

  try {
    const { data, error } = await supabase
      .from("movements")
      .insert(dbRows)
      .select();

    if (error) {
      console.error("Error inserting movements to Supabase:", error);
      return { success: false, error: error.message };
    }

    console.log(`[Supabase] Successfully saved ${dbRows.length} movements.`);
    return { success: true, data };
  } catch (err: unknown) {
    console.error("Unexpected error inserting movements:", err);
    const errorMessage = err instanceof Error ? err.message : String(err);
    return { success: false, error: errorMessage };
  }
}
