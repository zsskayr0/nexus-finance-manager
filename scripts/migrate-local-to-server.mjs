#!/usr/bin/env node
// @ts-check
import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";

/**
 * Migração única: lê o SQLite local do Desktop (direto do arquivo, sem
 * precisar do Tauri/app aberto) e envia tudo pro servidor via
 * POST /api/v1/import. Só LÊ o banco de origem — nunca escreve nele.
 *
 * Uso:
 *   node scripts/migrate-local-to-server.mjs --dry-run [--source <caminho>]
 *   node scripts/migrate-local-to-server.mjs --apply [--source <caminho>] [--server http://localhost:7023] [--api-key SUACHAVE]
 *
 * Por padrão roda em modo --dry-run (só mostra o que seria migrado, não
 * grava nada) — precisa passar --apply explicitamente pra gravar de
 * verdade no servidor. Dado financeiro real merece essa checagem antes.
 */

const args = process.argv.slice(2);
function flag(name, fallback) {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return fallback;
  return args[i + 1];
}
const apply = args.includes("--apply");
const defaultSource =
  process.platform === "win32"
    ? `${process.env.APPDATA}\\com.nexus.desktop\\nexus.db`
    : `${process.env.HOME}/.local/share/com.nexus.desktop/nexus.db`;
const source = flag("source", defaultSource);
const serverUrl = flag("server", "http://localhost:7023");
const apiKey = flag("api-key", process.env.NEXUS_API_KEY);

if (!existsSync(source)) {
  console.error(`Banco de origem não encontrado: ${source}`);
  process.exit(1);
}

console.log(`Lendo (só leitura): ${source}`);
const db = new DatabaseSync(source, { readOnly: true });

const toBool = (v) => v === 1;

const categories = db
  .prepare("SELECT * FROM categories")
  .all()
  .map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    icon: r.icon,
    color: r.color,
    isDefault: toBool(r.is_default),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

const payees = db
  .prepare("SELECT * FROM payees")
  .all()
  .map((r) => ({ id: r.id, name: r.name, document: r.document, notes: r.notes, createdAt: r.created_at }));

const accounts = db
  .prepare("SELECT * FROM accounts")
  .all()
  .map((r) => ({
    id: r.id,
    name: r.name,
    bank: r.bank,
    agency: r.agency,
    accountNumber: r.account_number,
    color: r.color,
    isDefault: toBool(r.is_default),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

const recurringTransactions = db
  .prepare("SELECT * FROM recurring_transactions")
  .all()
  .map((r) => ({
    id: r.id,
    type: r.type,
    description: r.description,
    amountCents: r.amount_cents,
    categoryId: r.category_id,
    payeeId: r.payee_id,
    accountId: r.account_id,
    paymentMethod: r.payment_method,
    recurrenceKind: r.recurrence_kind,
    frequency: r.frequency,
    intervalCount: r.interval_count,
    dueDay: r.due_day,
    startDate: r.start_date,
    endDate: r.end_date,
    totalInstallments: r.total_installments,
    installmentsGenerated: r.installments_generated,
    notes: r.notes,
    isActive: toBool(r.is_active),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

const transactions = db
  .prepare("SELECT * FROM transactions")
  .all()
  .map((r) => ({
    id: r.id,
    type: r.type,
    amountCents: r.amount_cents,
    currency: r.currency,
    occurredAt: r.occurred_at,
    description: r.description,
    categoryId: r.category_id,
    payeeId: r.payee_id,
    accountId: r.account_id,
    paymentMethod: r.payment_method,
    notes: r.notes,
    source: r.source,
    ocrRawText: r.ocr_raw_text,
    ocrConfidence: r.ocr_confidence,
    recurringTransactionId: r.recurring_transaction_id,
    isReconciled: toBool(r.is_reconciled),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

const pendingItems = db
  .prepare("SELECT * FROM pending_items")
  .all()
  .map((r) => ({
    id: r.id,
    type: r.type,
    description: r.description,
    amountCents: r.amount_cents,
    categoryId: r.category_id,
    payeeId: r.payee_id,
    recurringTransactionId: r.recurring_transaction_id,
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

const recurringExclusions = db
  .prepare("SELECT * FROM recurring_exclusions")
  .all()
  .map((r) => ({ recurringTransactionId: r.recurring_transaction_id, occurrenceDate: r.occurrence_date }));

db.close();

const payload = { categories, payees, accounts, recurringTransactions, transactions, pendingItems, recurringExclusions };

console.log("\nRegistros encontrados na origem:");
for (const [key, list] of Object.entries(payload)) {
  console.log(`  ${key.padEnd(24)} ${list.length}`);
}

if (!apply) {
  console.log("\n--dry-run (padrão): nada foi enviado. Rode com --apply pra gravar de verdade no servidor.");
  process.exit(0);
}

console.log(`\nEnviando pro servidor: ${serverUrl}/api/v1/import`);
const headers = { "Content-Type": "application/json" };
if (apiKey) headers["x-api-key"] = apiKey;

const res = await fetch(`${serverUrl}/api/v1/import`, { method: "POST", headers, body: JSON.stringify(payload) });
if (!res.ok) {
  console.error(`Falhou: HTTP ${res.status}`, await res.text());
  process.exit(1);
}
console.log("Importado com sucesso:", await res.json());
