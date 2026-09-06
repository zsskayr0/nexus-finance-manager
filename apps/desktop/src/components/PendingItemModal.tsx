import { useState } from "react";
import { toCents, type Category } from "@nexus/core";
import { insertPendingItem } from "../lib/db";
import { CategorySelect } from "./CategorySelect";
import { IconX } from "./icons";

/**
 * Cria um lembrete de receita/despesa SEM data — fica na lista de
 * "Pendências" até o usuário arrastar pra um dia no Fluxo de Trabalho (ou
 * lançar direto pelo Painel/lista, o que grava com a data de hoje).
 */
export function PendingItemModal({ categories, onClose, onSaved }: { categories: Category[]; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState<"income" | "expense">("expense");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const relevantCategories = categories.filter((c) => c.type === type || c.type === "both");

  async function handleSave() {
    setError(null);
    const parsedAmount = Number(amount.replace(/\./g, "").replace(",", "."));
    if (!description.trim()) return setError("Informe uma descrição.");
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return setError("Informe um valor válido.");

    setSaving(true);
    try {
      await insertPendingItem({
        type,
        description: description.trim(),
        amountCents: toCents(parsedAmount),
        categoryId: categoryId || null,
        payeeId: null,
        notes: notes.trim() || null,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="animate-fade-in absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="card animate-pop-in relative flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <div>
            <h3 className="text-[0.98rem] font-bold">Nova pendência</h3>
            <p className="mt-0.5 text-[0.72rem] text-[var(--text-faint)]">Um lembrete sem data — arraste pra um dia no Fluxo de Trabalho quando souber quando.</p>
          </div>
          <button onClick={onClose} className="card flex h-7 w-7 shrink-0 items-center justify-center rounded-[9px] text-[var(--text-muted)] transition-colors hover:text-[var(--text)]">
            <IconX width={13} height={13} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <div className="mb-3 flex rounded-[11px] border border-[var(--border)] bg-[var(--bg)] p-[3px]">
            <button
              onClick={() => setType("expense")}
              className={"flex-1 rounded-lg py-1.5 text-[0.8rem] font-bold transition-colors " + (type === "expense" ? "solid-danger" : "text-[var(--text-muted)]")}
            >
              Despesa
            </button>
            <button
              onClick={() => setType("income")}
              className={"flex-1 rounded-lg py-1.5 text-[0.8rem] font-bold transition-colors " + (type === "income" ? "bg-[var(--panel-elevated)] text-[var(--text)]" : "text-[var(--text-muted)]")}
            >
              Receita
            </button>
          </div>

          <div className="flex flex-col gap-3.5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valor">
                <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" className="input mono" autoFocus />
              </Field>
              <Field label="Categoria">
                <CategorySelect categories={relevantCategories} value={categoryId} onChange={setCategoryId} />
              </Field>
            </div>

            <Field label="Descrição">
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex.: Reforma do escritório, bônus do projeto X"
                className="input"
              />
            </Field>

            <Field label="Observações">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" rows={2} className="input resize-none" />
            </Field>
          </div>

          {error && <p className="mt-3 text-[0.75rem] text-[var(--danger)]">{error}</p>}
        </div>

        <div className="border-t border-[var(--border)] px-5 py-4">
          <button onClick={handleSave} disabled={saving} className="solid w-full rounded-[13px] py-3 text-[0.86rem] font-bold shadow-[var(--shadow-card)] transition-transform active:scale-[0.98] disabled:opacity-60">
            {saving ? "Salvando…" : "Criar pendência"}
          </button>
        </div>
      </div>

      <style>{`
        .input {
          width: 100%;
          background: var(--panel-elevated);
          border: 1px solid var(--border);
          border-radius: 11px;
          padding: 9px 11px;
          font-size: 0.83rem;
          color: var(--text);
          font-family: inherit;
          transition: border-color .15s ease;
        }
        .input:focus { outline: 2px solid var(--border-strong); outline-offset: 1px; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[0.66rem] font-semibold uppercase tracking-[0.06em] text-[var(--text-faint)]">{label}</span>
      {children}
    </label>
  );
}
