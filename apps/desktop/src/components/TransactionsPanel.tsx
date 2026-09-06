import { useMemo, useState } from "react";
import { formatCentsToBRL, formatDateBR, type Category, type Payee, type Transaction } from "@nexus/core";
import { useMultiSelect } from "../lib/useMultiSelect";
import { ConfirmDialog } from "./ConfirmDialog";
import { readableTextColor } from "./BankBadge";
import { CategoryIcon, IconArrowDown, IconArrowUp, IconCheck, IconGrid, IconList, IconPanelRight, IconSort, IconTable, IconTrash } from "./icons";

type ViewMode = "list" | "table";
type TypeFilter = "all" | "income" | "expense";
type ReconciledFilter = "all" | "settled" | "unsettled";
type SortKey = "date" | "desc" | "cat" | "who" | "val";

export function TransactionsPanel({
  transactions,
  categoriesById,
  payeesById,
  variant = "full",
  onEdit,
  onToggleReconciled,
  onDeleteSelected,
  panelPinned,
  onTogglePanelPinned,
}: {
  transactions: Transaction[];
  categoriesById: Map<string, Category>;
  payeesById: Map<string, Payee>;
  variant?: "full" | "compact";
  onEdit?: (tx: Transaction) => void;
  /** Alterna is_reconciled (pago/recebido) de um lançamento. */
  onToggleReconciled?: (tx: Transaction) => void;
  /**
   * Apaga os lançamentos selecionados (Ctrl+clique / Shift+clique / Ctrl+A /
   * Delete) — só disponível no `variant="full"`. Ausente = seleção múltipla
   * desligada (ex.: prévia compacta do Painel).
   */
  onDeleteSelected?: (ids: string[]) => Promise<void> | void;
  /** Quando fornecido junto de `onTogglePanelPinned`, mostra o botão "fixar como painel" ao lado do Lista/Tabela. */
  panelPinned?: boolean;
  onTogglePanelPinned?: () => void;
}) {
  const [view, setView] = useState<ViewMode>("list");
  const [filter, setFilter] = useState<TypeFilter>("all");
  const [reconciledFilter, setReconciledFilter] = useState<ReconciledFilter>("all");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);
  const [confirmIds, setConfirmIds] = useState<string[] | null>(null);
  const [deleting, setDeleting] = useState(false);

  const filtered = useMemo(() => {
    let rows = filter === "all" ? transactions : transactions.filter((t) => t.type === filter);
    if (reconciledFilter !== "all") {
      rows = rows.filter((t) => (reconciledFilter === "settled" ? t.isReconciled : !t.isReconciled));
    }
    if (!sort) return rows;
    const collator = new Intl.Collator("pt-BR");
    return [...rows].sort((a, b) => {
      switch (sort.key) {
        case "date":
          return sort.dir * a.occurredAt.localeCompare(b.occurredAt);
        case "val":
          return sort.dir * (a.amountCents - b.amountCents);
        case "desc":
          return sort.dir * collator.compare(a.description, b.description);
        case "cat":
          return (
            sort.dir *
            collator.compare(categoriesById.get(a.categoryId ?? "")?.name ?? "", categoriesById.get(b.categoryId ?? "")?.name ?? "")
          );
        case "who":
          return (
            sort.dir *
            collator.compare(payeesById.get(a.payeeId ?? "")?.name ?? "", payeesById.get(b.payeeId ?? "")?.name ?? "")
          );
      }
    });
  }, [transactions, filter, reconciledFilter, sort, categoriesById, payeesById]);

  const rows = variant === "compact" ? filtered.slice(0, 5) : filtered;
  const selectable = variant === "full" && !!onDeleteSelected;
  const orderedIds = useMemo(() => (selectable ? rows.map((t) => t.id) : []), [selectable, rows]);
  const { selected, handleRowClick, clear } = useMultiSelect(orderedIds, (ids) => setConfirmIds(ids), selectable);

  function handleClick(tx: Transaction, e: React.MouseEvent) {
    if (selectable && handleRowClick(tx.id, e)) return;
    onEdit?.(tx);
  }

  async function handleConfirmDelete() {
    if (!confirmIds || !onDeleteSelected) return;
    setDeleting(true);
    try {
      await onDeleteSelected(confirmIds);
      clear();
      setConfirmIds(null);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      {selectable && selected.size > 0 && (
        <div className="card mb-3 flex items-center justify-between rounded-[11px] px-4 py-2.5">
          <span className="text-[0.8rem] font-semibold text-[var(--text-muted)]">
            {selected.size} selecionado{selected.size > 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={clear} className="rounded-[9px] px-3 py-1.5 text-[0.76rem] font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--text)]">
              Cancelar
            </button>
            <button
              onClick={() => setConfirmIds([...selected])}
              className="solid-danger flex items-center gap-1.5 rounded-[9px] px-3 py-1.5 text-[0.76rem] font-bold"
            >
              <IconTrash width={12} height={12} />
              Excluir selecionados
            </button>
          </div>
        </div>
      )}

      {variant === "full" && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap gap-2">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")} icon={<IconGrid width={13} height={13} />}>
              Todas
            </FilterChip>
            <FilterChip active={filter === "income"} onClick={() => setFilter("income")} icon={<IconArrowUp width={13} height={13} strokeWidth={2.4} />}>
              Apenas receitas
            </FilterChip>
            <FilterChip
              active={filter === "expense"}
              onClick={() => setFilter("expense")}
              icon={<IconArrowDown width={13} height={13} strokeWidth={2.4} />}
              danger
            >
              Apenas despesas
            </FilterChip>

            <span className="mx-1 hidden w-px self-stretch bg-[var(--border)] sm:block" />

            <FilterChip active={reconciledFilter === "settled"} onClick={() => setReconciledFilter((f) => (f === "settled" ? "all" : "settled"))} icon={<IconCheck width={13} height={13} strokeWidth={2.6} />}>
              Efetivadas
            </FilterChip>
            <FilterChip active={reconciledFilter === "unsettled"} onClick={() => setReconciledFilter((f) => (f === "unsettled" ? "all" : "unsettled"))} icon={<IconCheck width={13} height={13} strokeWidth={2.6} />} outline>
              Previstas
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
            {onTogglePanelPinned && (
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
            )}
          </div>
        </div>
      )}

      <div className="card overflow-hidden rounded-2xl">
        {rows.length === 0 ? (
          <div className="p-10 text-center text-[0.82rem] text-[var(--text-faint)]">Nenhum lançamento encontrado.</div>
        ) : variant === "compact" || view === "list" ? (
          <div className="flex flex-col">
            {rows.map((tx) => (
              <ListRow
                key={tx.id}
                tx={tx}
                category={categoriesById.get(tx.categoryId ?? "")}
                payee={payeesById.get(tx.payeeId ?? "")}
                selected={selected.has(tx.id)}
                onClick={onEdit || selectable ? (e) => handleClick(tx, e) : undefined}
                onToggleReconciled={onToggleReconciled ? () => onToggleReconciled(tx) : undefined}
              />
            ))}
          </div>
        ) : (
          <TableView
            rows={rows}
            categoriesById={categoriesById}
            payeesById={payeesById}
            sort={sort}
            selected={selected}
            onEdit={onEdit || selectable ? handleClick : undefined}
            onToggleReconciled={onToggleReconciled}
            onSort={(key) =>
              setSort((prev) => (prev?.key === key ? { key, dir: prev.dir === 1 ? -1 : 1 } : { key, dir: 1 }))
            }
          />
        )}
      </div>

      {confirmIds && (
        <ConfirmDialog
          title={`Excluir ${confirmIds.length} lançamento${confirmIds.length > 1 ? "s" : ""}?`}
          message="Essa ação não pode ser desfeita."
          busy={deleting}
          onCancel={() => setConfirmIds(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
}

function FilterChip({
  active,
  danger,
  outline,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  danger?: boolean;
  /** Estado "ativo" mais discreto (contorno, sem preenchimento) — usado pro chip "Pendentes". */
  outline?: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "card flex items-center gap-1.5 rounded-[10px] px-3.5 py-2 text-[0.78rem] font-semibold transition-colors " +
        (active ? (danger ? "solid-danger" : outline ? "border-[var(--border-strong)] text-[var(--text)]" : "solid") : "text-[var(--text-muted)] hover:text-[var(--text)]")
      }
    >
      {icon}
      {children}
    </button>
  );
}

function ViewButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
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

/** Marcador circular de "pago/recebido" — clique alterna, sem disparar o clique da linha (editar). */
function SettleCheckbox({ isIncome, settled, onToggle }: { isIncome: boolean; settled: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      title={settled ? "Efetivada — clique pra marcar como prevista" : isIncome ? "Marcar como efetivada (recebido)" : "Marcar como efetivada (pago)"}
      className={
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors " +
        (settled ? "border-[var(--text)] bg-[var(--text)] text-[var(--bg)]" : "border-[var(--border-strong)] text-transparent hover:text-[var(--text-faint)]")
      }
    >
      <IconCheck width={12} height={12} strokeWidth={3} />
    </button>
  );
}

function ListRow({
  tx,
  category,
  payee,
  selected,
  onClick,
  onToggleReconciled,
}: {
  tx: Transaction;
  category?: Category;
  payee?: Payee;
  selected?: boolean;
  onClick?: (e: React.MouseEvent) => void;
  onToggleReconciled?: () => void;
}) {
  const isIn = tx.type === "income";
  return (
    <div
      onClick={onClick}
      style={category ? { boxShadow: `inset 3px 0 0 0 ${category.color}` } : undefined}
      className={
        "flex items-center gap-3 border-b border-[var(--border)] px-[18px] py-3 transition-colors last:border-b-0 " +
        (selected ? "bg-[rgba(255,255,255,0.06)] ring-1 ring-inset ring-[var(--border-strong)] " : "") +
        (onClick ? "cursor-pointer hover:bg-[rgba(255,255,255,0.03)]" : "")
      }
    >
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]"
        style={{ background: category?.color ?? "var(--panel-elevated)", color: category ? readableTextColor(category.color) : "var(--text)" }}
      >
        <CategoryIcon icon={category?.icon ?? null} width={17} height={17} />
      </div>
      <div className="min-w-0 flex-[1.4]">
        <div className="truncate text-[0.83rem] font-bold">{tx.description}</div>
        <div className="truncate text-[0.7rem] text-[var(--text-faint)]">{payee?.name ?? "—"}</div>
      </div>
      <div className="flex-1 text-[0.72rem] text-[var(--text-muted)]">{category?.name ?? "Sem categoria"}</div>
      <div className="mono flex-none text-[0.72rem] text-[var(--text-faint)]">{formatDateBR(tx.occurredAt)}</div>
      <div className={"mono w-[110px] flex-none text-right text-[0.85rem] font-bold " + (isIn ? "text-[var(--text)]" : "text-[var(--danger)]")}>
        {isIn ? "+" : "-"}
        {formatCentsToBRL(tx.amountCents)}
      </div>
      {onToggleReconciled && <SettleCheckbox isIncome={isIn} settled={tx.isReconciled} onToggle={onToggleReconciled} />}
    </div>
  );
}

function TableView({
  rows,
  categoriesById,
  payeesById,
  sort,
  onSort,
  selected,
  onEdit,
  onToggleReconciled,
}: {
  rows: Transaction[];
  categoriesById: Map<string, Category>;
  payeesById: Map<string, Payee>;
  sort: { key: SortKey; dir: 1 | -1 } | null;
  onSort: (key: SortKey) => void;
  selected?: Set<string>;
  onEdit?: (tx: Transaction, e: React.MouseEvent) => void;
  onToggleReconciled?: (tx: Transaction) => void;
}) {
  const columns: Array<{ key: SortKey; label: string }> = [
    { key: "date", label: "Data" },
    { key: "desc", label: "Descrição" },
    { key: "cat", label: "Categoria" },
    { key: "who", label: "Pagador/Recebedor" },
    { key: "val", label: "Valor" },
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[0.79rem]">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                onClick={() => onSort(col.key)}
                className={
                  "cursor-pointer whitespace-nowrap border-b border-[var(--border)] bg-[var(--panel-elevated)] px-4 py-2.5 text-left text-[0.68rem] font-semibold uppercase tracking-[0.06em] " +
                  (sort?.key === col.key ? "text-[var(--text)]" : "text-[var(--text-faint)]")
                }
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  <IconSort width={10} height={10} strokeWidth={2.5} style={{ transform: sort?.key === col.key && sort.dir === -1 ? "rotate(180deg)" : undefined, opacity: sort?.key === col.key ? 1 : 0.45 }} />
                </span>
              </th>
            ))}
            {onToggleReconciled && (
              <th className="whitespace-nowrap border-b border-[var(--border)] bg-[var(--panel-elevated)] px-4 py-2.5 text-center text-[0.68rem] font-semibold uppercase tracking-[0.06em] text-[var(--text-faint)]">
                Efetivado
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((tx) => {
            const isIn = tx.type === "income";
            const isSelected = selected?.has(tx.id);
            const category = categoriesById.get(tx.categoryId ?? "");
            return (
              <tr
                key={tx.id}
                onClick={onEdit ? (e) => onEdit(tx, e) : undefined}
                style={category ? { boxShadow: `inset 3px 0 0 0 ${category.color}` } : undefined}
                className={
                  "transition-colors hover:bg-[rgba(255,255,255,0.03)] " +
                  (isSelected ? "bg-[rgba(255,255,255,0.06)] " : "") +
                  (onEdit ? "cursor-pointer" : "")
                }
              >
                <td className="mono border-b border-[var(--border)] px-4 py-2.5 text-[var(--text-muted)]">{formatDateBR(tx.occurredAt)}</td>
                <td className="border-b border-[var(--border)] px-4 py-2.5 font-semibold">{tx.description}</td>
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
                <td className="border-b border-[var(--border)] px-4 py-2.5 text-[var(--text-muted)]">{payeesById.get(tx.payeeId ?? "")?.name ?? "—"}</td>
                <td className={"mono border-b border-[var(--border)] px-4 py-2.5 text-right font-bold " + (isIn ? "text-[var(--text)]" : "text-[var(--danger)]")}>
                  {isIn ? "+" : "-"}
                  {formatCentsToBRL(tx.amountCents)}
                </td>
                {onToggleReconciled && (
                  <td className="border-b border-[var(--border)] px-4 py-2.5 text-center">
                    <div className="flex justify-center">
                      <SettleCheckbox isIncome={isIn} settled={tx.isReconciled} onToggle={() => onToggleReconciled(tx)} />
                    </div>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
