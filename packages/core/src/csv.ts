import type { Attachment, Category, Payee, Transaction } from "./types.js";
import { formatDateBR, fromCents } from "./format.js";

/**
 * Exportação em CSV usada pelo backup automático (mobile e desktop) e pelo
 * botão manual "Exportar" do desktop.
 *
 * Decisões de formato, de propósito:
 * - Delimitador `;` e decimal com vírgula: é o que o Excel em pt-BR espera
 *   ao abrir o arquivo por duplo clique, sem assistente de importação.
 * - BOM UTF-8 no início: sem ele, o Excel do Windows interpreta acentos
 *   (ç, ã, é) como Latin-1 e corrompe o texto.
 */

const CSV_DELIMITER = ";";
const CSV_HEADERS = [
  "Data",
  "Descrição",
  "Tipo",
  "Valor",
  "Categoria",
  "Pagador/Recebedor",
  "Forma de pagamento",
  "Observações",
  "Origem",
  "Anexo",
] as const;

function escapeCsvField(value: string): string {
  const needsQuoting = /[";\n\r]/.test(value);
  const escaped = value.replace(/"/g, '""');
  return needsQuoting ? `"${escaped}"` : escaped;
}

function amountToCsvNumber(amountCents: number): string {
  // "234,50" — vírgula decimal, sem separador de milhar (mais seguro para
  // reimportação do que "R$ 234,50" formatado).
  return fromCents(amountCents).toFixed(2).replace(".", ",");
}

const SOURCE_LABEL: Record<Transaction["source"], string> = {
  manual: "Manual",
  share_intent: "Comprovante compartilhado",
  gallery: "Comprovante da galeria",
  recurring_generated: "Recorrência",
};

const TYPE_LABEL: Record<Transaction["type"], string> = {
  income: "Receita",
  expense: "Despesa",
};

export interface BuildCsvOptions {
  /** Lançamentos a exportar, idealmente já ordenados por data. */
  transactions: readonly Transaction[];
  categories: readonly Category[];
  payees: readonly Payee[];
  /** Opcional: usado para preencher a coluna "Anexo" com o nome do arquivo. */
  attachmentsByTransactionId?: ReadonlyMap<string, readonly Attachment[]>;
}

/** Monta o conteúdo do CSV (com BOM) a partir dos lançamentos informados. */
export function buildTransactionsCsv(options: BuildCsvOptions): string {
  const { transactions, categories, payees, attachmentsByTransactionId } = options;

  const categoryNameById = new Map(categories.map((c) => [c.id, c.name]));
  const payeeNameById = new Map(payees.map((p) => [p.id, p.name]));

  const lines: string[] = [CSV_HEADERS.join(CSV_DELIMITER)];

  for (const tx of transactions) {
    const attachment = attachmentsByTransactionId?.get(tx.id)?.[0];
    const row = [
      formatDateBR(tx.occurredAt),
      tx.description,
      TYPE_LABEL[tx.type],
      amountToCsvNumber(tx.amountCents),
      (tx.categoryId && categoryNameById.get(tx.categoryId)) || "",
      (tx.payeeId && payeeNameById.get(tx.payeeId)) || "",
      tx.paymentMethod ?? "",
      tx.notes ?? "",
      SOURCE_LABEL[tx.source],
      attachment?.fileName ?? "",
    ];
    lines.push(row.map((field) => escapeCsvField(String(field))).join(CSV_DELIMITER));
  }

  const BOM = "﻿";
  return BOM + lines.join("\r\n") + "\r\n";
}

/** Nome de arquivo padrão para um export, ex.: "nexus_backup_2026-09-04_1830.csv". */
export function buildBackupFileName(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `nexus_backup_${y}-${m}-${d}_${hh}${mm}.csv`;
}
