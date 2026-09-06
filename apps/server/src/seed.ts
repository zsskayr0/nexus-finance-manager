import { DEFAULT_CATEGORIES } from "@nexus/core";
import { getRawDb, insertAccount, insertCategory } from "./db.js";

/** Garante que as categorias padrão existem. Roda uma vez, no boot do servidor. */
export function ensureDefaultCategories(): void {
  const db = getRawDb();
  const { count } = db.prepare("SELECT COUNT(*) as count FROM categories").get() as unknown as { count: number };
  if (count > 0) return;
  for (const cat of DEFAULT_CATEGORIES) insertCategory(cat);
}

/** Garante que existe pelo menos uma conta — "Carteira Física". Roda uma vez, no boot do servidor. */
export function ensureDefaultAccount(): void {
  const db = getRawDb();
  const { count } = db.prepare("SELECT COUNT(*) as count FROM accounts").get() as unknown as { count: number };
  if (count > 0) return;
  insertAccount({ name: "Carteira Física", bank: null, agency: null, accountNumber: null, color: "#8f8f96", isDefault: true });
}
