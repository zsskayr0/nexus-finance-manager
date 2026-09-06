import { useState } from "react";
import { formatCentsToBRL, formatDateBR, fromCents, toCents, type RecurringTransaction } from "@nexus/core";
import { settleOccurrencePartially } from "../lib/recurring";
import { IconX } from "./icons";

/**
 * "Concluir parcialmente": o usuário só pagou/recebeu uma parte do valor da
 * ocorrência. Lança o que foi pago/recebido de verdade e cria uma pendência
 * (sem data, linkada a esta recorrência) com o restante.
 */
export function PartialSettleModal({
  recurring,
  date,
  installmentNumber,
  onClose,
  onSaved,
}: {
  recurring: RecurringTransaction;
  date: string;
  installmentNumber: number | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isIncome = recurring.type === "income";
  const [amount, setAmount] = useState(fromCents(recurring.amountCents).toFixed(2).replace(".", ","));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const parsedAmount = Number(amount.replace(/\./g, "").replace(",", "."));
  const paidCents = Number.isFinite(parsedAmount) ? toCents(parsedAmount) : 0;
  const remainderCents = recurring.amountCents - paidCents;

  async function handleSave() {
    setError(null);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return setError("Informe um valor válido.");
    if (paidCents >= recurring.amountCents) return setError(`Esse é o valor cheio — use "Concluir" em vez de parcial.`);

    setSaving(true);
    try {
      await settleOccurrencePartially(recurring, date, installmentNumber, paidCents);
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
      <div className="card animate-pop-in relative flex w-full max-w-sm flex-col overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <h3 className="text-[0.98rem] font-bold">Concluir parcialmente</h3>
          <button onClick={onClose} className="card flex h-7 w-7 items-center justify-center rounded-[9px] text-[var(--text-muted)] transition-colors hover:text-[var(--text)]">
            <IconX width={13} height={13} />
          </button>
        </div>

        <div className="px-5 py-5">
          <p className="mb-4 text-[0.8rem] text-[var(--text-muted)]">
            <span className="font-bold text-[var(--text)]">{recurring.description}</span> · Venc. {formatDateBR(date)} · Total {formatCentsToBRL(recurring.amountCents)}
          </p>

          <label className="flex flex-col gap-1.5">
            <span className="text-[0.66rem] font-semibold uppercase tracking-[0.06em] text-[var(--text-faint)]">
              {isIncome ? "Quanto foi recebido" : "Quanto foi pago"}
            </span>
            <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" autoFocus className="input mono" />
          </label>

          <div className="mt-3 flex items-center justify-between rounded-[11px] border border-[var(--border)] bg-[var(--bg)] px-3.5 py-2.5 text-[0.78rem]">
            <span className="text-[var(--text-faint)]">Fica pendente</span>
            <span className={"mono font-bold " + (remainderCents > 0 ? "text-[var(--danger)]" : "text-[var(--text-faint)]")}>
              {formatCentsToBRL(Math.max(0, remainderCents))}
            </span>
          </div>
          <p className="mt-1.5 text-[0.7rem] text-[var(--text-faint)]">
            O restante vira uma pendência sem data, linkada a esta recorrência — aparece na lista até você decidir quando lançar.
          </p>

          {error && <p className="mt-3 text-[0.75rem] text-[var(--danger)]">{error}</p>}
        </div>

        <div className="border-t border-[var(--border)] px-5 py-4">
          <button onClick={handleSave} disabled={saving} className="solid w-full rounded-[13px] py-3 text-[0.86rem] font-bold shadow-[var(--shadow-card)] transition-transform active:scale-[0.98] disabled:opacity-60">
            {saving ? "Salvando…" : "Confirmar conclusão parcial"}
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
