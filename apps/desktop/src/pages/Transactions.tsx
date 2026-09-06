import { useMemo, useState } from "react";
import type { NexusData } from "../lib/hooks";
import { periodRange, type Period } from "../lib/period";
import type { PanelTarget } from "../lib/panelTarget";
import { deleteTransactions, setTransactionReconciled } from "../lib/db";
import { TransactionsPanel } from "../components/TransactionsPanel";
import { TransactionModal } from "../components/TransactionModal";
import { PeriodPicker } from "../components/PeriodPicker";
import { IconPlus, IconSearch } from "../components/icons";

export function TransactionsPage({
  data,
  period,
  onPeriodChange,
  panelTarget,
  onPanelTargetChange,
  panelPinned,
  onTogglePanelPinned,
}: {
  data: NexusData;
  period: Period;
  onPeriodChange: (p: Period) => void;
  panelTarget: PanelTarget | null;
  onPanelTargetChange: (t: PanelTarget | null) => void;
  panelPinned: boolean;
  onTogglePanelPinned: () => void;
}) {
  const [query, setQuery] = useState("");
  const { transactions, categories, accounts, categoriesById, payeesById, refresh } = data;

  const range = periodRange(period);

  const filtered = useMemo(() => {
    const inRange = transactions.filter((tx) => tx.occurredAt >= range.from && tx.occurredAt <= range.to);
    const q = query.trim().toLowerCase();
    if (!q) return inRange;
    return inRange.filter((tx) => {
      const payeeName = payeesById.get(tx.payeeId ?? "")?.name ?? "";
      const categoryName = categoriesById.get(tx.categoryId ?? "")?.name ?? "";
      return (
        tx.description.toLowerCase().includes(q) ||
        payeeName.toLowerCase().includes(q) ||
        categoryName.toLowerCase().includes(q)
      );
    });
  }, [transactions, query, payeesById, categoriesById, range.from, range.to]);

  // Flutuante (não fixo) continua vivendo aqui, como um overlay comum — só
  // a versão fixa precisa morar no App, pra reservar espaço no layout.
  const floatingEditingTx = !panelPinned && panelTarget?.mode === "edit" ? panelTarget.tx : undefined;

  return (
    <div>
      <div className="mb-5 flex items-center justify-between gap-4">
        <h2 className="page-title">Transações</h2>
        <div className="flex items-center gap-2.5">
          <div className="card flex items-center gap-2 rounded-[11px] px-3.5 py-2 text-[0.78rem]">
            <IconSearch width={14} height={14} className="text-[var(--text-faint)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar transação…"
              className="w-48 bg-transparent text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
            />
          </div>
          <PeriodPicker value={period} onChange={onPeriodChange} />
          <button
            onClick={() => onPanelTargetChange({ mode: "new" })}
            className="solid flex items-center gap-2 rounded-[11px] px-4 py-2.5 text-[0.8rem] font-bold shadow-[var(--shadow-card)] transition-transform active:scale-[0.98]"
          >
            <IconPlus width={14} height={14} strokeWidth={2.4} />
            Novo lançamento
          </button>
        </div>
      </div>

      <TransactionsPanel
        transactions={filtered}
        categoriesById={categoriesById}
        payeesById={payeesById}
        variant="full"
        onEdit={(tx) => onPanelTargetChange({ mode: "edit", tx })}
        onToggleReconciled={(tx) => setTransactionReconciled(tx.id, !tx.isReconciled).then(refresh)}
        onDeleteSelected={(ids) => deleteTransactions(ids).then(refresh)}
        panelPinned={panelPinned}
        onTogglePanelPinned={onTogglePanelPinned}
      />

      {!panelPinned && panelTarget && (
        <TransactionModal
          key={floatingEditingTx?.id ?? "new"}
          categories={categories}
          accounts={accounts}
          transaction={floatingEditingTx}
          payeeName={floatingEditingTx && payeesById.get(floatingEditingTx.payeeId ?? "")?.name}
          onClose={() => onPanelTargetChange(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}
