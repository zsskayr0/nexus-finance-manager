import { useState } from "react";
import type { Category } from "@nexus/core";
import { CategoryModal } from "./CategoryModal";
import { IconPlus } from "./icons";

/**
 * <select> de categoria com um botão "nova categoria" ao lado — cria uma
 * categoria sem sair do formulário atual (lançamento, recorrência,
 * pendência) pra ir até a aba Categorias primeiro. A categoria recém-criada
 * entra na lista na hora via `onCreated` do CategoryModal, guardada à parte
 * de `categories` (que continua vindo do pai, já filtrada por tipo quando
 * for o caso) — assim uma categoria recém-criada nunca desaparece só porque
 * o pai recalculou aquela lista numa re-renderização.
 */
export function CategorySelect({
  categories,
  value,
  onChange,
}: {
  categories: Category[];
  value: string;
  onChange: (id: string) => void;
}) {
  const [created, setCreated] = useState<Category[]>([]);
  const [creating, setCreating] = useState(false);

  const options = [...categories, ...created.filter((c) => !categories.some((existing) => existing.id === c.id))];

  return (
    <div className="flex items-center gap-1.5">
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input flex-1">
        <option value="">Sem categoria</option>
        {options.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => setCreating(true)}
        title="Nova categoria"
        className="card flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px] text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
      >
        <IconPlus width={14} height={14} strokeWidth={2.4} />
      </button>

      {creating && (
        <CategoryModal
          onClose={() => setCreating(false)}
          onSaved={() => {}}
          onCreated={(cat) => {
            setCreated((prev) => [...prev, cat]);
            onChange(cat.id);
          }}
        />
      )}
    </div>
  );
}
