import type { NewTransaction, PaymentMethod, TransactionType } from "./types.js";
import { toCents } from "./format.js";

/**
 * Import de CSV — o par de `buildTransactionsCsv` (csv.ts). Mesmo delimitador
 * (`;`) e mesmas colunas do export, para que o próprio backup do usuário
 * sirva como arquivo de import. As colunas de categoria/pagador vêm como
 * texto (nome), não id — resolver para um id é responsabilidade da camada
 * de dados do app (o nome pode não existir ainda, ou pode ter mais de uma
 * categoria com o mesmo nome).
 */

const CSV_DELIMITER = ";";

const HEADER_ALIASES: Record<string, keyof ParsedRow | "amount" | "type"> = {
  data: "occurredAt",
  descrição: "description",
  descricao: "description",
  tipo: "type",
  valor: "amount",
  categoria: "categoryName",
  "pagador/recebedor": "payeeName",
  pagador: "payeeName",
  recebedor: "payeeName",
  "forma de pagamento": "paymentMethod",
  observações: "notes",
  observacoes: "notes",
};

const TYPE_ALIASES: Record<string, TransactionType> = {
  receita: "income",
  income: "income",
  entrada: "income",
  despesa: "expense",
  expense: "expense",
  saída: "expense",
  saida: "expense",
};

const PAYMENT_METHOD_VALUES: ReadonlySet<PaymentMethod> = new Set(["pix", "pix_automatico", "ted", "cartao", "dinheiro", "boleto", "outro"]);

export interface ParsedRow {
  lineNumber: number;
  type: TransactionType | null;
  amountCents: number | null;
  occurredAt: string | null; // ISO, ou null se não reconhecido
  description: string;
  categoryName: string | null;
  payeeName: string | null;
  paymentMethod: PaymentMethod | null;
  notes: string | null;
  errors: string[];
}

/** `true` quando a linha tem os campos mínimos pra virar um lançamento. */
export function isRowImportable(row: ParsedRow): boolean {
  return row.errors.length === 0 && row.type !== null && row.amountCents !== null && row.occurredAt !== null && row.description.length > 0;
}

export function rowToNewTransaction(row: ParsedRow, categoryId: string | null, payeeId: string | null): NewTransaction {
  return {
    type: row.type!,
    amountCents: row.amountCents!,
    currency: "BRL",
    occurredAt: row.occurredAt!,
    description: row.description,
    categoryId,
    payeeId,
    paymentMethod: row.paymentMethod,
    notes: row.notes,
    source: "manual",
  };
}

function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === CSV_DELIMITER) {
      fields.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

/** Tokeniza o CSV inteiro em linhas de campos, respeitando aspas com quebra de linha dentro. */
function tokenizeCsv(text: string): string[][] {
  const withoutBom = text.replace(/^﻿/, "");
  const normalized = withoutBom.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const rows: string[][] = [];
  let line = "";
  let quoteCount = 0;
  for (const rawLine of normalized.split("\n")) {
    line = line ? `${line}\n${rawLine}` : rawLine;
    quoteCount = (line.match(/"/g) ?? []).length;
    if (quoteCount % 2 === 0) {
      if (line.length > 0) rows.push(splitCsvLine(line));
      line = "";
    }
  }
  if (line) rows.push(splitCsvLine(line));
  return rows;
}

function parseAmount(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const normalized = trimmed.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  if (!/\d/.test(normalized)) return null; // nada de dígito sobrou (ex.: "abc")
  const value = Number(normalized);
  return Number.isFinite(value) ? toCents(Math.abs(value)) : null;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function validDate(year: number, month: number, day: number): boolean {
  return month >= 1 && month <= 12 && day >= 1 && day <= daysInMonth(year, month);
}

function parseDate(raw: string): string | null {
  const trimmed = raw.trim();
  const br = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed);
  if (br) {
    const [, d, m, y] = br;
    const day = Number(d), month = Number(m), year = Number(y);
    if (!validDate(year, month, day)) return null;
    return `${y}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
  }
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (iso) {
    const [, y, m, d] = iso;
    if (!validDate(Number(y), Number(m), Number(d))) return null;
    return trimmed;
  }
  return null;
}

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase();
}

export function parseTransactionsCsv(csvText: string): ParsedRow[] {
  const rows = tokenizeCsv(csvText);
  if (rows.length === 0) return [];

  const header = rows[0]!.map(normalizeHeader);
  const colIndex = new Map<string, number>();
  header.forEach((h, i) => {
    const mapped = HEADER_ALIASES[h];
    if (mapped) colIndex.set(mapped, i);
  });

  const get = (fields: string[], key: string) => {
    const idx = colIndex.get(key);
    return idx === undefined ? "" : (fields[idx] ?? "").trim();
  };

  const parsed: ParsedRow[] = [];
  for (let i = 1; i < rows.length; i++) {
    const fields = rows[i]!;
    if (fields.length === 1 && fields[0] === "") continue; // linha em branco

    const errors: string[] = [];
    const typeRaw = get(fields, "type").toLowerCase();
    const type = TYPE_ALIASES[typeRaw] ?? null;
    if (!type) errors.push(`Tipo desconhecido: "${get(fields, "type")}" (use Receita ou Despesa)`);

    const amountCents = parseAmount(get(fields, "amount"));
    if (amountCents === null) errors.push(`Valor inválido: "${get(fields, "amount")}"`);

    const occurredAt = parseDate(get(fields, "occurredAt"));
    if (!occurredAt) errors.push(`Data inválida: "${get(fields, "occurredAt")}" (use dd/mm/aaaa)`);

    const description = get(fields, "description");
    if (!description) errors.push("Descrição em branco");

    const paymentMethodRaw = get(fields, "paymentMethod").toLowerCase();
    const paymentMethod = PAYMENT_METHOD_VALUES.has(paymentMethodRaw as PaymentMethod) ? (paymentMethodRaw as PaymentMethod) : null;

    parsed.push({
      lineNumber: i + 1,
      type,
      amountCents,
      occurredAt,
      description,
      categoryName: get(fields, "categoryName") || null,
      payeeName: get(fields, "payeeName") || null,
      paymentMethod,
      notes: get(fields, "notes") || null,
      errors,
    });
  }

  return parsed;
}

/** Modelo de CSV para o usuário preencher e reimportar — mesmas colunas do export. */
export function buildImportTemplateCsv(): string {
  const headers = ["Data", "Descrição", "Tipo", "Valor", "Categoria", "Pagador/Recebedor", "Forma de pagamento", "Observações"];
  const example = ["04/09/2026", "Mercado Extra", "Despesa", "234,50", "Alimentação", "Mercado Extra Ltda", "pix", ""];
  const BOM = "﻿";
  return BOM + [headers.join(CSV_DELIMITER), example.join(CSV_DELIMITER)].join("\r\n") + "\r\n";
}
