import { formatCentsToBRL, type Transaction } from "@nexus/core";
import { setDragPayload } from "../../lib/dnd";

/**
 * Um lançamento já existente, dentro de uma célula do calendário — sempre
 * arrastável, pra reagendar pra outro dia. `dense` tira o valor (célula do
 * mês é pequena demais pra sobrar espaço) e vira só um pontinho colorido +
 * descrição.
 */
export function TransactionChip({ tx, dense }: { tx: Transaction; dense?: boolean }) {
  const isExpense = tx.type === "expense";
  const color = isExpense ? "var(--danger)" : "var(--text)";

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.stopPropagation();
        setDragPayload(e, { kind: "transaction", id: tx.id });
      }}
      title={`${tx.description} — ${formatCentsToBRL(tx.amountCents)}`}
      className={
        "shrink-0 cursor-grab rounded-[6px] bg-[var(--panel-elevated)] px-1.5 py-1 text-left transition-transform active:cursor-grabbing active:scale-[0.97] " +
        (dense ? "flex items-center gap-1.5" : "flex flex-col gap-0.5")
      }
    >
      {dense ? (
        <>
          <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
          <span className="truncate text-[0.64rem] font-semibold">{tx.description}</span>
        </>
      ) : (
        <>
          <span className="truncate text-[0.68rem] font-semibold">{tx.description}</span>
          <span className="mono text-[0.64rem] font-bold" style={{ color }}>
            {isExpense ? "-" : "+"}
            {formatCentsToBRL(tx.amountCents)}
          </span>
        </>
      )}
    </div>
  );
}
