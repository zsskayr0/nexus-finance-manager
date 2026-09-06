import { describe, expect, it } from "vitest";
import {
  buildTransactionFromRecurring,
  getOccurrencesInRange,
  isDueOn,
  nextOccurrenceAfter,
} from "./recurrence.js";
import type { RecurringTransaction } from "./types.js";

function makeRecurring(overrides: Partial<RecurringTransaction> = {}): RecurringTransaction {
  return {
    id: "rec_1",
    type: "expense",
    description: "Aluguel Apartamento",
    amountCents: 180000,
    categoryId: "cat_moradia",
    payeeId: "payee_imobiliaria",
    recurrenceKind: "fixed",
    frequency: "monthly",
    intervalCount: 1,
    dueDay: 5,
    startDate: "2026-01-05",
    endDate: null,
    totalInstallments: null,
    installmentsGenerated: 0,
    notes: null,
    isActive: true,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("getOccurrencesInRange", () => {
  it("gera uma ocorrência mensal no dia de vencimento", () => {
    const rec = makeRecurring();
    const occurrences = getOccurrencesInRange(rec, "2026-01-01", "2026-06-30");
    expect(occurrences.map((o) => o.date)).toEqual([
      "2026-01-05",
      "2026-02-05",
      "2026-03-05",
      "2026-04-05",
      "2026-05-05",
      "2026-06-05",
    ]);
  });

  it("clampa o dia de vencimento para o último dia do mês quando necessário", () => {
    const rec = makeRecurring({ startDate: "2026-01-31", dueDay: 31 });
    const occurrences = getOccurrencesInRange(rec, "2026-01-01", "2026-03-31");
    // 2026 não é bissexto: fevereiro tem 28 dias.
    expect(occurrences.map((o) => o.date)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
  });

  it("respeita o total de parcelas e numera cada ocorrência", () => {
    const rec = makeRecurring({
      recurrenceKind: "installment",
      startDate: "2026-01-10",
      dueDay: null,
      totalInstallments: 3,
    });
    const occurrences = getOccurrencesInRange(rec, "2026-01-01", "2026-12-31");
    expect(occurrences).toEqual([
      { date: "2026-01-10", installmentNumber: 1 },
      { date: "2026-02-10", installmentNumber: 2 },
      { date: "2026-03-10", installmentNumber: 3 },
    ]);
  });

  it("pula parcelas já geradas", () => {
    const rec = makeRecurring({
      recurrenceKind: "installment",
      startDate: "2026-01-10",
      dueDay: null,
      totalInstallments: 3,
      installmentsGenerated: 1,
    });
    const occurrences = getOccurrencesInRange(rec, "2026-01-01", "2026-12-31");
    expect(occurrences).toEqual([
      { date: "2026-02-10", installmentNumber: 2 },
      { date: "2026-03-10", installmentNumber: 3 },
    ]);
  });

  it("respeita a frequência semanal", () => {
    const rec = makeRecurring({ frequency: "weekly", startDate: "2026-01-05", dueDay: null });
    const occurrences = getOccurrencesInRange(rec, "2026-01-01", "2026-01-31");
    expect(occurrences.map((o) => o.date)).toEqual([
      "2026-01-05",
      "2026-01-12",
      "2026-01-19",
      "2026-01-26",
    ]);
  });

  it("recorrência inativa não gera ocorrências", () => {
    const rec = makeRecurring({ isActive: false });
    expect(getOccurrencesInRange(rec, "2026-01-01", "2026-12-31")).toEqual([]);
  });
});

describe("isDueOn / nextOccurrenceAfter", () => {
  it("isDueOn reconhece o dia exato de vencimento", () => {
    const rec = makeRecurring();
    expect(isDueOn(rec, "2026-03-05")).toBe(true);
    expect(isDueOn(rec, "2026-03-06")).toBe(false);
  });

  it("nextOccurrenceAfter acha a próxima data estritamente depois da informada", () => {
    const rec = makeRecurring();
    expect(nextOccurrenceAfter(rec, "2026-03-05")?.date).toBe("2026-04-05");
  });

  it("nextOccurrenceAfter retorna null quando a recorrência já encerrou", () => {
    const rec = makeRecurring({ endDate: "2026-02-05" });
    expect(nextOccurrenceAfter(rec, "2026-02-05")).toBeNull();
  });
});

describe("buildTransactionFromRecurring", () => {
  it("marca a origem como recurring_generated e preserva categoria/pagador", () => {
    const rec = makeRecurring();
    const tx = buildTransactionFromRecurring(rec, { date: "2026-03-05", installmentNumber: null });
    expect(tx.source).toBe("recurring_generated");
    expect(tx.occurredAt).toBe("2026-03-05");
    expect(tx.amountCents).toBe(180000);
    expect(tx.categoryId).toBe("cat_moradia");
    expect(tx.description).toBe("Aluguel Apartamento");
  });

  it("adiciona o número da parcela na descrição quando parcelado", () => {
    const rec = makeRecurring({ recurrenceKind: "installment", totalInstallments: 12 });
    const tx = buildTransactionFromRecurring(rec, { date: "2026-03-05", installmentNumber: 3 });
    expect(tx.description).toBe("Aluguel Apartamento (3/12)");
  });
});
