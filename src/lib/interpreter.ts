/**
 * Interprets chat/telegram messages and returns a structured response if it matches
 * specific patterns (e.g., recording expenses).
 */
export function interpretMessage(text: string): string | null {
  // Regular expression to match "Gaste $X en Y" (case-insensitive)
  // Example: "Gaste $5 en manzanas" or "Gaste 10.50 en cafe"
  const expenseRegex = /gaste\s+\$?(\d+(?:\.\d{2})?)\s+en\s+(.+)/i;
  const match = text.match(expenseRegex);

  if (match) {
    const amount = match[1];
    const item = match[2].trim();
    return `Se registraron $${amount} en ${item}`;
  }

  return null;
}
