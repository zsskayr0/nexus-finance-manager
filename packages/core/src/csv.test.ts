import { describe, expect, it } from "vitest";
import { buildBackupFileName, buildTransactionsCsv } from "./csv.js";
import type { Category, Payee, Transaction } from "./types.js";

const categories: Category[] = [
  {
    id: "cat_alimentacao",
    name: "Alimentação",
    type: "expense",
    icon: "shopping-bag",
    color: "#4D9294",
    isDefault: true,
    createdAt: "2026-01-01",
    updatedAt: "2026-01-01",
  },
];

const payees: Payee[] = [
  { id: "payee_mercado", name: "Mercado Extra Ltda", document: null, notes: null, createdAt: "2026-01-01" },
];

const transactions: Transaction[] = [
  {
    id: "tx_1",
    type: "expense",
    amountCents: 23450,
    currency: "BRL",
    occurredAt: "2026-09-04",
    description: "Mercado Extra; compras da semana",
    categoryId: "cat_alimentacao",
    payeeId: "payee_mercado",
    paymentMethod: "pix",
    notes: null,
    source: "share_intent",
    ocrRawText: null,
    ocrConfidence: 0.94,
    recurringTransactionId: null,
    isReconciled: false,
    createdAt: "2026-09-04",
    updatedAt: "2026-09-04",
  },
];

describe("buildTransactionsCsv", () => {
  it("inclui BOM, cabeçalho e usa ; como delimitador", () => {
    const csv = buildTransactionsCsv({ transactions, categories, payees });
    expect(csv.startsWith("﻿")).toBe(true);
    const [header] = csv.slice(1).split("\r\n");
    expect(header).toBe(
      "Data;Descrição;Tipo;Valor;Categoria;Pagador/Recebedor;Forma de pagamento;Observações;Origem;Anexo",
    );
  });

  it("formata data em pt-BR e valor com vírgula decimal", () => {
    const csv = buildTransactionsCsv({ transactions, categories, payees });
    const rows = csv.slice(1).split("\r\n").slice(1);
    expect(rows[0]).toContain("04/09/2026");
    expect(rows[0]).toContain("234,50");
  });

  it("escapa campos que contêm o delimitador entre aspas", () => {
    const csv = buildTransactionsCsv({ transactions, categories, payees });
    expect(csv).toContain('"Mercado Extra; compras da semana"');
  });

  it("resolve nomes de categoria e pagador pelos ids", () => {
    const csv = buildTransactionsCsv({ transactions, categories, payees });
    expect(csv).toContain("Alimentação");
    expect(csv).toContain("Mercado Extra Ltda");
  });
});

describe("buildBackupFileName", () => {
  it("segue o padrão nexus_backup_AAAA-MM-DD_HHmm.csv", () => {
    const name = buildBackupFileName(new Date(2026, 8, 4, 18, 30));
    expect(name).toBe("nexus_backup_2026-09-04_1830.csv");
  });
});
