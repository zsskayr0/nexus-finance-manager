import { useEffect, useRef, useState } from "react";
import { todayISO, type Transaction } from "@nexus/core";
import type { NexusData } from "../lib/hooks";
import { deletePendingItem, insertTransaction, setTransactionDate } from "../lib/db";
import { pendingRecurrencesForPeriod, settleOccurrenceRescheduled } from "../lib/recurring";
import { type DragPayload } from "../lib/dnd";
import { computeVisibleRange, stepAnchor, type WorkflowView } from "../lib/workflowDates";
import { PendingList } from "../components/PendingList";
import { PendingItemModal } from "../components/PendingItemModal";
import { MonthGrid } from "../components/workflow/MonthGrid";
import { AgendaColumns } from "../components/workflow/AgendaColumns";
import { TimelineStrip } from "../components/workflow/TimelineStrip";
import { IconChevronLeft, IconChevronRight, IconGrid, IconList, IconPlus, IconTimeline } from "../components/icons";

const VIEW_OPTIONS: Array<{ value: WorkflowView; label: string; icon: typeof IconGrid }> = [
  { value: "timeline", label: "Timeline", icon: IconTimeline },
  { value: "month", label: "Mês", icon: IconGrid },
  { value: "week", label: "Semana", icon: IconList },
  { value: "quinzena", label: "15 dias", icon: IconList },
];

/**
 * Fluxo de Trabalho: gestão de datas por arrastar e soltar — pendências sem
 * data, recorrências ainda não lançadas e lançamentos já existentes, tudo
 * numa única superfície de calendário (timeline / mês / semana / 15 dias).
 * Soltar qualquer um dos três num dia grava (ou reagenda) um lançamento de
 * verdade com aquela data.
 */
export function WorkflowPage({ data }: { data: NexusData }) {
  const [view, setView] = useState<WorkflowView>("month");
  const [anchor, setAnchor] = useState(() => new Date());
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);
  const [showNewPending, setShowNewPending] = useState(false);
  const { transactions, categoriesById, recurringTransactions, pendingItems, recurringExclusions, categories, refresh } = data;

  // Altura disponível medida ao vivo (viewport menos tudo que vem antes) —
  // mesmo motivo do card de Pendências do Painel: sem uma altura explícita,
  // as colunas/células não têm limite pra parar de crescer e rolar por
  // dentro.
  const bodyRef = useRef<HTMLDivElement>(null);
  const [bodyHeight, setBodyHeight] = useState(560);
  useEffect(() => {
    function recompute() {
      const top = bodyRef.current?.getBoundingClientRect().top ?? 0;
      setBodyHeight(Math.max(360, window.innerHeight - top - 28));
    }
    recompute();
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, []);

  const today = todayISO();
  const range = computeVisibleRange(view, anchor);

  const txByDate = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const list = txByDate.get(tx.occurredAt);
    if (list) list.push(tx);
    else txByDate.set(tx.occurredAt, [tx]);
  }

  const recurringForRange = pendingRecurrencesForPeriod(recurringTransactions, transactions, { from: range.from, to: range.to }, recurringExclusions);

  async function handleDrop(dateISO: string, payload: DragPayload | null) {
    if (!payload) return;
    if (payload.kind === "transaction") {
      await setTransactionDate(payload.id, dateISO);
    } else if (payload.kind === "pending") {
      const item = pendingItems.find((p) => p.id === payload.id);
      if (!item) return;
      await insertTransaction({
        type: item.type,
        amountCents: item.amountCents,
        currency: "BRL",
        occurredAt: dateISO,
        description: item.description,
        categoryId: item.categoryId,
        payeeId: item.payeeId,
        notes: item.notes,
        source: "manual",
        // Arrastar uma pendência pro calendário é a mesma confirmação que o
        // botão "marcar como recebido/pago" — só com data escolhida em vez
        // de hoje.
        isReconciled: true,
      });
      await deletePendingItem(item.id);
    } else if (payload.kind === "recurring") {
      const recurring = recurringTransactions.find((r) => r.id === payload.recurringId);
      if (!recurring) return;
      await settleOccurrenceRescheduled(recurring, payload.date, dateISO, payload.installmentNumber);
    }
    refresh();
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="page-title">Fluxo de Trabalho</h2>
        <div className="card flex rounded-[10px] p-0.5">
          {VIEW_OPTIONS.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => setView(value)}
              className={
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[0.72rem] font-bold transition-colors " +
                (view === value ? "bg-[var(--panel-elevated)] text-[var(--text)]" : "text-[var(--text-muted)] hover:text-[var(--text)]")
              }
            >
              <Icon width={13} height={13} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setAnchor((a) => stepAnchor(view, a, -1))}
            className="card flex h-8 w-8 items-center justify-center rounded-[9px] text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
          >
            <IconChevronLeft width={15} height={15} />
          </button>
          <button
            onClick={() => setAnchor(new Date())}
            className="card rounded-[9px] px-3 py-[7px] text-[0.74rem] font-bold text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
          >
            Hoje
          </button>
          <button
            onClick={() => setAnchor((a) => stepAnchor(view, a, 1))}
            className="card flex h-8 w-8 items-center justify-center rounded-[9px] text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
          >
            <IconChevronRight width={15} height={15} />
          </button>
        </div>
        <div className="text-[0.86rem] font-bold capitalize">{range.label}</div>
        <div className="w-[130px]" />
      </div>

      <div ref={bodyRef} className="flex gap-3.5" style={{ height: bodyHeight }}>
        <div className="flex w-[300px] shrink-0 flex-col gap-3.5 overflow-hidden">
          <div className="card flex min-h-0 flex-1 flex-col rounded-2xl p-4">
            <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
              <h4 className="text-[0.82rem] font-bold">Pendências</h4>
              <button
                onClick={() => setShowNewPending(true)}
                title="Criar uma pendência sem data (lembrete)"
                className="card flex h-6 w-6 items-center justify-center rounded-[7px] text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
              >
                <IconPlus width={12} height={12} strokeWidth={2.4} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <PendingList recurringItems={[]} reminderItems={pendingItems} categoriesById={categoriesById} onSettled={refresh} draggable />
            </div>
          </div>

          <div className="card flex min-h-0 flex-1 flex-col rounded-2xl p-4">
            <h4 className="mb-2 shrink-0 text-[0.82rem] font-bold">Recorrentes do período</h4>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <PendingList recurringItems={recurringForRange} reminderItems={[]} categoriesById={categoriesById} onSettled={refresh} draggable />
            </div>
          </div>
        </div>

        <div className="min-w-0 flex-1 overflow-hidden rounded-2xl">
          {view === "month" ? (
            <MonthGrid
              year={anchor.getFullYear()}
              month={anchor.getMonth() + 1}
              txByDate={txByDate}
              todayISODate={today}
              dragOverDate={dragOverDate}
              onDragOverDate={setDragOverDate}
              onDropDate={handleDrop}
            />
          ) : view === "timeline" ? (
            <TimelineStrip
              days={range.days}
              txByDate={txByDate}
              todayISODate={today}
              dragOverDate={dragOverDate}
              onDragOverDate={setDragOverDate}
              onDropDate={handleDrop}
            />
          ) : (
            <AgendaColumns
              days={range.days}
              txByDate={txByDate}
              todayISODate={today}
              dragOverDate={dragOverDate}
              onDragOverDate={setDragOverDate}
              onDropDate={handleDrop}
              columnWidth={view === "quinzena" ? 150 : undefined}
            />
          )}
        </div>
      </div>

      {showNewPending && <PendingItemModal categories={categories} onClose={() => setShowNewPending(false)} onSaved={refresh} />}
    </div>
  );
}
