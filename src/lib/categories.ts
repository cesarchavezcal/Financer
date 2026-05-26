/**
 * YNAB (You Need A Budget) standard categories and subcategories.
 * You can easily extend these lists in the future.
 */

export const YNAB_CATEGORIES = [
  "💳 Immediate Obligations",
  "🏡 True Expenses",
  "💸 Debt Payments",
  "🎉 Quality of Life",
  "📈 Income",
] as const;

export const YNAB_SUBCATEGORIES = [
  // Immediate Obligations
  "🏠 Rent/Mortgage",
  "💡 Utilities (Water/Electric/Gas)",
  "🛒 Groceries",
  "🚗 Transportation / Fuel",
  "🌐 Internet / Phone",
  
  // True Expenses
  "🔧 Auto Maintenance",
  "🏡 Home Maintenance",
  "🩺 Medical / Health",
  "👕 Clothing",
  "🎁 Gifts",
  "🏫 Education",
  
  // Debt Payments
  "💳 Credit Card Payment",
  "🚗 Auto Loan",
  "🎓 Student Loan",
  
  // Quality of Life
  "✈️ Vacation / Travel",
  "🏋️ Fitness / Gym",
  "🍿 Entertainment / Fun Money",
  "🍽️ Dining Out / Cafe",
  
  // Income
  "💼 Salary / Wages",
  "📈 Investment Income",
  "🪙 Other Income",
] as const;

// Define types for strict compliance
export type YnabCategory = typeof YNAB_CATEGORIES[number];
export type YnabSubcategory = typeof YNAB_SUBCATEGORIES[number];

export interface PredefinedTransaction {
  type: "expense" | "income";
  category: YnabCategory;
  subCategory: YnabSubcategory;
  product: string;
}

/**
 * Local keyword dictionary map for zero-token expense classification.
 * Matches common Spanish and English search terms to static YNAB mappings.
 */
export const KEYWORD_MAP: Record<string, PredefinedTransaction> = {
  // Groceries / Food items
  "manzana": { type: "expense", category: "💳 Immediate Obligations", subCategory: "🛒 Groceries", product: "🍎 Manzanas" },
  "platano": { type: "expense", category: "💳 Immediate Obligations", subCategory: "🛒 Groceries", product: "🍌 Plátanos" },
  "supermercado": { type: "expense", category: "💳 Immediate Obligations", subCategory: "🛒 Groceries", product: "🛒 Supermercado" },
  "leche": { type: "expense", category: "💳 Immediate Obligations", subCategory: "🛒 Groceries", product: "🥛 Leche" },

  // Dining Out / Cafe
  "cafe": { type: "expense", category: "🎉 Quality of Life", subCategory: "🍽️ Dining Out / Cafe", product: "☕ Café" },
  "starbucks": { type: "expense", category: "🎉 Quality of Life", subCategory: "🍽️ Dining Out / Cafe", product: "☕ Starbucks" },
  "restaurante": { type: "expense", category: "🎉 Quality of Life", subCategory: "🍽️ Dining Out / Cafe", product: "🍔 Restaurante" },
  "tacos": { type: "expense", category: "🎉 Quality of Life", subCategory: "🍽️ Dining Out / Cafe", product: "🌮 Tacos" },

  // Utilities / Rent
  "agua": { type: "expense", category: "💳 Immediate Obligations", subCategory: "💡 Utilities (Water/Electric/Gas)", product: "💧 Recibo de Agua" },
  "luz": { type: "expense", category: "💳 Immediate Obligations", subCategory: "💡 Utilities (Water/Electric/Gas)", product: "⚡ Recibo de Luz" },
  "gas": { type: "expense", category: "💳 Immediate Obligations", subCategory: "💡 Utilities (Water/Electric/Gas)", product: "🔥 Recibo de Gas" },
  "renta": { type: "expense", category: "💳 Immediate Obligations", subCategory: "🏠 Rent/Mortgage", product: "🏠 Pago de Renta" },
  "alquiler": { type: "expense", category: "💳 Immediate Obligations", subCategory: "🏠 Rent/Mortgage", product: "🏠 Pago de Alquiler" },
  "internet": { type: "expense", category: "💳 Immediate Obligations", subCategory: "🌐 Internet / Phone", product: "🌐 Internet" },
  "telefono": { type: "expense", category: "💳 Immediate Obligations", subCategory: "🌐 Internet / Phone", product: "📱 Plan Telefónico" },

  // Transportation
  "gasolina": { type: "expense", category: "💳 Immediate Obligations", subCategory: "🚗 Transportation / Fuel", product: "⛽ Gasolina" },
  "uber": { type: "expense", category: "💳 Immediate Obligations", subCategory: "🚗 Transportation / Fuel", product: "🚗 Uber" },
  "taxi": { type: "expense", category: "💳 Immediate Obligations", subCategory: "🚗 Transportation / Fuel", product: "🚕 Taxi" },

  // Gym / Entertainment
  "gym": { type: "expense", category: "🎉 Quality of Life", subCategory: "🏋️ Fitness / Gym", product: "🏋️ Gimnasio" },
  "gimnasio": { type: "expense", category: "🎉 Quality of Life", subCategory: "🏋️ Fitness / Gym", product: "🏋️ Gimnasio" },
  "netflix": { type: "expense", category: "🎉 Quality of Life", subCategory: "🍿 Entertainment / Fun Money", product: "🍿 Suscripción Netflix" },
  "cine": { type: "expense", category: "🎉 Quality of Life", subCategory: "🍿 Entertainment / Fun Money", product: "🎬 Cine / Películas" },

  // Income
  "nomina": { type: "income", category: "📈 Income", subCategory: "💼 Salary / Wages", product: "💼 Pago de Nómina" },
  "salario": { type: "income", category: "📈 Income", subCategory: "💼 Salary / Wages", product: "💼 Pago de Salario" },
  "sueldo": { type: "income", category: "📈 Income", subCategory: "💼 Salary / Wages", product: "💼 Pago de Sueldo" },
};
