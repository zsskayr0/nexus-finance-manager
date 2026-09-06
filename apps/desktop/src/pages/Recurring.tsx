import { useMemo, useState } from "react";
import { formatCentsToBRL, formatDateBR, type Category, type Payee, type RecurringTransaction } from "@nexus/core";
import type { NexusData } from "../lib/hooks";
import { periodRange, type Period } from "../lib/period";
import type { RecurringPanelTarget } from "../lib/recurringPanelTarget";
import {
  deleteOccurrenceAndFuture,
  deleteOccurrenceOnly,
  recurringOccurrencesForPeriod,
  settleOccurrence,
  type RecurringOccurrenceRow,
} from "../lib/recurring";
import { deleteRecurringKeepingHistory, duplicateRecurringTransaction } from "../lib/db";
import { useMultiSelect } from "../lib/useMultiSelect";
import { useIsMobile } from "../lib/useIsMobile";
import { getPeriodBuckets } from "../lib/aggregate";
import { RecurringModal } from "../components/RecurringModal";
import { PartialSettleModal } from "../components/PartialSettleModal";
import { RecurringOccurrenceMenu } from "../components/RecurringOccurrenceMenu";
import { readableTextColor } from "../components/BankBadge";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { PeriodPicker } from "../components/PeriodPicker";
import { CategoryHeatmap } from "../components/charts/CategoryHeatmap";
import { NeonBarChart, NEON_EXPENSE, NEON_INCOME } from "../components/charts/NeonBarChart";
import {
  CategoryIcon,
  IconArrowDown,
  IconArrowUp,
  IconCheck,
  IconGrid,
  IconList,
  IconPanelRight,
  IconPlus,
  IconRepeat,
  IconTable,
  IconTrash,
} from "../components/icons";

type ViewMode = "list" | "table";
type TypeFilter = "all" | "income" | "expense";

const FREQUENCY_LABEL: Record<RecurringTransaction["frequency"], string> = {
  weekly: "semanal",
  monthly: "mensal",
  yearly: "anual",
};

/** Chave estável de uma ocorrência — usada tanto pro `key` do React quanto pra seleção múltipla. */
function rowKey(row: RecurringOccurrenceRow): string {
  return `${row.recurring.id}:${row.date}`;
}

export function RecurringPage({
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
  panelTarget: RecurringPanelTarget | null;
  onPanelTargetChange: (t: RecurringPanelTarget | null) => void;
  panelPinned: boolean;
  onTogglePanelPinned: () => void;
}) {
  const [view, setView] = useState<ViewMode>("list");
  const [filter, setFilter] = useState<TypeFilter>("all");
  const [partialTarget, setPartialTarget] = useState<RecurringOccurrenceRow | null>(null);
  const [confirmKeys, setConfirmKeys] = useState<string[] | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { recurringTransactions, transactions, categories, accounts, categoriesById, payeesById, recurringExclusions, refresh } = data;

  const range = periodRange(period);
  const isMonth = period.kind === "month";
  const isMobile = useIsMobile();

  const allRows = useMemo(
    () => recurringOccurrencesForPeriod(recurringTransactions, transactions, range, recurringExclusions),
    [recurringTransactions, transactions, range.from, range.to, recurringExclusions],
  );
  const rows = filter === "all" ? allRows : allRows.filter((r) => r.recurring.type === filter);
  const rowsByKey = useMemo(() => new Map(rows.map((r) => [rowKey(r), r])), [rows]);
  const orderedKeys = useMemo(() => rows.map(rowKey), [rows]);

  /** Intensidade de despesa por dia do período — uma faixa só, sem separar por categoria. */
  const dayHeatmap = useMemo(() => {
    const buckets = getPeriodBuckets(period, range);
    const values = buckets.map((b) => {
      let sum = 0;
      for (const row of rows) {
        if (row.date < b.from || row.date > b.to) continue;
        if (row.recurring.type !== "expense") continue;
        sum += row.transaction?.amountCents ?? row.recurring.amountCents;
      }
      return sum;
    });
    return { bucketLabels: buckets.map((b) => b.label), rows: [{ label: "Despesas", values }] };
  }, [rows, period, range.from, range.to]);

  /** Quanto cai em cada pedaço do período selecionado — dia a dia (mês) ou mês a mês (ano). */
  const byBucket = useMemo(() => {
    const buckets = getPeriodBuckets(period, range);
    return buckets.map((b) => {
      let incomeCents = 0;
      let expenseCents = 0;
      for (const row of rows) {
        if (row.date < b.from || row.date > b.to) continue;
        const amountCents = row.transaction?.amountCents ?? row.recurring.amountCents;
        if (row.recurring.type === "income") incomeCents += amountCents;
        else expenseCents += amountCents;
      }
      return { label: b.label, incomeCents, expenseCents };
    });
  }, [rows, period, range.from, range.to]);
  const { selected, handleRowClick, clear } = useMultiSelect(orderedKeys, (keys) => setConfirmKeys(keys));

  async function handleConfirmBulkDelete() {
    if (!confirmKeys) return;
    setDeleting(true);
    try {
      for (const key of confirmKeys) {
        const row = rowsByKey.get(key);
        if (row) await deleteOccurrenceOnly(row.recurring, row.date, row.transaction);
      }
      refresh();
      clear();
      setConfirmKeys(null);
    } finally {
      setDeleting(false);
    }
  }

  // Flutuante (não fixo) continua vivendo aqui, como um overlay comum — só a versão fixa mora no App.
  const floatingTarget = !panelPinned && panelTarget?.mode === "edit" ? panelTarget : undefined;

  function openEdit(row: RecurringOccurrenceRow) {
    onPanelTargetChange({
      mode: "edit",
      recurring: row.recurring,
      occurrenceDate: row.date,
      installmentNumber: row.installmentNumber,
      occurrenceTransaction: row.transaction,
    });
  }

  /** Onclick da linha (não do menu "...") — Ctrl/Shift vira seleção em vez de abrir editar. */
  function handleRowInteraction(row: RecurringOccurrenceRow, e: React.MouseEvent) {
    if (handleRowClick(rowKey(row), e)) return;
    openEdit(row);
  }

  async function handleSettle(row: RecurringOccurrenceRow) {
    await settleOccurrence(row.recurring, row.date, row.installmentNumber);
    refresh();
  }

  async function handleDeleteThis(row: RecurringOccurrenceRow) {
    await deleteOccurrenceOnly(row.recurring, row.date, row.transaction);
    refresh();
  }

  async function handleDeleteThisAndFuture(row: RecurringOccurrenceRow) {
    await deleteOccurrenceAndFuture(row.recurring, row.date, row.transaction);
    refresh();
  }

  async function handleDeleteAll(recurring: RecurringTransaction) {
    await deleteRecurringKeepingHistory(recurring.id);
    refresh();
  }

  async function handleDuplicate(recurring: RecurringTransaction) {
    await duplicateRecurringTransaction(recurring);
    refresh();
  }

  return (
    <div>
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-4">
        <h2 className="page-title">Recorrências</h2>
        <div className="flex flex-wrap items-center gap-2.5">
          <PeriodPicker value={period} onChange={onPeriodChange} />
          <button
            onClick={() => onPanelTargetChange({ mode: "new" })}
            className="solid flex items-center gap-2 rounded-[11px] px-4 py-2.5 text-[0.8rem] font-bold shadow-[var(--shadow-card)] transition-transform active:scale-[0.98]"
          >
            <IconPlus width={14} height={14} strokeWidth={2.4} />
            Nova recorrência
          </button>
        </div>
      </div>

      {recurringTransactions.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 rounded-2xl px-6 py-16 text-center">
          <IconRepeat width={30} height={30} className="text-[var(--text-faint)]" />
          <p className="text-[0.9rem] font-semibold">Nenhuma recorrência cadastrada</p>
          <p className="max-w-sm text-[0.8rem] text-[var(--text-faint)]">
            Cadastre receitas e despesas fixas (aluguel, salário, assinaturas) ou parceladas — o Nexus avisa quando uma ainda não foi lançada no período.
          </p>
          <div className="mt-1">
            <button onClick={() => onPanelTargetChange({ mode: "new" })} className="solid rounded-[11px] px-4 py-2.5 text-[0.8rem] font-bold">
              Nova recorrência
            </button>
          </div>
        </div>
      ) : (
        <>
          {selected.size > 0 && (
            <div className="card mb-3 flex flex-wrap items-center justify-between gap-2 rounded-[11px] px-4 py-2.5">
              <span className="text-[0.8rem] font-semibold text-[var(--text-muted)]">
                {selected.size} selecionado{selected.size > 1 ? "s" : ""}
              </span>
              <div className="flex items-center gap-2">
                <button onClick={clear} className="rounded-[9px] px-3 py-1.5 text-[0.76rem] font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--text)]">
                  Cancelar
                </button>
                <button
                  onClick={() => setConfirmKeys([...selected])}
                  className="solid-danger flex items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-[0.76rem] font-bold"
                >
                  <IconTrash width={12} height={12} />
                  Excluir selecionados
                </button>
              </div>
            </div>
          )}

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <FilterChip active={filter === "all"} onClick={() => setFilter("all")} icon={<IconGrid width={13} height={13} />}>
                Todas
              </FilterChip>
              <FilterChip active={filter === "income"} onClick={() => setFilter("income")} icon={<IconArrowUp width={13} height={13} strokeWidth={2.4} />}>
                Apenas receitas
              </FilterChip>
              <FilterChip active={filter === "expense"} onClick={() => setFilter("expense")} icon={<IconArrowDown width={13} height={13} strokeWidth={2.4} />} danger>
                Apenas despesas
              </FilterChip>
            </div>
            <div className="flex items-center gap-2">
              <div className="card flex rounded-[11px] p-0.5">
                <ViewButton active={view === "list"} onClick={() => setView("list")} icon={<IconList width={13} height={13} />}>
                  Lista
                </ViewButton>
                <ViewButton active={view === "table"} onClick={() => setView("table")} icon={<IconTable width={13} height={13} />}>
                  Tabela
                </ViewButton>
              </div>
              <button
                onClick={onTogglePanelPinned}
                title={panelPinned ? "Painel fixo — clique pra voltar a flutuante" : "Fixar painel lateral"}
                className={
                  "flex h-[30px] w-[30px] items-center justify-center rounded-[10px] border transition-colors " +
                  (panelPinned ? "border-[var(--border-strong)] bg-[var(--panel-elevated)] text-[var(--text)]" : "card text-[var(--text-muted)] hover:text-[var(--text)]")
                }
              >
                <IconPanelRight width={14} height={14} />
              </button>
            </div>
          </div>

          {rows.length > 0 && (
            <div className="mb-3.5 flex flex-col gap-3.5 md:flex-row">
              <div
                className="card flex w-full shrink-0 flex-col overflow-hidden rounded-2xl p-5 pb-4 md:w-auto"
                style={{
                  // Mês tem ~30 dias — quebra em grade (várias linhas) pra
                  // caber num card estreito, sem precisar rolar. Período
                  // maior (ano) tem só ~12 baldes, então o card fica mais
                  // largo e a faixa continua numa linha só, arrastável. No
                  // mobile a largura fixa (300/600) estouraria a tela —
                  // sem largura nenhuma aqui, `w-full` do className manda.
                  width: isMobile ? undefined : isMonth ? 300 : 600,
                  background: "radial-gradient(circle at 20% 15%, rgba(255,60,75,0.12), transparent 60%), var(--panel)",
                }}
              >
                <h4 className="mb-2.5 truncate text-[0.82rem] font-bold">Intensidade de despesas</h4>
                <CategoryHeatmap
                  bucketLabels={dayHeatmap.bucketLabels}
                  rows={dayHeatmap.rows}
                  showRowLabels={false}
                  columns={isMonth ? 10 : undefined}
                  draggable={!isMonth}
                />
              </div>
              <div
                className="card flex min-w-0 flex-1 flex-col rounded-2xl p-5 pb-4"
                style={{ background: "radial-gradient(circle at 50% 60%, rgba(255,59,59,0.14), transparent 65%), var(--panel)" }}
              >
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <h4 className="truncate text-[0.82rem] font-bold">Por período</h4>
                  <div className="flex shrink-0 gap-3">
                    <span className="flex items-center gap-1.5 text-[0.66rem] font-semibold text-[var(--text-muted)]">
                      <span className="h-2 w-2 rounded-sm" style={{ background: NEON_INCOME }} />
                      Receitas
                    </span>
                    <span className="flex items-center gap-1.5 text-[0.66rem] font-semibold text-[var(--text-muted)]">
                      <span className="h-2 w-2 rounded-sm" style={{ background: NEON_EXPENSE }} />
                      Despesas
                    </span>
                  </div>
                </div>
                {/* Período maior estica o canvas do heatmap ao lado, então esse
                    ganha um pouco mais de altura também, pra não sobrar tão
                    baixinho perto do vizinho mais largo. */}
                <div style={{ height: isMonth ? 100 : 130 }}>
                  <NeonBarChart groups={byBucket} />
                </div>
              </div>
            </div>
          )}

          <div className="card overflow-hidden rounded-2xl">
            {rows.length === 0 ? (
              <div className="p-10 text-center text-[0.82rem] text-[var(--text-faint)]">Nenhuma recorrência cai neste período.</div>
            ) : view === "list" ? (
              <div className="flex flex-col">
                {rows.map((row) => (
                  <OccurrenceListRow
                    key={rowKey(row)}
                    row={row}
                    category={categoriesById.get(row.recurring.categoryId ?? "")}
                    payee={payeesById.get(row.recurring.payeeId ?? "")}
                    selected={selected.has(rowKey(row))}
                    onRowClick={(e) => handleRowInteraction(row, e)}
                    onEdit={() => openEdit(row)}
                    onDuplicate={() => handleDuplicate(row.recurring)}
                    onSettle={() => handleSettle(row)}
                    onSettlePartial={() => setPartialTarget(row)}
                    onDeleteThis={() => handleDeleteThis(row)}
                    onDeleteThisAndFuture={() => handleDeleteThisAndFuture(row)}
                    onDeleteAll={() => handleDeleteAll(row.recurring)}
                  />
                ))}
              </div>
            ) : (
              <OccurrenceTableView
                rows={rows}
                categoriesById={categoriesById}
                selected={selected}
                onRowClick={handleRowInteraction}
                onEdit={openEdit}
                onDuplicate={handleDuplicate}
                onSettle={handleSettle}
                onSettlePartial={setPartialTarget}
                onDeleteThis={handleDeleteThis}
                onDeleteThisAndFuture={handleDeleteThisAndFuture}
                onDeleteAll={handleDeleteAll}
              />
            )}
          </div>
        </>
      )}

      {confirmKeys && (
        <ConfirmDialog
          title={`Excluir ${confirmKeys.length} ocorrência${confirmKeys.length > 1 ? "s" : ""}?`}
          message="Cada uma some só do mês em que está — se já virou lançamento, o lançamento é apagado; se ainda pendente, é marcada como pulada. O resto da recorrência continua normal."
          busy={deleting}
          onCancel={() => setConfirmKeys(null)}
          onConfirm={handleConfirmBulkDelete}
        />
      )}

      {!panelPinned && panelTarget && (
        <RecurringModal
          key={floatingTarget?.recurring.id ?? "new"}
          categories={categories}
          accounts={accounts}
          recurring={floatingTarget?.recurring}
          payeeName={floatingTarget && payeesById.get(floatingTarget.recurring.payeeId ?? "")?.name}
          defaultStartDate={range.from}
          occurrenceDate={floatingTarget?.occurrenceDate}
          installmentNumber={floatingTarget?.installmentNumber}
          occurrenceTransaction={floatingTarget?.occurrenceTransaction}
          onClose={() => onPanelTargetChange(null)}
          onSaved={refresh}
        />
      )}

      {partialTarget && (
        <PartialSettleModal
          recurring={partialTarget.recurring}
          date={partialTarget.date}
          installmentNumber={partialTarget.installmentNumber}
          onClose={() => setPartialTarget(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

function FilterChip({
  active,
  danger,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  danger?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "card flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[0.78rem] font-semibold transition-colors " +
        (active ? (danger ? "solid-danger" : "solid") : "text-[var(--text-muted)] hover:text-[var(--text)]")
      }
    >
      {icon}
      {children}
    </button>
  );
}

function ViewButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={
        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[0.76rem] font-bold transition-colors " +
        (active ? "bg-[var(--panel-elevated)] text-[var(--text)]" : "text-[var(--text-muted)] hover:text-[var(--text)]")
      }
    >
      {icon}
      {children}
    </button>
  );
}

function StatusPill({ settled }: { settled: boolean }) {
  return (
    <span
      className={
        "flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.66rem] font-bold " +
        (settled ? "bg-[rgba(255,255,255,0.08)] text-[var(--text)]" : "border border-[var(--border-strong)] text-[var(--text-faint)]")
      }
    >
      {settled && <IconCheck width={9} height={9} strokeWidth={3} />}
      {settled ? "Efetivado" : "Pendente"}
    </span>
  );
}

interface RowActionProps {
  onEdit: () => void;
  onDuplicate: () => void;
  onSettle: () => void;
  onSettlePartial: () => void;
  onDeleteThis: () => void;
  onDeleteThisAndFuture: () => void;
  onDeleteAll: () => void;
}

function OccurrenceListRow({
  row,
  category,
  payee,
  selected,
  onRowClick,
  onEdit,
  onDuplicate,
  onSettle,
  onSettlePartial,
  onDeleteThis,
  onDeleteThisAndFuture,
  onDeleteAll,
}: RowActionProps & { row: RecurringOccurrenceRow; category?: Category; payee?: Payee; selected?: boolean; onRowClick: (e: React.MouseEvent) => void }) {
  const isIn = row.recurring.type === "income";
  const settled = !!row.transaction;
  const amountCents = row.transaction?.amountCents ?? row.recurring.amountCents;

  return (
    <div
      onClick={onRowClick}
      style={category ? { boxShadow: `inset 3px 0 0 0 ${category.color}` } : undefined}
      className={
        "flex cursor-pointer items-center gap-3 border-b border-[var(--border)] px-[18px] py-3 text-left transition-colors last:border-b-0 hover:bg-[rgba(255,255,255,0.03)] " +
        (selected ? "bg-[rgba(255,255,255,0.06)] ring-1 ring-inset ring-[var(--border-strong)]" : "")
      }
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]"
        style={{ background: category?.color ?? "var(--panel-elevated)", color: category ? readableTextColor(category.color) : "var(--text)" }}
      >
        <CategoryIcon icon={category?.icon ?? null} width={17} height={17} />
      </div>
      <div className="min-w-0 flex-[1.4]">
        <div className="truncate text-[0.83rem] font-bold">{row.recurring.description}</div>
        <div className="truncate text-[0.7rem] text-[var(--text-faint)]">
          {payee?.name ?? "—"} ·{" "}
          {row.recurring.recurrenceKind === "installment"
            ? `Parcela ${row.installmentNumber}/${row.recurring.totalInstallments}`
            : `Fixa · ${FREQUENCY_LABEL[row.recurring.frequency]}`}
        </div>
      </div>
      <div className="hidden flex-none text-[0.72rem] text-[var(--text-faint)] sm:block">{formatDateBR(row.date)}</div>
      <div className="hidden flex-none sm:block">
        <StatusPill settled={settled} />
      </div>
      <div className={"mono w-[76px] flex-none text-right text-[0.85rem] font-bold sm:w-[110px] " + (isIn ? "text-[var(--text)]" : "text-[var(--danger)]")}>
        {isIn ? "+" : "-"}
        {formatCentsToBRL(amountCents)}
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <RecurringOccurrenceMenu
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onSettle={settled ? undefined : onSettle}
          onSettlePartial={settled ? undefined : onSettlePartial}
          onDeleteThis={onDeleteThis}
          onDeleteThisAndFuture={onDeleteThisAndFuture}
          onDeleteAll={onDeleteAll}
        />
      </div>
    </div>
  );
}

function OccurrenceTableView({
  rows,
  categoriesById,
  selected,
  onRowClick,
  onEdit,
  onDuplicate,
  onSettle,
  onSettlePartial,
  onDeleteThis,
  onDeleteThisAndFuture,
  onDeleteAll,
}: {
  rows: RecurringOccurrenceRow[];
  categoriesById: Map<string, Category>;
  selected: Set<string>;
  onRowClick: (row: RecurringOccurrenceRow, e: React.MouseEvent) => void;
  onEdit: (row: RecurringOccurrenceRow) => void;
  onDuplicate: (r: RecurringTransaction) => void;
  onSettle: (row: RecurringOccurrenceRow) => void;
  onSettlePartial: (row: RecurringOccurrenceRow) => void;
  onDeleteThis: (row: RecurringOccurrenceRow) => void;
  onDeleteThisAndFuture: (row: RecurringOccurrenceRow) => void;
  onDeleteAll: (r: RecurringTransaction) => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[0.79rem]">
        <thead>
          <tr>
            {["Data", "Descrição", "Categoria", "Status", "Valor"].map((label) => (
              <th
                key={label}
                className="whitespace-nowrap border-b border-[var(--border)] bg-[var(--panel-elevated)] px-4 py-2.5 text-left text-[0.68rem] font-semibold uppercase tracking-[0.06em] text-[var(--text-faint)]"
              >
                {label}
              </th>
            ))}
            <th className="whitespace-nowrap border-b border-[var(--border)] bg-[var(--panel-elevated)] px-4 py-2.5 text-center text-[0.68rem] font-semibold uppercase tracking-[0.06em] text-[var(--text-faint)]">
              Ações
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const isIn = row.recurring.type === "income";
            const settled = !!row.transaction;
            const amountCents = row.transaction?.amountCents ?? row.recurring.amountCents;
            const isSelected = selected.has(rowKey(row));
            const category = categoriesById.get(row.recurring.categoryId ?? "");
            return (
              <tr
                key={rowKey(row)}
                onClick={(e) => onRowClick(row, e)}
                style={category ? { boxShadow: `inset 3px 0 0 0 ${category.color}` } : undefined}
                className={"cursor-pointer transition-colors hover:bg-[rgba(255,255,255,0.03)] " + (isSelected ? "bg-[rgba(255,255,255,0.06)]" : "")}
              >
                <td className="mono border-b border-[var(--border)] px-4 py-2.5 text-[var(--text-muted)]">{formatDateBR(row.date)}</td>
                <td className="border-b border-[var(--border)] px-4 py-2.5 font-semibold">{row.recurring.description}</td>
                <td className="border-b border-[var(--border)] px-4 py-2.5 text-[var(--text-muted)]">
                  <span className="inline-flex items-center gap-2">
                    {category && (
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px]"
                        style={{ background: category.color, color: readableTextColor(category.color) }}
                      >
                        <CategoryIcon icon={category.icon} width={11} height={11} />
                      </span>
                    )}
                    {category?.name ?? "—"}
                  </span>
                </td>
                <td className="border-b border-[var(--border)] px-4 py-2.5">
                  <StatusPill settled={settled} />
                </td>
                <td className={"mono border-b border-[var(--border)] px-4 py-2.5 text-right font-bold " + (isIn ? "text-[var(--text)]" : "text-[var(--danger)]")}>
                  {isIn ? "+" : "-"}
                  {formatCentsToBRL(amountCents)}
                </td>
                <td className="border-b border-[var(--border)] px-4 py-2.5 text-center" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-center">
                    <RecurringOccurrenceMenu
                      onEdit={() => onEdit(row)}
                      onDuplicate={() => onDuplicate(row.recurring)}
                      onSettle={settled ? undefined : () => onSettle(row)}
                      onSettlePartial={settled ? undefined : () => onSettlePartial(row)}
                      onDeleteThis={() => onDeleteThis(row)}
                      onDeleteThisAndFuture={() => onDeleteThisAndFuture(row)}
                      onDeleteAll={() => onDeleteAll(row.recurring)}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
