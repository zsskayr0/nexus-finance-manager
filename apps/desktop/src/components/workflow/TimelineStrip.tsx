import type { Transaction } from "@nexus/core";
import { MONTH_ABBR } from "../../lib/period";
import { readDragPayload, type DragPayload } from "../../lib/dnd";
import { TransactionChip } from "./TransactionChip";

/**
 * Visão "Timeline": faixa horizontal contínua e larga (45 dias por padrão),
 * colunas bem finas — pensada pra rolar e ter uma leitura "em larga escala"
 * do fluxo, em vez de paginar mês a mês.
 */
export function TimelineStrip({
  days,
  txByDate,
  todayISODate,
  dragOverDate,
  onDragOverDate,
  onDropDate,
}: {
  days: string[];
  txByDate: Map<string, Transaction[]>;
  todayISODate: string;
  dragOverDate: string | null;
  onDragOverDate: (iso: string | null) => void;
  onDropDate: (iso: string, payload: DragPayload | null) => void;
}) {
  return (
    <div className="flex h-full gap-1 overflow-x-auto pb-1">
      {days.map((iso) => {
        const items = txByDate.get(iso) ?? [];
        const isToday = iso === todayISODate;
        const isOver = dragOverDate === iso;
        const month = Number(iso.slice(5, 7));
        const day = Number(iso.slice(8, 10));
        return (
          <div
            key={iso}
            onDragOver={(e) => {
              e.preventDefault();
              onDragOverDate(iso);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) onDragOverDate(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              onDropDate(iso, readDragPayload(e));
              onDragOverDate(null);
            }}
            className={
              "flex h-full w-[76px] shrink-0 flex-col gap-1 overflow-hidden rounded-[10px] border p-1.5 transition-colors " +
              (isOver
                ? "border-[var(--text)] bg-[var(--panel-elevated)]"
                : isToday
                  ? "border-[var(--border-strong)] bg-[var(--panel-elevated)]"
                  : "border-[var(--border)] bg-[var(--panel)]")
            }
          >
            <div className="shrink-0 text-center">
              <div className="text-[0.58rem] font-semibold uppercase text-[var(--text-faint)]">{MONTH_ABBR[month - 1]}</div>
              <div className={"text-[0.8rem] font-bold " + (isToday ? "" : "text-[var(--text-muted)]")}>{day}</div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
              {items.map((tx) => (
                <TransactionChip key={tx.id} tx={tx} dense />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
