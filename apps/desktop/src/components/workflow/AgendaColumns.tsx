import type { Transaction } from "@nexus/core";
import { WEEKDAY_ABBR } from "../../lib/period";
import { readDragPayload, type DragPayload } from "../../lib/dnd";
import { TransactionChip } from "./TransactionChip";

/**
 * Visão "Semana"/"15 dias": uma coluna por dia, altura cheia, lista completa
 * (rola por dentro). `columnWidth` ausente = colunas dividem o espaço
 * igualmente (semana, sempre cabe); presente = largura fixa com scroll
 * horizontal (15 dias, largo demais pra espremer).
 */
export function AgendaColumns({
  days,
  txByDate,
  todayISODate,
  dragOverDate,
  onDragOverDate,
  onDropDate,
  columnWidth,
}: {
  days: string[];
  txByDate: Map<string, Transaction[]>;
  todayISODate: string;
  dragOverDate: string | null;
  onDragOverDate: (iso: string | null) => void;
  onDropDate: (iso: string, payload: DragPayload | null) => void;
  columnWidth?: number;
}) {
  return (
    <div className="flex h-full gap-2 overflow-x-auto">
      {days.map((iso, i) => {
        const items = txByDate.get(iso) ?? [];
        const isToday = iso === todayISODate;
        const isOver = dragOverDate === iso;
        const day = Number(iso.slice(8, 10));
        return (
          <div
            key={iso}
            style={columnWidth ? { width: columnWidth, minWidth: columnWidth } : { flex: "1 1 0" }}
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
              "flex h-full min-w-[110px] flex-col gap-1.5 overflow-hidden rounded-[12px] border p-2 transition-colors " +
              (columnWidth ? "shrink-0" : "") +
              " " +
              (isOver ? "border-[var(--text)] bg-[var(--panel-elevated)]" : "border-[var(--border)] bg-[var(--panel)]")
            }
          >
            <div className="mb-0.5 shrink-0 text-center">
              <div className="text-[0.6rem] font-bold uppercase tracking-[0.06em] text-[var(--text-faint)]">{WEEKDAY_ABBR[i % 7]}</div>
              <div className={"text-[0.88rem] font-bold " + (isToday ? "" : "text-[var(--text-muted)]")}>
                {isToday ? <span className="rounded-full bg-[var(--text)] px-2 py-0.5 text-[0.76rem] text-[var(--bg)]">{day}</span> : day}
              </div>
            </div>
            <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="py-4 text-center text-[0.62rem] text-[var(--text-faint)]">—</div>
              ) : (
                items.map((tx) => <TransactionChip key={tx.id} tx={tx} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
