import type { Transaction } from "@nexus/core";
import { buildMonthGrid, WEEKDAY_ABBR } from "../../lib/period";
import { readDragPayload, type DragPayload } from "../../lib/dnd";
import { TransactionChip } from "./TransactionChip";

const MAX_VISIBLE = 3;

/** Visão "Mês": grade tradicional 7x6, célula fixa — não estica com muito lançamento, só mostra "+N mais". */
export function MonthGrid({
  year,
  month,
  txByDate,
  todayISODate,
  dragOverDate,
  onDragOverDate,
  onDropDate,
}: {
  year: number;
  month: number;
  txByDate: Map<string, Transaction[]>;
  todayISODate: string;
  dragOverDate: string | null;
  onDragOverDate: (iso: string | null) => void;
  onDropDate: (iso: string, payload: DragPayload | null) => void;
}) {
  const cells = buildMonthGrid(year, month);

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 grid grid-cols-7 gap-2">
        {WEEKDAY_ABBR.map((d, i) => (
          <div key={i} className="text-center text-[0.64rem] font-bold uppercase tracking-[0.06em] text-[var(--text-faint)]">
            {d}
          </div>
        ))}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-7 grid-rows-6 gap-2">
        {cells.map((cell) => {
          const items = txByDate.get(cell.iso) ?? [];
          const isToday = cell.iso === todayISODate;
          const isOver = dragOverDate === cell.iso;
          return (
            <div
              key={cell.iso}
              onDragOver={(e) => {
                e.preventDefault();
                onDragOverDate(cell.iso);
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) onDragOverDate(null);
              }}
              onDrop={(e) => {
                e.preventDefault();
                onDropDate(cell.iso, readDragPayload(e));
                onDragOverDate(null);
              }}
              className={
                "flex min-h-0 flex-col gap-1 overflow-hidden rounded-[10px] border p-1.5 transition-colors " +
                (isOver
                  ? "border-[var(--text)] bg-[var(--panel-elevated)]"
                  : "border-[var(--border)] " + (cell.inMonth ? "bg-[var(--panel)]" : "bg-transparent opacity-40"))
              }
            >
              <div className="shrink-0 text-[0.68rem] font-bold">
                {isToday ? (
                  <span className="rounded-full bg-[var(--text)] px-1.5 py-0.5 text-[var(--bg)]">{cell.day}</span>
                ) : (
                  <span className={cell.inMonth ? "text-[var(--text-muted)]" : "text-[var(--text-faint)]"}>{cell.day}</span>
                )}
              </div>
              <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-hidden">
                {items.slice(0, MAX_VISIBLE).map((tx) => (
                  <TransactionChip key={tx.id} tx={tx} dense />
                ))}
                {items.length > MAX_VISIBLE && (
                  <div className="text-[0.6rem] font-semibold text-[var(--text-faint)]">+{items.length - MAX_VISIBLE} mais</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
