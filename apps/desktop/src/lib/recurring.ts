import {
  buildTransactionFromRecurring,
  formatCentsToBRL,
  formatDateBR,
  getOccurrencesInRange,
  nextOccurrenceAfter,
  type RecurringTransaction,
  type Transaction,
} from "@nexus/core";
import type { DateRange } from "./aggregate";
import {
  addRecurringExclusion,
  deleteTransaction,
  incrementInstallmentsGenerated,
  insertPendingItem,
  insertTransaction,
  updateRecurringTransaction,
} from "./db";

/** "2026-09-05" → "2026-09-04" — pra encerrar uma recorrência no dia anterior a uma ocorrência escolhida. */
function isoMinusOneDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const date = new Date(y, m - 1, d - 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export interface PendingRecurrence {
  recurring: RecurringTransaction;
  date: string; // ISO
  installmentNumber: number | null;
}

/**
 * Ocorrências de recorrências ativas que caem dentro de `range` e ainda não
 * viraram um lançamento de verdade (nenhuma transação com esse
 * `recurringTransactionId` + `occurredAt` igual à data da ocorrência), nem
 * foram explicitamente puladas (`exclusions`, de um "deletar só este mês").
 * É isso que aparece como "pendente" no card do Painel.
 */
export function pendingRecurrencesForPeriod(
  recurrences: RecurringTransaction[],
  transactions: Transaction[],
  range: DateRange,
  exclusions: Set<string> = new Set(),
): PendingRecurrence[] {
  const generated = new Set(
    transactions.filter((t) => t.recurringTransactionId).map((t) => `${t.recurringTransactionId}:${t.occurredAt}`),
  );

  const result: PendingRecurrence[] = [];
  for (const r of recurrences) {
    if (!r.isActive) continue;
    for (const occ of getOccurrencesInRange(r, range.from, range.to)) {
      const key = `${r.id}:${occ.date}`;
      if (generated.has(key) || exclusions.has(key)) continue;
      result.push({ recurring: r, date: occ.date, installmentNumber: occ.installmentNumber });
    }
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}

/** Rótulo "próxima em dd/mm/aaaa" (ou "encerrada") pra lista de gestão de recorrências. */
export function nextDueLabel(r: RecurringTransaction, fromISO: string): string {
  if (!r.isActive) return "Inativa";
  const next = nextOccurrenceAfter(r, fromISO) ?? (getOccurrencesInRange(r, fromISO, fromISO).length ? { date: fromISO } : null);
  if (!next) return "Encerrada";
  const [y, m, d] = next.date.split("-");
  return `Próxima em ${d}/${m}/${y}`;
}

// ---------------------------------------------------------------------------
// Linha-ocorrência da tela de Recorrências: uma por mês/ocorrência dentro do
// período selecionado, já casada com o lançamento real (se existir).
// ---------------------------------------------------------------------------

export interface RecurringOccurrenceRow {
  recurring: RecurringTransaction;
  date: string; // ISO
  installmentNumber: number | null;
  /** Presente quando essa ocorrência já virou um lançamento real. */
  transaction: Transaction | null;
}

/** Uma linha por ocorrência de cada recorrência ativa dentro de `range` — pendente ou já lançada, exclusões já filtradas fora. */
export function recurringOccurrencesForPeriod(
  recurrences: RecurringTransaction[],
  transactions: Transaction[],
  range: DateRange,
  exclusions: Set<string> = new Set(),
): RecurringOccurrenceRow[] {
  const txByKey = new Map<string, Transaction>();
  for (const t of transactions) {
    if (t.recurringTransactionId) txByKey.set(`${t.recurringTransactionId}:${t.occurredAt}`, t);
  }

  const rows: RecurringOccurrenceRow[] = [];
  for (const r of recurrences) {
    if (!r.isActive) continue;
    for (const occ of getOccurrencesInRange(r, range.from, range.to)) {
      const key = `${r.id}:${occ.date}`;
      if (exclusions.has(key)) continue;
      rows.push({ recurring: r, date: occ.date, installmentNumber: occ.installmentNumber, transaction: txByKey.get(key) ?? null });
    }
  }
  return rows.sort((a, b) => a.date.localeCompare(b.date));
}

/** "Concluir": gera o lançamento real, no valor cheio, pra essa ocorrência. */
export async function settleOccurrence(recurring: RecurringTransaction, date: string, installmentNumber: number | null): Promise<void> {
  const draft = buildTransactionFromRecurring(recurring, { date, installmentNumber });
  await insertTransaction(draft);
  if (recurring.recurrenceKind === "installment") await incrementInstallmentsGenerated(recurring.id);
}

/**
 * Como `settleOccurrence`, mas pro caso do Fluxo de Trabalho onde o usuário
 * arrasta a ocorrência pra uma data DIFERENTE da data natural de vencimento
 * (adiantar/atrasar). O lançamento nasce na data nova, mas a conciliação
 * pendência↔lançamento em `pendingRecurrencesForPeriod`/
 * `recurringOccurrencesForPeriod` casa pela chave `recorrenciaId:occurredAt`
 * — sem marcar a data NATURAL como excluída, ela nunca bateria com o
 * lançamento (que ficou na data nova) e voltaria a aparecer como pendente
 * pra sempre, mesmo já tendo sido lançada.
 */
export async function settleOccurrenceRescheduled(
  recurring: RecurringTransaction,
  naturalDate: string,
  newDate: string,
  installmentNumber: number | null,
): Promise<void> {
  const draft = buildTransactionFromRecurring(recurring, { date: newDate, installmentNumber });
  await insertTransaction(draft);
  if (recurring.recurrenceKind === "installment") await incrementInstallmentsGenerated(recurring.id);
  if (naturalDate !== newDate) await addRecurringExclusion(recurring.id, naturalDate);
}

/**
 * "Concluir parcialmente": gera o lançamento só no valor pago/recebido, e
 * cria uma pendência (sem data, linkada a esta recorrência) com o restante
 * — pra não esquecer que ainda falta cobrar/pagar aquela diferença.
 */
export async function settleOccurrencePartially(
  recurring: RecurringTransaction,
  date: string,
  installmentNumber: number | null,
  paidCents: number,
): Promise<void> {
  const draft = buildTransactionFromRecurring(recurring, { date, installmentNumber });
  await insertTransaction({ ...draft, amountCents: paidCents });
  if (recurring.recurrenceKind === "installment") await incrementInstallmentsGenerated(recurring.id);

  const remainderCents = recurring.amountCents - paidCents;
  if (remainderCents > 0) {
    await insertPendingItem({
      type: recurring.type,
      description: `Restante de ${recurring.description}`,
      amountCents: remainderCents,
      categoryId: recurring.categoryId,
      payeeId: recurring.payeeId,
      recurringTransactionId: recurring.id,
      notes: `Referente a ${formatDateBR(date)} — ${recurring.type === "income" ? "recebido" : "pago"} ${formatCentsToBRL(paidCents)} de ${formatCentsToBRL(recurring.amountCents)}.`,
    });
  }
}

/**
 * "Excluir só este mês": some só esta ocorrência — se já virou lançamento
 * real, apaga o lançamento; se ainda tava pendente, marca como pulada
 * (`recurring_exclusions`) pra não voltar a aparecer. O resto da série
 * continua normal.
 */
export async function deleteOccurrenceOnly(recurring: RecurringTransaction, date: string, transaction: Transaction | null): Promise<void> {
  if (transaction) await deleteTransaction(transaction.id);
  else await addRecurringExclusion(recurring.id, date);
}

/**
 * "Excluir este e os próximos": mesma coisa da ocorrência atual, e encerra a
 * recorrência no dia anterior a ela — nenhuma ocorrência a partir daqui
 * (inclusive) é gerada de novo. Meses anteriores (histórico) não são tocados.
 */
export async function deleteOccurrenceAndFuture(recurring: RecurringTransaction, date: string, transaction: Transaction | null): Promise<void> {
  if (transaction) await deleteTransaction(transaction.id);
  const { id, createdAt, updatedAt, ...rest } = recurring;
  void createdAt;
  void updatedAt;
  await updateRecurringTransaction(id, { ...rest, endDate: isoMinusOneDay(date) });
}
