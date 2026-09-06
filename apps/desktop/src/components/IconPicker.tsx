import { useEffect, useRef, useState } from "react";
import { CATEGORY_ICON_GROUPS, CATEGORY_ICON_LABELS, CategoryIcon, IconChevronDown, IconSearch } from "./icons";

/**
 * Seletor de ícone de categoria — popup com busca + ícones agrupados por
 * tema (mesmo padrão do BankPicker: botão que mostra a seleção atual, abre
 * um menu ao clicar). Mais de 50 opções cabem numa lista corrida só, então
 * a busca filtra tanto pela chave quanto pelo rótulo em português.
 */
export function IconPicker({ value, onPick }: { value: string | null; onPick: (icon: string) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const q = query.trim().toLowerCase();
  const groups = CATEGORY_ICON_GROUPS.map((g) => ({
    label: g.label,
    keys: g.keys.filter((key) => !q || key.includes(q) || (CATEGORY_ICON_LABELS[key] ?? "").toLowerCase().includes(q)),
  })).filter((g) => g.keys.length > 0);

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="input flex items-center gap-2.5 text-left">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px] bg-[var(--panel-elevated)] text-[var(--text)]">
          <CategoryIcon icon={value} width={14} height={14} />
        </div>
        <span className="min-w-0 flex-1 truncate">{value ? (CATEGORY_ICON_LABELS[value] ?? value) : "Selecionar ícone"}</span>
        <IconChevronDown width={13} height={13} className="shrink-0 text-[var(--text-faint)]" />
      </button>

      {open && (
        <div className="card animate-pop-in absolute left-0 right-0 top-[calc(100%+4px)] z-20 flex max-h-80 flex-col overflow-hidden rounded-[12px]">
          <div className="flex shrink-0 items-center gap-2 border-b border-[var(--border)] px-3 py-2.5">
            <IconSearch width={13} height={13} className="shrink-0 text-[var(--text-faint)]" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar ícone…"
              className="min-w-0 flex-1 bg-transparent text-[0.8rem] text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
            />
          </div>
          <div className="flex-1 overflow-y-auto p-2.5">
            {groups.length === 0 ? (
              <p className="py-4 text-center text-[0.76rem] text-[var(--text-faint)]">Nenhum ícone encontrado.</p>
            ) : (
              groups.map((g) => (
                <div key={g.label} className="mb-3 last:mb-0">
                  <div className="mb-1.5 px-0.5 text-[0.62rem] font-semibold uppercase tracking-[0.06em] text-[var(--text-faint)]">{g.label}</div>
                  <div className="grid grid-cols-6 gap-1.5">
                    {g.keys.map((key) => (
                      <button
                        key={key}
                        type="button"
                        title={CATEGORY_ICON_LABELS[key] ?? key}
                        onClick={() => {
                          onPick(key);
                          setOpen(false);
                          setQuery("");
                        }}
                        className={
                          "flex h-9 w-9 items-center justify-center rounded-[9px] border transition-colors " +
                          (value === key
                            ? "border-[var(--text)] bg-[var(--panel-elevated)] text-[var(--text)]"
                            : "border-[var(--border)] text-[var(--text-faint)] hover:text-[var(--text)]")
                        }
                      >
                        <CategoryIcon icon={key} width={16} height={16} />
                      </button>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
