import { getOccurrencesInRange, type Category, type RecurringTransaction, type Transaction } from "@nexus/core";
import { daysInMonth, periodRange, toISO, type Period } from "./period";

/**
 * Agregações puras sobre a lista de transações já carregada — nada aqui
 * toca o banco, então é fácil de testar e de reaproveitar entre o Painel e
 * futuras telas de relatório.
 */

const MONTH_ABBR = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export interface DateRange {
  from: string; // ISO
  to: string; // ISO
}

export interface Kpis {
  /** Saldo total é sempre a soma de todo o histórico — não muda com o período selecionado. */
  balanceTotalCents: number;
  incomeCents: number;
  expenseCents: number;
  savingsRatePct: number | null;
}

/** KPIs do painel: saldo total (histórico completo) + receitas/despesas dentro de `range`. */
export function computeKpis(transactions: Transaction[], range: DateRange): Kpis {
  let balance = 0;
  let income = 0;
  let expense = 0;

  for (const tx of transactions) {
    const signed = tx.type === "income" ? tx.amountCents : -tx.amountCents;
    balance += signed;
    if (tx.occurredAt >= range.from && tx.occurredAt <= range.to) {
      if (tx.type === "income") income += tx.amountCents;
      else expense += tx.amountCents;
    }
  }

  const savingsRatePct = income > 0 ? ((income - expense) / income) * 100 : null;

  return { balanceTotalCents: balance, incomeCents: income, expenseCents: expense, savingsRatePct };
}

// ---------------------------------------------------------------------------
// Baldes de tempo derivados do período selecionado — o eixo X dos dois
// gráficos "por período" (linha do saldo, receitas x despesas) usa sempre
// a mesma granularidade: ano → 12 meses; mês/intervalo curto (<=45 dias) →
// um balde por dia; intervalo mais longo → um balde por mês.
// ---------------------------------------------------------------------------

interface Bucket {
  label: string;
  from: string;
  to: string;
}

function eachDateISO(fromISO: string, toISOStr: string): string[] {
  const [fy, fm, fd] = fromISO.split("-").map(Number) as [number, number, number];
  const [ty, tm, td] = toISOStr.split("-").map(Number) as [number, number, number];
  const start = new Date(fy, fm - 1, fd);
  const end = new Date(ty, tm - 1, td);
  const days: string[] = [];
  for (let d = start; d <= end; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
    days.push(toISO(d.getFullYear(), d.getMonth() + 1, d.getDate()));
  }
  return days;
}

export function getPeriodBuckets(period: Period, range: DateRange): Bucket[] {
  if (period.kind === "year") {
    return MONTH_ABBR.map((label, i) => {
      const m = i + 1;
      return { label, from: toISO(period.year, m, 1), to: toISO(period.year, m, daysInMonth(period.year, m)) };
    });
  }

  const days = eachDateISO(range.from, range.to);
  if (days.length <= 45) {
    const spansMultipleMonths = range.from.slice(0, 7) !== range.to.slice(0, 7);
    return days.map((iso) => {
      const [, m, d] = iso.split("-");
      return { label: spansMultipleMonths ? `${d}/${m}` : d!, from: iso, to: iso };
    });
  }

  const [startY, startM] = range.from.split("-").map(Number) as [number, number];
  const [endY, endM] = range.to.split("-").map(Number) as [number, number];
  const buckets: Bucket[] = [];
  let y = startY;
  let m = startM;
  while (y < endY || (y === endY && m <= endM)) {
    buckets.push({ label: MONTH_ABBR[m - 1]!, from: toISO(y, m, 1), to: toISO(y, m, daysInMonth(y, m)) });
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return buckets;
}

/** Saldo acumulado (todo o histórico até o fim de cada balde), com granularidade derivada do período selecionado. */
export function balanceTrendForPeriod(transactions: Transaction[], period: Period) {
  const range = periodRange(period);
  const buckets = getPeriodBuckets(period, range);
  const sorted = [...transactions].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

  return buckets.map((b) => {
    let running = 0;
    for (const tx of sorted) {
      if (tx.occurredAt > b.to) break;
      running += tx.type === "income" ? tx.amountCents : -tx.amountCents;
    }
    return { label: b.label, valueCents: running };
  });
}

/** Receitas x despesas por balde (não acumulado), mesma granularidade do balanceTrendForPeriod. */
export function incomeExpenseForPeriod(transactions: Transaction[], period: Period) {
  const range = periodRange(period);
  const buckets = getPeriodBuckets(period, range);

  return buckets.map((b) => {
    let incomeCents = 0;
    let expenseCents = 0;
    for (const tx of transactions) {
      if (tx.occurredAt < b.from || tx.occurredAt > b.to) continue;
      if (tx.type === "income") incomeCents += tx.amountCents;
      else expenseCents += tx.amountCents;
    }
    return { label: b.label, incomeCents, expenseCents };
  });
}

export interface ForecastPoint {
  label: string;
  /** Confirmado (efetivado) — só lançamentos reais com `isReconciled: true`. */
  incomeConfirmedCents: number;
  expenseConfirmedCents: number;
  /**
   * Previsto — lançamentos reais ainda não efetivados MAIS ocorrências de
   * recorrência que ainda não viraram lançamento (vencidas ou futuras,
   * tanto faz). É a parte "adicional" acima do confirmado, não o total.
   */
  incomeForecastCents: number;
  expenseForecastCents: number;
}

/**
 * Igual `incomeExpenseForPeriod`, mas separa cada balde em confirmado
 * (efetivado) x previsto — a divisão agora segue o status do lançamento
 * (`isReconciled`), não a data. Um lançamento de mês passado ainda não
 * efetivado conta como previsto; um lançamento futuro já efetivado conta
 * como confirmado. Ocorrências de recorrência que ainda não viraram
 * lançamento somam sempre como previsto, vencidas ou não.
 */
export function incomeExpenseForPeriodWithForecast(
  transactions: Transaction[],
  recurringTransactions: RecurringTransaction[],
  period: Period,
  exclusions: Set<string> = new Set(),
): ForecastPoint[] {
  const range = periodRange(period);
  const buckets = getPeriodBuckets(period, range);

  // Evita contar duas vezes quando uma ocorrência de recorrência JÁ virou
  // um lançamento real (a mesma checagem de `pendingRecurrencesForPeriod`).
  const generatedKeys = new Set(
    transactions.filter((t) => t.recurringTransactionId).map((t) => `${t.recurringTransactionId}:${t.occurredAt}`),
  );

  return buckets.map((b) => {
    let incomeConfirmedCents = 0;
    let expenseConfirmedCents = 0;
    let incomeForecastCents = 0;
    let expenseForecastCents = 0;

    for (const tx of transactions) {
      if (tx.occurredAt < b.from || tx.occurredAt > b.to) continue;
      if (tx.type === "income") {
        if (tx.isReconciled) incomeConfirmedCents += tx.amountCents;
        else incomeForecastCents += tx.amountCents;
      } else {
        if (tx.isReconciled) expenseConfirmedCents += tx.amountCents;
        else expenseForecastCents += tx.amountCents;
      }
    }

    for (const r of recurringTransactions) {
      if (!r.isActive) continue;
      for (const occ of getOccurrencesInRange(r, b.from, b.to)) {
        const key = `${r.id}:${occ.date}`;
        if (generatedKeys.has(key) || exclusions.has(key)) continue;
        if (r.type === "income") incomeForecastCents += r.amountCents;
        else expenseForecastCents += r.amountCents;
      }
    }

    return { label: b.label, incomeConfirmedCents, expenseConfirmedCents, incomeForecastCents, expenseForecastCents };
  });
}

/** Cor neutra pra "Sem categoria" — nunca é uma cor de categoria de verdade, só o fallback quando `categoryId` é nulo. */
export const UNCATEGORIZED_COLOR = "#5c5c62";

/** Despesas por categoria dentro de `range`, ordenado do maior para o menor — cor é a da própria categoria, consistente com o resto do app. */
export function expenseByCategory(transactions: Transaction[], categoriesById: Map<string, Category>, range: DateRange) {
  const totals = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== "expense" || tx.occurredAt < range.from || tx.occurredAt > range.to) continue;
    const key = tx.categoryId ?? "__uncategorized__";
    totals.set(key, (totals.get(key) ?? 0) + tx.amountCents);
  }

  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([categoryId, valueCents]) => ({
      label: categoriesById.get(categoryId)?.name ?? "Sem categoria",
      valueCents,
      color: categoriesById.get(categoryId)?.color ?? UNCATEGORIZED_COLOR,
    }));
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: "Pix",
  pix_automatico: "Pix Automático",
  ted: "TED",
  cartao: "Cartão",
  dinheiro: "Dinheiro",
  boleto: "Boleto",
  outro: "Outro",
};

/** Despesas por forma de pagamento dentro de `range`, do maior pro menor. */
export function expenseByPaymentMethod(transactions: Transaction[], range: DateRange) {
  const totals = new Map<string, number>();
  for (const tx of transactions) {
    if (tx.type !== "expense" || tx.occurredAt < range.from || tx.occurredAt > range.to) continue;
    const key = tx.paymentMethod ?? "outro";
    totals.set(key, (totals.get(key) ?? 0) + tx.amountCents);
  }
  return [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([key, valueCents]) => ({ label: PAYMENT_METHOD_LABELS[key] ?? key, valueCents }));
}

/** As `limit` maiores despesas individuais dentro de `range`. */
export function topExpenses(transactions: Transaction[], range: DateRange, limit = 5) {
  return transactions
    .filter((tx) => tx.type === "expense" && tx.occurredAt >= range.from && tx.occurredAt <= range.to)
    .sort((a, b) => b.amountCents - a.amountCents)
    .slice(0, limit)
    .map((tx) => ({ label: tx.description, valueCents: tx.amountCents }));
}

/** As `limit` maiores receitas individuais dentro de `range`. */
export function topIncomes(transactions: Transaction[], range: DateRange, limit = 5) {
  return transactions
    .filter((tx) => tx.type === "income" && tx.occurredAt >= range.from && tx.occurredAt <= range.to)
    .sort((a, b) => b.amountCents - a.amountCents)
    .slice(0, limit)
    .map((tx) => ({ label: tx.description, valueCents: tx.amountCents }));
}

// ---------------------------------------------------------------------------
// Análise de categorias (tela Categorias) — ranking de despesas por categoria
// dentro de um período, comparado ao período anterior de mesma duração.
// ---------------------------------------------------------------------------

/** Janela imediatamente anterior a `range`, com a mesma quantidade de dias — usada pra calcular variação %. */
export function previousEquivalentRange(range: DateRange): DateRange {
  const [fy, fm, fd] = range.from.split("-").map(Number) as [number, number, number];
  const [ty, tm, td] = range.to.split("-").map(Number) as [number, number, number];
  const start = new Date(fy, fm - 1, fd);
  const end = new Date(ty, tm - 1, td);
  const spanDays = Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1;

  const prevEnd = new Date(fy, fm - 1, fd - 1);
  const prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), prevEnd.getDate() - (spanDays - 1));
  return {
    from: toISO(prevStart.getFullYear(), prevStart.getMonth() + 1, prevStart.getDate()),
    to: toISO(prevEnd.getFullYear(), prevEnd.getMonth() + 1, prevEnd.getDate()),
  };
}

export interface CategoryStat {
  categoryId: string;
  name: string;
  icon: string | null;
  color: string;
  totalCents: number;
  count: number;
  avgTicketCents: number;
  prevTotalCents: number;
  /** `null` quando não havia gasto nessa categoria no período anterior (sem base pra comparar). */
  changePct: number | null;
  shareOfTotalPct: number;
  activeRecurringCount: number;
}

/**
 * Ranking de despesas por categoria dentro de `range`, do maior pro menor —
 * cada categoria já vem com nº de lançamentos, ticket médio, variação % vs
 * o período anterior de mesma duração e quantas recorrências ativas de
 * despesa apontam pra ela. Só despesas entram na análise (é o caso de uso
 * central de "pra onde tá indo meu dinheiro"); receitas ficam de fora aqui.
 */
export function categoryAnalysis(
  transactions: Transaction[],
  recurringTransactions: RecurringTransaction[],
  categoriesById: Map<string, Category>,
  range: DateRange,
): CategoryStat[] {
  const prevRange = previousEquivalentRange(range);
  const totals = new Map<string, { total: number; count: number }>();
  const prevTotals = new Map<string, number>();

  for (const tx of transactions) {
    if (tx.type !== "expense") continue;
    const key = tx.categoryId ?? "__uncategorized__";
    if (tx.occurredAt >= range.from && tx.occurredAt <= range.to) {
      const cur = totals.get(key) ?? { total: 0, count: 0 };
      cur.total += tx.amountCents;
      cur.count += 1;
      totals.set(key, cur);
    } else if (tx.occurredAt >= prevRange.from && tx.occurredAt <= prevRange.to) {
      prevTotals.set(key, (prevTotals.get(key) ?? 0) + tx.amountCents);
    }
  }

  const grandTotal = [...totals.values()].reduce((sum, v) => sum + v.total, 0);

  const activeRecurringByCategory = new Map<string, number>();
  for (const r of recurringTransactions) {
    if (!r.isActive || r.type !== "expense") continue;
    const key = r.categoryId ?? "__uncategorized__";
    activeRecurringByCategory.set(key, (activeRecurringByCategory.get(key) ?? 0) + 1);
  }

  return [...totals.entries()]
    .map(([categoryId, { total, count }]) => {
      const prevTotal = prevTotals.get(categoryId) ?? 0;
      const cat = categoriesById.get(categoryId);
      return {
        categoryId,
        name: cat?.name ?? "Sem categoria",
        icon: cat?.icon ?? null,
        color: cat?.color ?? UNCATEGORIZED_COLOR,
        totalCents: total,
        count,
        avgTicketCents: Math.round(total / count),
        prevTotalCents: prevTotal,
        changePct: prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null,
        shareOfTotalPct: grandTotal > 0 ? (total / grandTotal) * 100 : 0,
        activeRecurringCount: activeRecurringByCategory.get(categoryId) ?? 0,
      };
    })
    .sort((a, b) => b.totalCents - a.totalCents);
}
