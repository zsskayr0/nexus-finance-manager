import { DEFAULT_CATEGORIES, OLD_DEFAULT_CATEGORY_GRAYSCALE } from "@nexus/core";
import { getDb, insertAccount, insertCategory, listCategories } from "./db";

/** Garante que as categorias padrão existem. Roda uma vez, no boot do app. */
export async function ensureDefaultCategories(): Promise<void> {
  const db = await getDb();
  const [{ count }] = await db.select<Array<{ count: number }>>(
    "SELECT COUNT(*) as count FROM categories",
  );
  if (count > 0) return;

  for (const cat of DEFAULT_CATEGORIES) {
    await insertCategory(cat);
  }
}

/**
 * Bancos criados antes da cor de categoria virar algo renderizado de
 * verdade (ícone, gráficos, faixa lateral) ainda têm as categorias padrão
 * na rampa de cinza antiga, com colisão entre elas. Corrige só isso — só
 * troca a cor se ainda for exatamente uma das cores antigas conhecidas, pra
 * nunca sobrescrever uma cor que o usuário já tenha escolhido à mão. Roda
 * uma vez, no boot do app; depois da primeira correção não faz mais nada.
 */
export async function ensureVividDefaultCategoryColors(): Promise<void> {
  const db = await getDb();
  const oldColors = new Set<string>(OLD_DEFAULT_CATEGORY_GRAYSCALE.map((c) => c.toUpperCase()));
  for (const cat of DEFAULT_CATEGORIES) {
    const rows = await db.select<Array<{ color: string }>>("SELECT color FROM categories WHERE id = $1", [cat.id]);
    const current = rows[0]?.color;
    if (current && oldColors.has(current.toUpperCase())) {
      await db.execute("UPDATE categories SET color = $1 WHERE id = $2", [cat.color, cat.id]);
    }
  }
}

/** Garante que existe pelo menos uma conta — "Carteira Física", pra dinheiro em espécie. Roda uma vez, no boot do app. */
export async function ensureDefaultAccount(): Promise<void> {
  const db = await getDb();
  const [{ count }] = await db.select<Array<{ count: number }>>(
    "SELECT COUNT(*) as count FROM accounts",
  );
  if (count > 0) return;

  await insertAccount({ name: "Carteira Física", bank: null, agency: null, accountNumber: null, color: "#8f8f96", isDefault: true });
}

/** Verdadeiro se ainda não existe nenhum lançamento — controla o estado vazio do painel. */
export async function hasAnyTransactions(): Promise<boolean> {
  const db = await getDb();
  const [{ count }] = await db.select<Array<{ count: number }>>(
    "SELECT COUNT(*) as count FROM transactions",
  );
  return count > 0;
}

export { listCategories };
