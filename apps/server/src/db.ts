import { DatabaseSync } from "node:sqlite";
import type {
  Account,
  Attachment,
  BackupSettings,
  Category,
  NewAccount,
  NewPendingItem,
  NewTransaction,
  Payee,
  PendingItem,
  RecurringTransaction,
  Transaction,
} from "@nexus/core";
import { DB_PATH } from "./config.js";
import { runMigrations } from "./migrate.js";

/**
 * Camada de acesso a dados do servidor — schema idêntico ao de
 * `packages/core/src/schema.sql` (migrations copiadas de
 * `apps/desktop/src-tauri/migrations/`). Espelha 1:1 as funções que
 * existiam em `apps/desktop/src/lib/db.ts` (mesmos nomes, mesmo
 * comportamento), só trocando `@tauri-apps/plugin-sql` (assíncrono,
 * placeholders `$1,$2`) por `node:sqlite` (síncrono, placeholders `?`) — o
 * módulo SQLite embutido do próprio Node, sem dependência nativa nenhuma
 * pra compilar (evita a dor de cabeça de node-gyp/Visual Studio no Windows
 * e simplifica a imagem Docker).
 */

const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");
runMigrations(db);

export function getRawDb(): DatabaseSync {
  return db;
}

const toBool = (v: number) => v === 1;
const toIntBool = (v: boolean) => (v ? 1 : 0);
const qMarks = (n: number) => Array.from({ length: n }, () => "?").join(",");

// ---------------------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------------------

interface CategoryRow {
  id: string;
  name: string;
  type: Category["type"];
  icon: string | null;
  color: string;
  is_default: number;
  created_at: string;
  updated_at: string;
}

function mapCategory(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    icon: row.icon,
    color: row.color,
    isDefault: toBool(row.is_default),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listCategories(): Category[] {
  const rows = db.prepare("SELECT * FROM categories ORDER BY name ASC").all() as unknown as CategoryRow[];
  return rows.map(mapCategory);
}

export function insertCategory(cat: Omit<Category, "createdAt" | "updatedAt">): void {
  db.prepare(`INSERT INTO categories (id, name, type, icon, color, is_default) VALUES (?,?,?,?,?,?)`).run(
    cat.id,
    cat.name,
    cat.type,
    cat.icon,
    cat.color,
    toIntBool(cat.isDefault),
  );
}

/** Cria uma categoria nova (do usuário) — gera o id, ao contrário de `insertCategory` (usada pelas categorias padrão, com id fixo). */
export function createCategory(cat: Omit<Category, "id" | "createdAt" | "updatedAt" | "isDefault">): string {
  const id = crypto.randomUUID();
  insertCategory({ ...cat, id, isDefault: false });
  return id;
}

export function updateCategory(id: string, cat: Omit<Category, "id" | "createdAt" | "updatedAt" | "isDefault">): void {
  db.prepare(`UPDATE categories SET name = ?, type = ?, icon = ?, color = ?, updated_at = datetime('now') WHERE id = ?`).run(
    cat.name,
    cat.type,
    cat.icon,
    cat.color,
    id,
  );
}

/** Apaga a categoria e solta o vínculo de tudo que a usava (lançamentos, recorrências, pendências) — não apaga histórico. */
export function deleteCategoryKeepingHistory(id: string): void {
  db.prepare("UPDATE transactions SET category_id = NULL WHERE category_id = ?").run(id);
  db.prepare("UPDATE recurring_transactions SET category_id = NULL WHERE category_id = ?").run(id);
  db.prepare("UPDATE pending_items SET category_id = NULL WHERE category_id = ?").run(id);
  db.prepare("DELETE FROM categories WHERE id = ?").run(id);
}

// ---------------------------------------------------------------------------
// Pagadores / recebedores
// ---------------------------------------------------------------------------

interface PayeeRow {
  id: string;
  name: string;
  document: string | null;
  notes: string | null;
  created_at: string;
}

function mapPayee(row: PayeeRow): Payee {
  return { id: row.id, name: row.name, document: row.document, notes: row.notes, createdAt: row.created_at };
}

export function listPayees(): Payee[] {
  const rows = db.prepare("SELECT * FROM payees ORDER BY name ASC").all() as unknown as PayeeRow[];
  return rows.map(mapPayee);
}

/** Busca um payee pelo nome (case-insensitive) ou cria um novo. Usado no formulário de lançamento. */
export function findOrCreatePayee(name: string): string {
  const trimmed = name.trim();
  const existing = db.prepare("SELECT * FROM payees WHERE lower(name) = lower(?) LIMIT 1").get(trimmed) as unknown as PayeeRow | undefined;
  if (existing) return existing.id;
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO payees (id, name) VALUES (?,?)").run(id, trimmed);
  return id;
}

// ---------------------------------------------------------------------------
// Contas (bancárias ou "Carteira Física")
// ---------------------------------------------------------------------------

interface AccountRow {
  id: string;
  name: string;
  bank: string | null;
  agency: string | null;
  account_number: string | null;
  color: string;
  is_default: number;
  created_at: string;
  updated_at: string;
}

function mapAccount(row: AccountRow): Account {
  return {
    id: row.id,
    name: row.name,
    bank: row.bank,
    agency: row.agency,
    accountNumber: row.account_number,
    color: row.color,
    isDefault: toBool(row.is_default),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listAccounts(): Account[] {
  const rows = db.prepare("SELECT * FROM accounts ORDER BY is_default DESC, name ASC").all() as unknown as AccountRow[];
  return rows.map(mapAccount);
}

export function insertAccount(a: NewAccount): string {
  const id = crypto.randomUUID();
  db.prepare(`INSERT INTO accounts (id, name, bank, agency, account_number, color, is_default) VALUES (?,?,?,?,?,?,?)`).run(
    id,
    a.name,
    a.bank ?? null,
    a.agency ?? null,
    a.accountNumber ?? null,
    a.color,
    toIntBool(a.isDefault ?? false),
  );
  return id;
}

export function updateAccount(id: string, a: NewAccount): void {
  db.prepare(`UPDATE accounts SET name = ?, bank = ?, agency = ?, account_number = ?, color = ?, updated_at = datetime('now') WHERE id = ?`).run(
    a.name,
    a.bank ?? null,
    a.agency ?? null,
    a.accountNumber ?? null,
    a.color,
    id,
  );
}

/** Apaga a conta e solta o vínculo dos lançamentos que a usavam (não apaga o histórico). */
export function deleteAccountKeepingHistory(id: string): void {
  db.prepare("UPDATE transactions SET account_id = NULL WHERE account_id = ?").run(id);
  db.prepare("UPDATE recurring_transactions SET account_id = NULL WHERE account_id = ?").run(id);
  db.prepare("DELETE FROM accounts WHERE id = ?").run(id);
}

// ---------------------------------------------------------------------------
// Lançamentos
// ---------------------------------------------------------------------------

interface TransactionRow {
  id: string;
  type: Transaction["type"];
  amount_cents: number;
  currency: string;
  occurred_at: string;
  description: string;
  category_id: string | null;
  payee_id: string | null;
  account_id: string | null;
  payment_method: Transaction["paymentMethod"];
  notes: string | null;
  source: Transaction["source"];
  ocr_raw_text: string | null;
  ocr_confidence: number | null;
  recurring_transaction_id: string | null;
  is_reconciled: number;
  created_at: string;
  updated_at: string;
}

function mapTransaction(row: TransactionRow): Transaction {
  return {
    id: row.id,
    type: row.type,
    amountCents: row.amount_cents,
    currency: row.currency,
    occurredAt: row.occurred_at,
    description: row.description,
    categoryId: row.category_id,
    payeeId: row.payee_id,
    accountId: row.account_id,
    paymentMethod: row.payment_method,
    notes: row.notes,
    source: row.source,
    ocrRawText: row.ocr_raw_text,
    ocrConfidence: row.ocr_confidence,
    recurringTransactionId: row.recurring_transaction_id,
    isReconciled: toBool(row.is_reconciled),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface TransactionFilter {
  type?: "income" | "expense";
  fromDate?: string;
  toDate?: string;
  limit?: number;
}

export function listTransactions(filter: TransactionFilter = {}): Transaction[] {
  const clauses: string[] = [];
  const params: Array<string | number> = [];

  if (filter.type) {
    clauses.push("type = ?");
    params.push(filter.type);
  }
  if (filter.fromDate) {
    clauses.push("occurred_at >= ?");
    params.push(filter.fromDate);
  }
  if (filter.toDate) {
    clauses.push("occurred_at <= ?");
    params.push(filter.toDate);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = filter.limit ? `LIMIT ${Number(filter.limit)}` : "";
  const rows = db
    .prepare(`SELECT * FROM transactions ${where} ORDER BY occurred_at DESC, created_at DESC ${limit}`)
    .all(...params) as unknown as TransactionRow[];
  return rows.map(mapTransaction);
}

export function insertTransaction(tx: NewTransaction): string {
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO transactions
      (id, type, amount_cents, currency, occurred_at, description, category_id, payee_id, account_id,
       payment_method, notes, source, ocr_raw_text, ocr_confidence, recurring_transaction_id, is_reconciled)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    id,
    tx.type,
    tx.amountCents,
    tx.currency ?? "BRL",
    tx.occurredAt,
    tx.description,
    tx.categoryId ?? null,
    tx.payeeId ?? null,
    tx.accountId ?? null,
    tx.paymentMethod ?? null,
    tx.notes ?? null,
    tx.source ?? "manual",
    tx.ocrRawText ?? null,
    tx.ocrConfidence ?? null,
    tx.recurringTransactionId ?? null,
    toIntBool(tx.isReconciled ?? false),
  );
  return id;
}

export function updateTransaction(id: string, tx: NewTransaction): void {
  db.prepare(
    `UPDATE transactions SET
      type = ?, amount_cents = ?, currency = ?, occurred_at = ?, description = ?,
      category_id = ?, payee_id = ?, account_id = ?, payment_method = ?, notes = ?, is_reconciled = ?, updated_at = datetime('now')
     WHERE id = ?`,
  ).run(
    tx.type,
    tx.amountCents,
    tx.currency ?? "BRL",
    tx.occurredAt,
    tx.description,
    tx.categoryId ?? null,
    tx.payeeId ?? null,
    tx.accountId ?? null,
    tx.paymentMethod ?? null,
    tx.notes ?? null,
    toIntBool(tx.isReconciled ?? false),
    id,
  );
}

export function deleteTransaction(id: string): void {
  db.prepare("DELETE FROM transactions WHERE id = ?").run(id);
}

/** Apaga vários lançamentos de uma vez (seleção múltipla) — um DELETE só, não N. */
export function deleteTransactions(ids: string[]): void {
  if (ids.length === 0) return;
  db.prepare(`DELETE FROM transactions WHERE id IN (${qMarks(ids.length)})`).run(...ids);
}

/** Marca um lançamento como efetivado (pago/recebido) ou não. */
export function setTransactionReconciled(id: string, reconciled: boolean): void {
  db.prepare("UPDATE transactions SET is_reconciled = ?, updated_at = datetime('now') WHERE id = ?").run(toIntBool(reconciled), id);
}

/** Só a data — usado pelo drag'n'drop do Fluxo de Trabalho pra reagendar um lançamento existente. */
export function setTransactionDate(id: string, occurredAt: string): void {
  db.prepare("UPDATE transactions SET occurred_at = ?, updated_at = datetime('now') WHERE id = ?").run(occurredAt, id);
}

// ---------------------------------------------------------------------------
// Pendências avulsas (lembretes sem data)
// ---------------------------------------------------------------------------

interface PendingItemRow {
  id: string;
  type: PendingItem["type"];
  description: string;
  amount_cents: number;
  category_id: string | null;
  payee_id: string | null;
  recurring_transaction_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function mapPendingItem(row: PendingItemRow): PendingItem {
  return {
    id: row.id,
    type: row.type,
    description: row.description,
    amountCents: row.amount_cents,
    categoryId: row.category_id,
    payeeId: row.payee_id,
    recurringTransactionId: row.recurring_transaction_id,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function listPendingItems(): PendingItem[] {
  const rows = db.prepare("SELECT * FROM pending_items ORDER BY created_at DESC").all() as unknown as PendingItemRow[];
  return rows.map(mapPendingItem);
}

export function insertPendingItem(item: NewPendingItem): string {
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO pending_items (id, type, description, amount_cents, category_id, payee_id, recurring_transaction_id, notes)
     VALUES (?,?,?,?,?,?,?,?)`,
  ).run(
    id,
    item.type,
    item.description,
    item.amountCents,
    item.categoryId ?? null,
    item.payeeId ?? null,
    item.recurringTransactionId ?? null,
    item.notes ?? null,
  );
  return id;
}

export function deletePendingItem(id: string): void {
  db.prepare("DELETE FROM pending_items WHERE id = ?").run(id);
}

// ---------------------------------------------------------------------------
// Recorrências
// ---------------------------------------------------------------------------

interface RecurringRow {
  id: string;
  type: RecurringTransaction["type"];
  description: string;
  amount_cents: number;
  category_id: string | null;
  payee_id: string | null;
  account_id: string | null;
  payment_method: RecurringTransaction["paymentMethod"];
  recurrence_kind: RecurringTransaction["recurrenceKind"];
  frequency: RecurringTransaction["frequency"];
  interval_count: number;
  due_day: number | null;
  start_date: string;
  end_date: string | null;
  total_installments: number | null;
  installments_generated: number;
  notes: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

function mapRecurring(row: RecurringRow): RecurringTransaction {
  return {
    id: row.id,
    type: row.type,
    description: row.description,
    amountCents: row.amount_cents,
    categoryId: row.category_id,
    payeeId: row.payee_id,
    accountId: row.account_id,
    paymentMethod: row.payment_method,
    recurrenceKind: row.recurrence_kind,
    frequency: row.frequency,
    intervalCount: row.interval_count,
    dueDay: row.due_day,
    startDate: row.start_date,
    endDate: row.end_date,
    totalInstallments: row.total_installments,
    installmentsGenerated: row.installments_generated,
    notes: row.notes,
    isActive: toBool(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type NewRecurring = Omit<RecurringTransaction, "id" | "createdAt" | "updatedAt" | "installmentsGenerated"> & {
  installmentsGenerated?: number;
};

export function listRecurringTransactions(): RecurringTransaction[] {
  const rows = db.prepare("SELECT * FROM recurring_transactions ORDER BY is_active DESC, description ASC").all() as unknown as RecurringRow[];
  return rows.map(mapRecurring);
}

export function insertRecurringTransaction(r: NewRecurring): string {
  const id = crypto.randomUUID();
  db.prepare(
    `INSERT INTO recurring_transactions
      (id, type, description, amount_cents, category_id, payee_id, account_id, payment_method, recurrence_kind, frequency,
       interval_count, due_day, start_date, end_date, total_installments, installments_generated, notes, is_active)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
  ).run(
    id,
    r.type,
    r.description,
    r.amountCents,
    r.categoryId ?? null,
    r.payeeId ?? null,
    r.accountId ?? null,
    r.paymentMethod ?? null,
    r.recurrenceKind,
    r.frequency,
    r.intervalCount,
    r.dueDay ?? null,
    r.startDate,
    r.endDate ?? null,
    r.totalInstallments ?? null,
    r.installmentsGenerated ?? 0,
    r.notes ?? null,
    toIntBool(r.isActive),
  );
  return id;
}

export function updateRecurringTransaction(id: string, r: NewRecurring): void {
  db.prepare(
    `UPDATE recurring_transactions SET
      type = ?, description = ?, amount_cents = ?, category_id = ?, payee_id = ?, account_id = ?, payment_method = ?,
      recurrence_kind = ?, frequency = ?, interval_count = ?, due_day = ?, start_date = ?,
      end_date = ?, total_installments = ?, notes = ?, is_active = ?, updated_at = datetime('now')
     WHERE id = ?`,
  ).run(
    r.type,
    r.description,
    r.amountCents,
    r.categoryId ?? null,
    r.payeeId ?? null,
    r.accountId ?? null,
    r.paymentMethod ?? null,
    r.recurrenceKind,
    r.frequency,
    r.intervalCount,
    r.dueDay ?? null,
    r.startDate,
    r.endDate ?? null,
    r.totalInstallments ?? null,
    r.notes ?? null,
    toIntBool(r.isActive),
    id,
  );
}

export function deleteRecurringTransaction(id: string): void {
  db.prepare("DELETE FROM recurring_transactions WHERE id = ?").run(id);
}

export function incrementInstallmentsGenerated(id: string): void {
  db.prepare("UPDATE recurring_transactions SET installments_generated = installments_generated + 1 WHERE id = ?").run(id);
}

/** Cria uma cópia independente da recorrência — série de parcelas, se houver, recomeça do zero. Carrega a original do banco pelo id (o cliente não precisa mandar o objeto inteiro). */
export function duplicateRecurringTransaction(id: string): string {
  const row = db.prepare("SELECT * FROM recurring_transactions WHERE id = ?").get(id) as unknown as RecurringRow | undefined;
  if (!row) throw new Error(`Recorrência não encontrada: ${id}`);
  const r = mapRecurring(row);
  return insertRecurringTransaction({
    type: r.type,
    description: `${r.description} (cópia)`,
    amountCents: r.amountCents,
    categoryId: r.categoryId,
    payeeId: r.payeeId,
    accountId: r.accountId,
    paymentMethod: r.paymentMethod,
    recurrenceKind: r.recurrenceKind,
    frequency: r.frequency,
    intervalCount: r.intervalCount,
    dueDay: r.dueDay,
    startDate: r.startDate,
    endDate: r.endDate,
    totalInstallments: r.totalInstallments,
    installmentsGenerated: 0,
    notes: r.notes,
    isActive: r.isActive,
  });
}

/**
 * Solta o vínculo dos lançamentos já gerados por uma recorrência, sem
 * apagá-los — usado antes de deletar a recorrência (ou encerrá-la numa data
 * específica) pra manter o histórico financeiro intacto, só perdendo a
 * referência de onde aquele lançamento veio.
 */
export function unlinkTransactionsFromRecurring(recurringId: string): void {
  db.prepare("UPDATE transactions SET recurring_transaction_id = NULL WHERE recurring_transaction_id = ?").run(recurringId);
}

/** "Deletar toda a recorrência", mantendo o histórico: solta o vínculo dos lançamentos já gerados, depois apaga a regra. */
export function deleteRecurringKeepingHistory(id: string): void {
  unlinkTransactionsFromRecurring(id);
  deleteRecurringTransaction(id);
}

// ---------------------------------------------------------------------------
// Exclusões de ocorrência ("deletar só este mês")
// ---------------------------------------------------------------------------

/** Todas as exclusões, como `${recurringId}:${data}` — pronto pra virar um Set no cliente. */
export function listRecurringExclusions(): string[] {
  const rows = db.prepare("SELECT recurring_transaction_id, occurrence_date FROM recurring_exclusions").all() as unknown as Array<{
    recurring_transaction_id: string;
    occurrence_date: string;
  }>;
  return rows.map((r) => `${r.recurring_transaction_id}:${r.occurrence_date}`);
}

export function addRecurringExclusion(recurringId: string, occurrenceDate: string): void {
  db.prepare("INSERT OR IGNORE INTO recurring_exclusions (recurring_transaction_id, occurrence_date) VALUES (?,?)").run(
    recurringId,
    occurrenceDate,
  );
}

// ---------------------------------------------------------------------------
// Anexos
// ---------------------------------------------------------------------------

export function listAttachmentsByTransaction(transactionIds: string[]): Map<string, Attachment[]> {
  if (transactionIds.length === 0) return new Map();
  const rows = db
    .prepare(`SELECT * FROM attachments WHERE transaction_id IN (${qMarks(transactionIds.length)})`)
    .all(...transactionIds) as unknown as Array<{
    id: string;
    transaction_id: string;
    file_path: string;
    file_name: string;
    mime_type: string;
    file_size_bytes: number | null;
    checksum_sha256: string | null;
    created_at: string;
  }>;

  const map = new Map<string, Attachment[]>();
  for (const row of rows) {
    const attachment: Attachment = {
      id: row.id,
      transactionId: row.transaction_id,
      filePath: row.file_path,
      fileName: row.file_name,
      mimeType: row.mime_type,
      fileSizeBytes: row.file_size_bytes,
      checksumSha256: row.checksum_sha256,
      createdAt: row.created_at,
    };
    const list = map.get(row.transaction_id) ?? [];
    list.push(attachment);
    map.set(row.transaction_id, list);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Configuração de backup
// ---------------------------------------------------------------------------

interface BackupSettingsRow {
  id: 1;
  export_directory: string;
  frequency_hours: number;
  last_export_at: string | null;
  last_export_status: BackupSettings["lastExportStatus"];
  last_export_file: string | null;
  enabled: number;
}

function mapBackupSettings(row: BackupSettingsRow): BackupSettings {
  return {
    id: 1,
    exportDirectory: row.export_directory,
    frequencyHours: row.frequency_hours,
    lastExportAt: row.last_export_at,
    lastExportStatus: row.last_export_status,
    lastExportFile: row.last_export_file,
    enabled: toBool(row.enabled),
  };
}

export function getBackupSettings(): BackupSettings | null {
  const row = db.prepare("SELECT * FROM backup_settings WHERE id = 1").get() as unknown as BackupSettingsRow | undefined;
  return row ? mapBackupSettings(row) : null;
}

export function saveBackupDirectory(directory: string, frequencyHours = 12): void {
  db.prepare(
    `INSERT INTO backup_settings (id, export_directory, frequency_hours, enabled)
     VALUES (1, ?, ?, 1)
     ON CONFLICT(id) DO UPDATE SET export_directory = excluded.export_directory, frequency_hours = excluded.frequency_hours`,
  ).run(directory, frequencyHours);
}

export function setBackupEnabled(enabled: boolean): void {
  db.prepare("UPDATE backup_settings SET enabled = ? WHERE id = 1").run(toIntBool(enabled));
}

export function recordBackupResult(result: {
  status: "success" | "failed";
  filePath: string | null;
  rowsExported: number | null;
  errorMessage: string | null;
}): void {
  const now = new Date().toISOString();
  db.prepare(`UPDATE backup_settings SET last_export_at = ?, last_export_status = ?, last_export_file = ? WHERE id = 1`).run(
    now,
    result.status,
    result.filePath,
  );
  db.prepare(`INSERT INTO backup_log (ran_at, status, rows_exported, file_path, error_message) VALUES (?,?,?,?,?)`).run(
    now,
    result.status,
    result.rowsExported,
    result.filePath,
    result.errorMessage,
  );
}

export interface BackupLogEntryRow {
  id: number;
  ran_at: string;
  status: "success" | "failed";
  rows_exported: number | null;
  file_path: string | null;
  error_message: string | null;
}

export function listBackupLog(limit = 10): BackupLogEntryRow[] {
  return db.prepare(`SELECT * FROM backup_log ORDER BY ran_at DESC LIMIT ?`).all(limit) as unknown as BackupLogEntryRow[];
}

// ---------------------------------------------------------------------------
// Reset total (Zona de Perigo)
// ---------------------------------------------------------------------------

/**
 * Apaga TODOS os dados do usuário — lançamentos, recorrências, pendências,
 * exclusões de ocorrência, anexos, pagadores/recebedores e categorias — pra
 * recomeçar do zero. Não mexe em `backup_settings`/`backup_log`. Depois de
 * chamar isso, o chamador deve repor as categorias padrão.
 */
export function resetAllData(): void {
  db.exec("BEGIN");
  try {
    db.exec("DELETE FROM attachments");
    db.exec("DELETE FROM pending_items");
    db.exec("DELETE FROM transactions");
    db.exec("DELETE FROM recurring_exclusions");
    db.exec("DELETE FROM recurring_transactions");
    db.exec("DELETE FROM payees");
    db.exec("DELETE FROM categories");
    db.exec("DELETE FROM accounts");
    db.exec("COMMIT");
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}
