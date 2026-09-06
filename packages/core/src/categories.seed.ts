import type { Category } from "./types.js";

/**
 * Categorias padrão criadas na primeira execução do app (`is_default = 1`).
 * O usuário pode desativá-las ou criar as próprias; nunca são recriadas se
 * já existir uma categoria com o mesmo `id`.
 *
 * `color` agora é renderizada de verdade em vários lugares (ícone, gráficos,
 * faixa lateral dos lançamentos — ver desktop/lib/aggregate.ts e
 * pages/Categories.tsx), então cada categoria padrão tem uma cor própria e
 * distinta, tirada da mesma paleta curada do seletor de cor
 * (desktop/lib/colorSwatches.ts) — pra uma categoria parecer sempre igual em
 * toda parte. `OLD_GRAYSCALE_COLORS` (desktop/lib/seed.ts) guarda os valores
 * antigos, só pra corrigir bancos já existentes sem mexer numa cor que o
 * usuário já tenha personalizado.
 */
export const DEFAULT_CATEGORIES: ReadonlyArray<
  Omit<Category, "createdAt" | "updatedAt">
> = [
  { id: "cat_renda", name: "Renda", type: "income", icon: "briefcase", color: "#8fd9ac", isDefault: true },
  { id: "cat_renda_extra", name: "Renda extra", type: "income", icon: "zap", color: "#7dd3c0", isDefault: true },
  { id: "cat_transferencia", name: "Transferência recebida", type: "income", icon: "arrow-left-right", color: "#6ec6ff", isDefault: true },

  { id: "cat_moradia", name: "Moradia", type: "expense", icon: "home", color: "#f2a154", isDefault: true },
  { id: "cat_alimentacao", name: "Alimentação", type: "expense", icon: "shopping-bag", color: "#f5d76e", isDefault: true },
  { id: "cat_transporte", name: "Transporte", type: "expense", icon: "car", color: "#8ca6f2", isDefault: true },
  { id: "cat_saude", name: "Saúde", type: "expense", icon: "heart-pulse", color: "#f28fb0", isDefault: true },
  { id: "cat_assinaturas", name: "Assinaturas", type: "expense", icon: "repeat", color: "#b98cf2", isDefault: true },
  { id: "cat_outros", name: "Outros", type: "both", icon: "more-horizontal", color: "#96969c", isDefault: true },
];

/** Cores antigas (rampa de cinza, com colisão entre categorias) — só pra migrar bancos já existentes, ver `ensureVividDefaultCategoryColors` no desktop. */
export const OLD_DEFAULT_CATEGORY_GRAYSCALE = ["#F5F5F6", "#C7C7CC", "#96969C", "#68686E", "#454549", "#3A3A3D"] as const;

export function findDefaultCategory(id: string) {
  return DEFAULT_CATEGORIES.find((c) => c.id === id) ?? null;
}
