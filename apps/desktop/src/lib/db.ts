import Database from "@tauri-apps/plugin-sql";
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

/**
 * Camada de acesso a dados do Desktop. O schema é o mesmo de
 * `packages/core/src/schema.sql` (aplicado via migration no Rust, ver
 * src-tauri/src/lib.rs); aqui só existe o mapeamento snake_case <-> camelCase
 * e as queries usadas pelas telas.
 */

let dbPromise: ReturnType<typeof Database.load> | null = null;

export function getDb() {
  if (!dbPromise) dbPromise = Database.load("sqlite:nexus.db");
  return dbPromise;
}

const toBool = (v: number) => v === 1;
const toIntBool = (v: boolean) => (v ? 1 : 0);

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

export async function listCategories(): Promise<Category[]> {
  const db = await getDb();
  const rows = await db.select<CategoryRow[]>("SELECT * FROM categories ORDER BY name ASC");
  return rows.map(mapCategory);
}

export async function insertCategory(cat: Omit<Category, "createdAt" | "updatedAt">) {
  const db = await getDb();
  await db.execute(
    `INSERT INTO categories (id, name, type, icon, color, is_default) VALUES ($1,$2,$3,$4,$5,$6)`,
    [cat.id, cat.name, cat.type, cat.icon, cat.color, toIntBool(cat.isDefault)],
  );
}

/** Cria uma categoria nova (do usuário) — gera o id, ao contrário de `insertCategory` (usada pelas categorias padrão, com id fixo). */
export async function createCategory(cat: Omit<Category, "id" | "createdAt" | "updatedAt" | "isDefault">): Promise<string> {
  const id = crypto.randomUUID();
  await insertCategory({ ...cat, id, isDefault: false });
  return id;
}

export async function updateCategory(id: string, cat: Omit<Category, "id" | "createdAt" | "updatedAt" | "isDefault">): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE categories SET name = $1, type = $2, icon = $3, color = $4, updated_at = datetime('now') WHERE id = $5`,
    [cat.name, cat.type, cat.icon, cat.color, id],
  );
}

/** Apaga a categoria e solta o vínculo de tudo que a usava (lançamentos, recorrências, pendências) — não apaga histórico. */
export async function deleteCategoryKeepingHistory(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE transactions SET category_id = NULL WHERE category_id = $1", [id]);
  await db.execute("UPDATE recurring_transactions SET category_id = NULL WHERE category_id = $1", [id]);
  await db.execute("UPDATE pending_items SET category_id = NULL WHERE category_id = $1", [id]);
  await db.execute("DELETE FROM categories WHERE id = $1", [id]);
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

export async function listPayees(): Promise<Payee[]> {
  const db = await getDb();
  const rows = await db.select<PayeeRow[]>("SELECT * FROM payees ORDER BY name ASC");
  return rows.map(mapPayee);
}

/** Busca um payee pelo nome (case-insensitive) ou cria um novo. Usado no formulário de lançamento. */
export async function findOrCreatePayee(name: string): Promise<string> {
  const trimmed = name.trim();
  const db = await getDb();
  const existing = await db.select<PayeeRow[]>(
    "SELECT * FROM payees WHERE lower(name) = lower($1) LIMIT 1",
    [trimmed],
  );
  if (existing[0]) return existing[0].id;
  const id = crypto.randomUUID();
  await db.execute("INSERT INTO payees (id, name) VALUES ($1,$2)", [id, trimmed]);
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

export async function listAccounts(): Promise<Account[]> {
  const db = await getDb();
  const rows = await db.select<AccountRow[]>("SELECT * FROM accounts ORDER BY is_default DESC, name ASC");
  return rows.map(mapAccount);
}

export async function insertAccount(a: NewAccount): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.execute(
    `INSERT INTO accounts (id, name, bank, agency, account_number, color, is_default) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [id, a.name, a.bank ?? null, a.agency ?? null, a.accountNumber ?? null, a.color, toIntBool(a.isDefault ?? false)],
  );
  return id;
}

export async function updateAccount(id: string, a: NewAccount): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE accounts SET name = $1, bank = $2, agency = $3, account_number = $4, color = $5, updated_at = datetime('now') WHERE id = $6`,
    [a.name, a.bank ?? null, a.agency ?? null, a.accountNumber ?? null, a.color, id],
  );
}

/** Apaga a conta e solta o vínculo dos lançamentos que a usavam (não apaga o histórico). */
export async function deleteAccountKeepingHistory(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE transactions SET account_id = NULL WHERE account_id = $1", [id]);
  await db.execute("UPDATE recurring_transactions SET account_id = NULL WHERE account_id = $1", [id]);
  await db.execute("DELETE FROM accounts WHERE id = $1", [id]);
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

export async function listTransactions(filter: TransactionFilter = {}): Promise<Transaction[]> {
  const db = await getDb();
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filter.type) {
    params.push(filter.type);
    clauses.push(`type = $${params.length}`);
  }
  if (filter.fromDate) {
    params.push(filter.fromDate);
    clauses.push(`occurred_at >= $${params.length}`);
  }
  if (filter.toDate) {
    params.push(filter.toDate);
    clauses.push(`occurred_at <= $${params.length}`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const limit = filter.limit ? `LIMIT ${Number(filter.limit)}` : "";
  const rows = await db.select<TransactionRow[]>(
    `SELECT * FROM transactions ${where} ORDER BY occurred_at DESC, created_at DESC ${limit}`,
    params,
  );
  return rows.map(mapTransaction);
}

export async function insertTransaction(tx: NewTransaction): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.execute(
    `INSERT INTO transactions
      (id, type, amount_cents, currency, occurred_at, description, category_id, payee_id, account_id,
       payment_method, notes, source, ocr_raw_text, ocr_confidence, recurring_transaction_id, is_reconciled)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
    [
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
    ],
  );
  return id;
}

export async function updateTransaction(id: string, tx: NewTransaction): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE transactions SET
      type = $1, amount_cents = $2, currency = $3, occurred_at = $4, description = $5,
      category_id = $6, payee_id = $7, account_id = $8, payment_method = $9, notes = $10, is_reconciled = $11, updated_at = datetime('now')
     WHERE id = $12`,
    [
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
    ],
  );
}

export async function deleteTransaction(id: string) {
  const db = await getDb();
  await db.execute("DELETE FROM transactions WHERE id = $1", [id]);
}

/** Apaga vários lançamentos de uma vez (seleção múltipla) — um DELETE só, não N. */
export async function deleteTransactions(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  const placeholders = ids.map((_, i) => `$${i + 1}`).join(",");
  await db.execute(`DELETE FROM transactions WHERE id IN (${placeholders})`, ids);
}

/** Marca um lançamento como efetivado (pago/recebido) ou não. */
export async function setTransactionReconciled(id: string, reconciled: boolean): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE transactions SET is_reconciled = $1, updated_at = datetime('now') WHERE id = $2", [
    toIntBool(reconciled),
    id,
  ]);
}

/** Só a data — usado pelo drag'n'drop do Fluxo de Trabalho pra reagendar um lançamento existente. */
export async function setTransactionDate(id: string, occurredAt: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE transactions SET occurred_at = $1, updated_at = datetime('now') WHERE id = $2", [
    occurredAt,
    id,
  ]);
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

export async function listPendingItems(): Promise<PendingItem[]> {
  const db = await getDb();
  const rows = await db.select<PendingItemRow[]>("SELECT * FROM pending_items ORDER BY created_at DESC");
  return rows.map(mapPendingItem);
}

export async function insertPendingItem(item: NewPendingItem): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.execute(
    `INSERT INTO pending_items (id, type, description, amount_cents, category_id, payee_id, recurring_transaction_id, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [
      id,
      item.type,
      item.description,
      item.amountCents,
      item.categoryId ?? null,
      item.payeeId ?? null,
      item.recurringTransactionId ?? null,
      item.notes ?? null,
    ],
  );
  return id;
}

export async function deletePendingItem(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM pending_items WHERE id = $1", [id]);
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

export async function listRecurringTransactions(): Promise<RecurringTransaction[]> {
  const db = await getDb();
  const rows = await db.select<RecurringRow[]>("SELECT * FROM recurring_transactions ORDER BY is_active DESC, description ASC");
  return rows.map(mapRecurring);
}

export async function insertRecurringTransaction(r: NewRecurring): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.execute(
    `INSERT INTO recurring_transactions
      (id, type, description, amount_cents, category_id, payee_id, account_id, payment_method, recurrence_kind, frequency,
       interval_count, due_day, start_date, end_date, total_installments, installments_generated, notes, is_active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
    [
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
    ],
  );
  return id;
}

export async function updateRecurringTransaction(id: string, r: NewRecurring): Promise<void> {
  const db = await getDb();
  await db.execute(
    `UPDATE recurring_transactions SET
      type = $1, description = $2, amount_cents = $3, category_id = $4, payee_id = $5, account_id = $6, payment_method = $7,
      recurrence_kind = $8, frequency = $9, interval_count = $10, due_day = $11, start_date = $12,
      end_date = $13, total_installments = $14, notes = $15, is_active = $16, updated_at = datetime('now')
     WHERE id = $17`,
    [
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
    ],
  );
}

export async function deleteRecurringTransaction(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM recurring_transactions WHERE id = $1", [id]);
}

export async function incrementInstallmentsGenerated(id: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE recurring_transactions SET installments_generated = installments_generated + 1 WHERE id = $1", [id]);
}

/** Cria uma cópia independente da recorrência — série de parcelas, se houver, recomeça do zero. */
export async function duplicateRecurringTransaction(r: RecurringTransaction): Promise<string> {
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
export async function unlinkTransactionsFromRecurring(recurringId: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE transactions SET recurring_transaction_id = NULL WHERE recurring_transaction_id = $1", [recurringId]);
}

/** "Deletar toda a recorrência", mantendo o histórico: solta o vínculo dos lançamentos já gerados, depois apaga a regra. */
export async function deleteRecurringKeepingHistory(id: string): Promise<void> {
  await unlinkTransactionsFromRecurring(id);
  await deleteRecurringTransaction(id);
}

// ---------------------------------------------------------------------------
// Exclusões de ocorrência ("deletar só este mês")
// ---------------------------------------------------------------------------

/** Todas as exclusões, como um Set de `${recurringId}:${data}` — pronto pra checar com `.has()`. */
export async function listRecurringExclusions(): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.select<Array<{ recurring_transaction_id: string; occurrence_date: string }>>(
    "SELECT recurring_transaction_id, occurrence_date FROM recurring_exclusions",
  );
  return new Set(rows.map((r) => `${r.recurring_transaction_id}:${r.occurrence_date}`));
}

export async function addRecurringExclusion(recurringId: string, occurrenceDate: string): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT OR IGNORE INTO recurring_exclusions (recurring_transaction_id, occurrence_date) VALUES ($1,$2)",
    [recurringId, occurrenceDate],
  );
}

// ---------------------------------------------------------------------------
// Anexos
// ---------------------------------------------------------------------------

export async function listAttachmentsByTransaction(
  transactionIds: string[],
): Promise<Map<string, Attachment[]>> {
  if (transactionIds.length === 0) return new Map();
  const db = await getDb();
  const placeholders = transactionIds.map((_, i) => `$${i + 1}`).join(",");
  const rows = await db.select<
    Array<{
      id: string;
      transaction_id: string;
      file_path: string;
      file_name: string;
      mime_type: string;
      file_size_bytes: number | null;
      checksum_sha256: string | null;
      created_at: string;
    }>
  >(`SELECT * FROM attachments WHERE transaction_id IN (${placeholders})`, transactionIds);

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

export async function getBackupSettings(): Promise<BackupSettings | null> {
  const db = await getDb();
  const rows = await db.select<BackupSettingsRow[]>("SELECT * FROM backup_settings WHERE id = 1");
  return rows[0] ? mapBackupSettings(rows[0]) : null;
}

export async function saveBackupDirectory(directory: string, frequencyHours = 12) {
  const db = await getDb();
  await db.execute(
    `INSERT INTO backup_settings (id, export_directory, frequency_hours, enabled)
     VALUES (1, $1, $2, 1)
     ON CONFLICT(id) DO UPDATE SET export_directory = excluded.export_directory, frequency_hours = excluded.frequency_hours`,
    [directory, frequencyHours],
  );
}

export async function setBackupEnabled(enabled: boolean) {
  const db = await getDb();
  await db.execute("UPDATE backup_settings SET enabled = $1 WHERE id = 1", [toIntBool(enabled)]);
}

export async function recordBackupResult(result: {
  status: "success" | "failed";
  filePath: string | null;
  rowsExported: number | null;
  errorMessage: string | null;
}) {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.execute(
    `UPDATE backup_settings SET last_export_at = $1, last_export_status = $2, last_export_file = $3 WHERE id = 1`,
    [now, result.status, result.filePath],
  );
  await db.execute(
    `INSERT INTO backup_log (ran_at, status, rows_exported, file_path, error_message) VALUES ($1,$2,$3,$4,$5)`,
    [now, result.status, result.rowsExported, result.filePath, result.errorMessage],
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

export async function listBackupLog(limit = 10): Promise<BackupLogEntryRow[]> {
  const db = await getDb();
  return db.select<BackupLogEntryRow[]>(
    `SELECT * FROM backup_log ORDER BY ran_at DESC LIMIT $1`,
    [limit],
  );
}

// ---------------------------------------------------------------------------
// Reset total (Zona de Perigo, em Backup & CSV)
// ---------------------------------------------------------------------------

/**
 * Apaga TODOS os dados do usuário — lançamentos, recorrências, pendências,
 * exclusões de ocorrência, anexos, pagadores/recebedores e categorias — pra
 * recomeçar do zero. Ordem respeita as chaves estrangeiras (`PRAGMA
 * foreign_keys = ON`): quem referencia sai primeiro. Não mexe em
 * `backup_settings`/`backup_log` (configuração do app, não dado financeiro).
 * Depois de chamar isso, rode `ensureDefaultCategories()` pra repor as
 * categorias padrão — sem elas o app fica sem nenhuma opção de categoria.
 */
export async function resetAllData(): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM attachments");
  await db.execute("DELETE FROM pending_items");
  await db.execute("DELETE FROM transactions");
  await db.execute("DELETE FROM recurring_exclusions");
  await db.execute("DELETE FROM recurring_transactions");
  await db.execute("DELETE FROM payees");
  await db.execute("DELETE FROM categories");
  await db.execute("DELETE FROM accounts");
}
