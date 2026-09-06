import { useState } from "react";
import { formatCentsToBRL, formatDateBR, todayISO, type Category, type PendingItem } from "@nexus/core";
import { deletePendingItem, insertTransaction } from "../lib/db";
import { setDragPayload } from "../lib/dnd";
import { settleOccurrence, type PendingRecurrence } from "../lib/recurring";
import { readableTextColor } from "./BankBadge";
import { CategoryIcon, IconCheck, IconTrash } from "./icons";

/**
 * Lista de pendências: lembretes sem data (`reminderItems`) + ocorrências de
 * recorrência ainda não lançadas (`recurringItems`) — usada tanto no card
 * "Pendências" do Painel (`draggable=false`, só o botão de check) quanto no
 * painel lateral do Fluxo de Trabalho (`draggable=true`, também dá pra
 * arrastar cada item pra um dia específico do calendário).
 */
export function PendingList({
  recurringItems,
  reminderItems,
  categoriesById,
  onSettled,
  draggable = false,
}: {
  recurringItems: PendingRecurrence[];
  reminderItems: PendingItem[];
  categoriesById: Map<string, Category>;
  onSettled: () => void;
  draggable?: boolean;
}) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const isEmpty = recurringItems.length === 0 && reminderItems.length === 0;

  async function settleReminder(item: PendingItem) {
    setBusyKey(item.id);
    try {
      await insertTransaction({
        type: item.type,
        amountCents: item.amountCents,
        currency: "BRL",
        occurredAt: todayISO(),
        description: item.description,
        categoryId: item.categoryId,
        payeeId: item.payeeId,
        notes: item.notes,
        source: "manual",
        // "Marcar como recebido/pago hoje" é uma confirmação, não uma previsão
        // — mesmo raciocínio de settleOccurrence (recorrentes).
        isReconciled: true,
      });
      await deletePendingItem(item.id);
      onSettled();
    } finally {
      setBusyKey(null);
    }
  }

  async function discardReminder(item: PendingItem) {
    setBusyKey(item.id);
    try {
      await deletePendingItem(item.id);
      onSettled();
    } finally {
      setBusyKey(null);
    }
  }

  async function settleRecurring(item: PendingRecurrence) {
    const key = `${item.recurring.id}:${item.date}`;
    setBusyKey(key);
    try {
      await settleOccurrence(item.recurring, item.date, item.installmentNumber);
      onSettled();
    } finally {
      setBusyKey(null);
    }
  }

  if (isEmpty) {
    return <p className="py-4 text-center text-[0.78rem] text-[var(--text-faint)]">Nada pendente por aqui — tudo lançado.</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      {reminderItems.map((item) => {
        const isIn = item.type === "income";
        const category = categoriesById.get(item.categoryId ?? "");
        return (
          <div
            key={item.id}
            draggable={draggable}
            onDragStart={(e) => setDragPayload(e, { kind: "pending", id: item.id })}
            style={category ? { boxShadow: `inset 3px 0 0 0 ${category.color}` } : undefined}
            className={"flex items-center gap-2.5 py-1.5 pl-2 " + (draggable ? "cursor-grab active:cursor-grabbing" : "")}
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
              style={{ background: category?.color ?? "var(--panel-elevated)", color: category ? readableTextColor(category.color) : "var(--text)" }}
            >
              <CategoryIcon icon={category?.icon ?? null} width={15} height={15} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[0.76rem] font-bold">{item.description}</div>
              <div className="text-[0.66rem] text-[var(--text-faint)]">Sem data · lembrete</div>
            </div>
            <div className={"mono flex-none text-[0.78rem] font-bold " + (isIn ? "text-[var(--text)]" : "text-[var(--danger)]")}>
              {isIn ? "+" : "-"}
              {formatCentsToBRL(item.amountCents)}
            </div>
            <button
              onClick={() => discardReminder(item)}
              disabled={busyKey === item.id}
              title="Descartar pendência"
              className="card flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] text-[var(--text-muted)] transition-colors hover:text-[var(--danger)] disabled:opacity-50"
            >
              <IconTrash width={12} height={12} />
            </button>
            <button
              onClick={() => settleReminder(item)}
              disabled={busyKey === item.id}
              title={isIn ? "Marcar como recebido hoje" : "Marcar como pago hoje"}
              className="card flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] text-[var(--text-muted)] transition-colors hover:text-[var(--text)] disabled:opacity-50"
            >
              <IconCheck width={13} height={13} strokeWidth={2.4} />
            </button>
          </div>
        );
      })}

      {recurringItems.map((item) => {
        const settleKey = `${item.recurring.id}:${item.date}`;
        const isIn = item.recurring.type === "income";
        const category = categoriesById.get(item.recurring.categoryId ?? "");
        return (
          <div
            key={settleKey}
            draggable={draggable}
            onDragStart={(e) =>
              setDragPayload(e, { kind: "recurring", recurringId: item.recurring.id, date: item.date, installmentNumber: item.installmentNumber })
            }
            style={category ? { boxShadow: `inset 3px 0 0 0 ${category.color}` } : undefined}
            className={"flex items-center gap-2.5 py-1.5 pl-2 " + (draggable ? "cursor-grab active:cursor-grabbing" : "")}
          >
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
              style={{ background: category?.color ?? "var(--panel-elevated)", color: category ? readableTextColor(category.color) : "var(--text)" }}
            >
              <CategoryIcon icon={category?.icon ?? null} width={15} height={15} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[0.76rem] font-bold">{item.recurring.description}</div>
              <div className="text-[0.66rem] text-[var(--text-faint)]">Venc. {formatDateBR(item.date)}</div>
            </div>
            <div className={"mono flex-none text-[0.78rem] font-bold " + (isIn ? "text-[var(--text)]" : "text-[var(--danger)]")}>
              {isIn ? "+" : "-"}
              {formatCentsToBRL(item.recurring.amountCents)}
            </div>
            <button
              onClick={() => settleRecurring(item)}
              disabled={busyKey === settleKey}
              title={isIn ? "Marcar como recebido" : "Marcar como pago"}
              className="card flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] text-[var(--text-muted)] transition-colors hover:text-[var(--text)] disabled:opacity-50"
            >
              <IconCheck width={13} height={13} strokeWidth={2.4} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
