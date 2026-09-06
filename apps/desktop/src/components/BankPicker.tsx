import { useEffect, useRef, useState } from "react";
import { KNOWN_BANKS } from "../lib/banks";
import { BankBadge } from "./BankBadge";
import { IconChevronDown } from "./icons";

/**
 * Botão que abre um menu com os bancos mais conhecidos (selo colorido +
 * nome) — escolher um só preenche `bank` e sugere a `color` da conta, não
 * grava nada além disso. "Outro banco" cobre qualquer um fora da lista
 * curta — a lista É pra ser curta, de propósito, não um cadastro de todos
 * os bancos do Brasil.
 */
export function BankPicker({
  value,
  onPick,
}: {
  /** Nome do banco atual — pode ser um dos conhecidos ou texto livre digitado em "Outro". */
  value: string;
  onPick: (bank: string, suggestedColor: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [customText, setCustomText] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setCustomText(value), [value]);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const known = KNOWN_BANKS.find((b) => b.name === value);

  function commitCustom() {
    const trimmed = customText.trim();
    if (trimmed && trimmed !== value) onPick(trimmed, null);
  }

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((v) => !v)} className="input flex items-center gap-2.5 text-left">
        {known ? (
          <BankBadge color={known.color} initials={known.initials} size={20} />
        ) : (
          <div className="h-5 w-5 shrink-0 rounded-[6px] border border-dashed border-[var(--border-strong)]" />
        )}
        <span className={"min-w-0 flex-1 truncate " + (value ? "" : "text-[var(--text-faint)]")}>{value || "Selecionar banco"}</span>
        <IconChevronDown width={13} height={13} className="shrink-0 text-[var(--text-faint)]" />
      </button>

      {open && (
        <div className="card animate-pop-in absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-72 overflow-y-auto rounded-[12px] p-2">
          <div className="grid grid-cols-2 gap-1.5">
            {KNOWN_BANKS.map((b) => (
              <button
                key={b.name}
                type="button"
                onClick={() => {
                  onPick(b.name, b.color);
                  setOpen(false);
                }}
                className={
                  "flex items-center gap-2 rounded-[9px] px-2 py-1.5 text-left text-[0.76rem] font-semibold transition-colors hover:bg-[var(--panel-elevated)] " +
                  (value === b.name ? "bg-[var(--panel-elevated)]" : "")
                }
              >
                <BankBadge color={b.color} initials={b.initials} size={22} />
                <span className="min-w-0 flex-1 truncate">{b.name}</span>
              </button>
            ))}
          </div>

          <div className="mt-2 border-t border-[var(--border)] pt-2">
            <span className="mb-1.5 block text-[0.64rem] font-semibold uppercase tracking-[0.06em] text-[var(--text-faint)]">Outro banco</span>
            <input
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              onBlur={commitCustom}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitCustom();
                  setOpen(false);
                }
              }}
              placeholder="Digite o nome do banco"
              className="input"
            />
          </div>
        </div>
      )}
    </div>
  );
}
