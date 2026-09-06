import { getRawDb } from "./db.js";

/**
 * Importação em lote — caminho SEPARADO do CRUD normal, usado só pela
 * migração única dos dados do SQLite local do Desktop pro servidor (ver
 * scripts/migrate-local-to-server.mjs na raiz do monorepo). Ao contrário do
 * CRUD normal (que gera id novo), aqui os ids e timestamps originais são
 * preservados — é uma cópia, não uma criação. `INSERT OR REPLACE` faz a
 * importação ser segura de rodar de novo (idempotente) se algo falhar no
 * meio do caminho.
 */

const toIntBool = (v: boolean) => (v ? 1 : 0);
/** `recurringTransactions`/`transactions`/`pendingItems` chegam como `Record<string, unknown>` (formato solto, definido pelo script de migração) — sem essa conversão o TS não aceita passar os valores pro `.run()`. */
const v = (x: unknown) => x as string | number | null;

export interface ImportPayload {
  categories?: Array<{
    id: string;
    name: string;
    type: string;
    icon: string | null;
    color: string;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  payees?: Array<{ id: string; name: string; document: string | null; notes: string | null; createdAt: string }>;
  accounts?: Array<{
    id: string;
    name: string;
    bank: string | null;
    agency: string | null;
    accountNumber: string | null;
    color: string;
    isDefault: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  recurringTransactions?: Array<Record<string, unknown>>;
  transactions?: Array<Record<string, unknown>>;
  pendingItems?: Array<Record<string, unknown>>;
  recurringExclusions?: Array<{ recurringTransactionId: string; occurrenceDate: string }>;
}

export interface ImportResult {
  categories: number;
  payees: number;
  accounts: number;
  recurringTransactions: number;
  transactions: number;
  pendingItems: number;
  recurringExclusions: number;
}

/** Ordem importa: quem é referenciado (categorias/contas/pagadores) entra antes de quem referencia (transações/recorrências/pendências). */
export function importAll(payload: ImportPayload): ImportResult {
  const db = getRawDb();
  const result: ImportResult = {
    categories: 0,
    payees: 0,
    accounts: 0,
    recurringTransactions: 0,
    transactions: 0,
    pendingItems: 0,
    recurringExclusions: 0,
  };

  db.exec("BEGIN");
  try {
    for (const c of payload.categories ?? []) {
      db.prepare(
        `INSERT OR REPLACE INTO categories (id, name, type, icon, color, is_default, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)`,
      ).run(c.id, c.name, c.type, c.icon, c.color, toIntBool(c.isDefault), c.createdAt, c.updatedAt);
      result.categories++;
    }

    for (const p of payload.payees ?? []) {
      db.prepare(`INSERT OR REPLACE INTO payees (id, name, document, notes, created_at) VALUES (?,?,?,?,?)`).run(
        p.id,
        p.name,
        p.document,
        p.notes,
        p.createdAt,
      );
      result.payees++;
    }

    for (const a of payload.accounts ?? []) {
      db.prepare(
        `INSERT OR REPLACE INTO accounts (id, name, bank, agency, account_number, color, is_default, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)`,
      ).run(a.id, a.name, a.bank, a.agency, a.accountNumber, a.color, toIntBool(a.isDefault), a.createdAt, a.updatedAt);
      result.accounts++;
    }

    for (const r of payload.recurringTransactions ?? []) {
      db.prepare(
        `INSERT OR REPLACE INTO recurring_transactions
          (id, type, description, amount_cents, category_id, payee_id, account_id, payment_method, recurrence_kind, frequency,
           interval_count, due_day, start_date, end_date, total_installments, installments_generated, notes, is_active, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      ).run(
        v(r.id),
        v(r.type),
        v(r.description),
        v(r.amountCents),
        v(r.categoryId ?? null),
        v(r.payeeId ?? null),
        v(r.accountId ?? null),
        v(r.paymentMethod ?? null),
        v(r.recurrenceKind),
        v(r.frequency),
        v(r.intervalCount),
        v(r.dueDay ?? null),
        v(r.startDate),
        v(r.endDate ?? null),
        v(r.totalInstallments ?? null),
        v(r.installmentsGenerated ?? 0),
        v(r.notes ?? null),
        toIntBool(Boolean(r.isActive)),
        v(r.createdAt),
        v(r.updatedAt),
      );
      result.recurringTransactions++;
    }

    for (const t of payload.transactions ?? []) {
      db.prepare(
        `INSERT OR REPLACE INTO transactions
          (id, type, amount_cents, currency, occurred_at, description, category_id, payee_id, account_id,
           payment_method, notes, source, ocr_raw_text, ocr_confidence, recurring_transaction_id, is_reconciled, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      ).run(
        v(t.id),
        v(t.type),
        v(t.amountCents),
        v(t.currency ?? "BRL"),
        v(t.occurredAt),
        v(t.description),
        v(t.categoryId ?? null),
        v(t.payeeId ?? null),
        v(t.accountId ?? null),
        v(t.paymentMethod ?? null),
        v(t.notes ?? null),
        v(t.source ?? "manual"),
        v(t.ocrRawText ?? null),
        v(t.ocrConfidence ?? null),
        v(t.recurringTransactionId ?? null),
        toIntBool(Boolean(t.isReconciled)),
        v(t.createdAt),
        v(t.updatedAt),
      );
      result.transactions++;
    }

    for (const p of payload.pendingItems ?? []) {
      db.prepare(
        `INSERT OR REPLACE INTO pending_items (id, type, description, amount_cents, category_id, payee_id, recurring_transaction_id, notes, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?)`,
      ).run(
        v(p.id),
        v(p.type),
        v(p.description),
        v(p.amountCents),
        v(p.categoryId ?? null),
        v(p.payeeId ?? null),
        v(p.recurringTransactionId ?? null),
        v(p.notes ?? null),
        v(p.createdAt),
        v(p.updatedAt),
      );
      result.pendingItems++;
    }

    for (const e of payload.recurringExclusions ?? []) {
      db.prepare(`INSERT OR IGNORE INTO recurring_exclusions (recurring_transaction_id, occurrence_date) VALUES (?,?)`).run(
        e.recurringTransactionId,
        e.occurrenceDate,
      );
      result.recurringExclusions++;
    }

    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }

  return result;
}
