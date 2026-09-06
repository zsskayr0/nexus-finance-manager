import type { NewTransaction, RecurringTransaction } from "./types.js";

/**
 * Cálculo de datas de recorrência (fixas ou parceladas) e geração do
 * lançamento correspondente a uma ocorrência. Toda a aritmética de data usa
 * UTC (meio-dia, para não cair em ambiguidade de horário de verão) — as
 * strings de entrada/saída continuam sendo apenas "YYYY-MM-DD".
 */

interface YMD {
  y: number;
  m: number; // 1-12
  d: number;
}

function parseISO(iso: string): YMD {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) throw new Error(`Data inválida: ${iso}`);
  return { y, m, d };
}

function toISO({ y, m, d }: YMD): string {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function toUtcDate({ y, m, d }: YMD): Date {
  return new Date(Date.UTC(y, m - 1, d, 12));
}

function compareISO(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Soma `count` intervalos de `frequency` a uma data. Para mensal/anual, se
 * `dueDay` estiver definido ele manda no dia de todas as ocorrências (ex.:
 * aluguel sempre no dia 5); se for `null`, o dia de `startDate` é preservado
 * mês a mês.
 */
function addInterval(
  base: YMD,
  frequency: RecurringTransaction["frequency"],
  count: number,
  dueDay: number | null,
): YMD {
  if (frequency === "weekly") {
    const asDate = toUtcDate(base);
    asDate.setUTCDate(asDate.getUTCDate() + 7 * count);
    return { y: asDate.getUTCFullYear(), m: asDate.getUTCMonth() + 1, d: asDate.getUTCDate() };
  }

  const monthsToAdd = frequency === "yearly" ? 12 * count : count;
  const totalMonthIndex = (base.m - 1) + monthsToAdd;
  const y = base.y + Math.floor(totalMonthIndex / 12);
  const m = (totalMonthIndex % 12) + 1;
  const targetDay = dueDay ?? base.d;
  const d = Math.min(targetDay, daysInMonth(y, m));
  return { y, m, d };
}

/**
 * Aplica o dia de vencimento já no MÊS de início — sem isso, a primeira
 * ocorrência de uma recorrência usava o dia literal de `startDate` (dia 1,
 * no caso do import do DRE) e só a partir da segunda ocorrência em diante
 * `addInterval` corrigia pro `dueDay` de verdade. Resultado: toda recorrência
 * "nascia" com a primeira ocorrência no dia errado. `weekly` não usa
 * `dueDay`, então passa direto.
 */
function normalizeToDueDay(base: YMD, frequency: RecurringTransaction["frequency"], dueDay: number | null): YMD {
  if (frequency === "weekly" || dueDay === null) return base;
  return { y: base.y, m: base.m, d: Math.min(dueDay, daysInMonth(base.y, base.m)) };
}

export interface RecurrenceOccurrence {
  date: string; // YYYY-MM-DD
  installmentNumber: number | null; // 1-based, só para 'installment'
}

/**
 * Lista todas as ocorrências de uma recorrência entre `rangeStart` e
 * `rangeEnd` (inclusive), respeitando início, fim, parcelas totais e o que
 * já foi gerado (`installmentsGenerated`).
 */
export function getOccurrencesInRange(
  recurring: RecurringTransaction,
  rangeStart: string,
  rangeEnd: string,
): RecurrenceOccurrence[] {
  if (!recurring.isActive) return [];

  const occurrences: RecurrenceOccurrence[] = [];
  let cursor = normalizeToDueDay(parseISO(recurring.startDate), recurring.frequency, recurring.dueDay);
  let installmentNumber = 1;

  // Pula ocorrências já geradas (parcelas), avançando o cursor sem emiti-las.
  for (; installmentNumber <= recurring.installmentsGenerated; installmentNumber++) {
    cursor = addInterval(cursor, recurring.frequency, recurring.intervalCount, recurring.dueDay);
  }

  const maxIterations = 1000; // trava de segurança contra recorrência mal configurada
  for (let i = 0; i < maxIterations; i++) {
    const cursorISO = toISO(cursor);

    if (recurring.endDate && compareISO(cursorISO, recurring.endDate) > 0) break;
    if (
      recurring.recurrenceKind === "installment" &&
      recurring.totalInstallments !== null &&
      installmentNumber > recurring.totalInstallments
    ) {
      break;
    }
    if (compareISO(cursorISO, rangeEnd) > 0) break;

    if (compareISO(cursorISO, rangeStart) >= 0) {
      occurrences.push({
        date: cursorISO,
        installmentNumber: recurring.recurrenceKind === "installment" ? installmentNumber : null,
      });
    }

    cursor = addInterval(cursor, recurring.frequency, recurring.intervalCount, recurring.dueDay);
    installmentNumber++;
  }

  return occurrences;
}

/** Verifica se existe uma ocorrência exatamente em `dateISO` (usado pelo worker diário). */
export function isDueOn(recurring: RecurringTransaction, dateISO: string): boolean {
  return getOccurrencesInRange(recurring, dateISO, dateISO).length > 0;
}

/** Próxima ocorrência estritamente após `afterISO`, ou `null` se a recorrência já encerrou. */
export function nextOccurrenceAfter(
  recurring: RecurringTransaction,
  afterISO: string,
): RecurrenceOccurrence | null {
  const farFuture = "9999-12-31";
  const nextDay = toISO(
    (() => {
      const d = toUtcDate(parseISO(afterISO));
      d.setUTCDate(d.getUTCDate() + 1);
      return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
    })(),
  );
  const [first] = getOccurrencesInRange(recurring, nextDay, farFuture);
  return first ?? null;
}

/** Monta o rascunho de lançamento (fonte `recurring_generated`) para uma ocorrência. */
export function buildTransactionFromRecurring(
  recurring: RecurringTransaction,
  occurrence: RecurrenceOccurrence,
): NewTransaction {
  const installmentSuffix =
    recurring.recurrenceKind === "installment" && occurrence.installmentNumber !== null
      ? ` (${occurrence.installmentNumber}/${recurring.totalInstallments})`
      : "";

  return {
    type: recurring.type,
    amountCents: recurring.amountCents,
    currency: "BRL",
    occurredAt: occurrence.date,
    description: `${recurring.description}${installmentSuffix}`,
    categoryId: recurring.categoryId,
    payeeId: recurring.payeeId,
    accountId: recurring.accountId,
    paymentMethod: recurring.paymentMethod,
    notes: recurring.notes,
    source: "recurring_generated",
    ocrRawText: null,
    ocrConfidence: null,
    recurringTransactionId: recurring.id,
    // Todo chamador disso é um "concluir" (inteiro, parcial, ou arrastando
    // no Fluxo de Trabalho) — o usuário está confirmando que aconteceu de
    // verdade, então o lançamento já nasce Efetivado, não Previsto.
    isReconciled: true,
  };
}
