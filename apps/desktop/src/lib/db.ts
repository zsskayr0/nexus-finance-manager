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
import { getServerApiKey, getServerUrl } from "./serverConfig";

/**
 * Camada de acesso a dados do Desktop — cliente HTTP fino pro servidor
 * (`apps/server`, Docker, porta 7023 por padrão). O app não guarda mais
 * banco nenhum localmente: toda função aqui tem o MESMO nome e assinatura
 * que tinha quando isso era `@tauri-apps/plugin-sql` direto no SQLite local
 * — só a implementação virou `fetch` contra a API. O resto do app (páginas,
 * componentes) não precisou mudar por causa disso.
 */

class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const apiKey = getServerApiKey();
  if (apiKey) headers["x-api-key"] = apiKey;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`${getServerUrl()}/api/v1${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Não foi possível falar com o servidor Nexus — confira se ele está rodando e o endereço configurado.");
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(res.status, text || `Erro ${res.status} ao falar com o servidor.`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

const get = <T>(path: string) => request<T>("GET", path);
const post = <T>(path: string, body?: unknown) => request<T>("POST", path, body ?? {});
const put = <T>(path: string, body: unknown) => request<T>("PUT", path, body);
const patch = <T>(path: string, body: unknown) => request<T>("PATCH", path, body);
const del = <T>(path: string) => request<T>("DELETE", path);

function qs(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined);
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join("&");
}

// ---------------------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------------------

export function listCategories(): Promise<Category[]> {
  return get<Category[]>("/categories");
}

export async function createCategory(cat: Omit<Category, "id" | "createdAt" | "updatedAt" | "isDefault">): Promise<string> {
  const { id } = await post<{ id: string }>("/categories", cat);
  return id;
}

export function updateCategory(id: string, cat: Omit<Category, "id" | "createdAt" | "updatedAt" | "isDefault">): Promise<void> {
  return put<void>(`/categories/${id}`, cat);
}

export function deleteCategoryKeepingHistory(id: string): Promise<void> {
  return del<void>(`/categories/${id}`);
}

// ---------------------------------------------------------------------------
// Pagadores / recebedores
// ---------------------------------------------------------------------------

export function listPayees(): Promise<Payee[]> {
  return get<Payee[]>("/payees");
}

export async function findOrCreatePayee(name: string): Promise<string> {
  const { id } = await post<{ id: string }>("/payees/find-or-create", { name });
  return id;
}

// ---------------------------------------------------------------------------
// Contas (bancárias ou "Carteira Física")
// ---------------------------------------------------------------------------

export function listAccounts(): Promise<Account[]> {
  return get<Account[]>("/accounts");
}

export async function insertAccount(a: NewAccount): Promise<string> {
  const { id } = await post<{ id: string }>("/accounts", a);
  return id;
}

export function updateAccount(id: string, a: NewAccount): Promise<void> {
  return put<void>(`/accounts/${id}`, a);
}

export function deleteAccountKeepingHistory(id: string): Promise<void> {
  return del<void>(`/accounts/${id}`);
}

// ---------------------------------------------------------------------------
// Lançamentos
// ---------------------------------------------------------------------------

export interface TransactionFilter {
  type?: "income" | "expense";
  fromDate?: string;
  toDate?: string;
  limit?: number;
}

export function listTransactions(filter: TransactionFilter = {}): Promise<Transaction[]> {
  return get<Transaction[]>(`/transactions${qs(filter as Record<string, string | number | undefined>)}`);
}

export async function insertTransaction(tx: NewTransaction): Promise<string> {
  const { id } = await post<{ id: string }>("/transactions", tx);
  return id;
}

export function updateTransaction(id: string, tx: NewTransaction): Promise<void> {
  return put<void>(`/transactions/${id}`, tx);
}

export function deleteTransaction(id: string): Promise<void> {
  return del<void>(`/transactions/${id}`);
}

/** Apaga vários lançamentos de uma vez (seleção múltipla). */
export function deleteTransactions(ids: string[]): Promise<void> {
  if (ids.length === 0) return Promise.resolve();
  return post<void>("/transactions/bulk-delete", { ids });
}

/** Marca um lançamento como efetivado (pago/recebido) ou não. */
export function setTransactionReconciled(id: string, reconciled: boolean): Promise<void> {
  return patch<void>(`/transactions/${id}/reconciled`, { reconciled });
}

/** Só a data — usado pelo drag'n'drop do Fluxo de Trabalho pra reagendar um lançamento existente. */
export function setTransactionDate(id: string, occurredAt: string): Promise<void> {
  return patch<void>(`/transactions/${id}/date`, { occurredAt });
}

// ---------------------------------------------------------------------------
// Pendências avulsas (lembretes sem data)
// ---------------------------------------------------------------------------

export function listPendingItems(): Promise<PendingItem[]> {
  return get<PendingItem[]>("/pending-items");
}

export async function insertPendingItem(item: NewPendingItem): Promise<string> {
  const { id } = await post<{ id: string }>("/pending-items", item);
  return id;
}

export function deletePendingItem(id: string): Promise<void> {
  return del<void>(`/pending-items/${id}`);
}

// ---------------------------------------------------------------------------
// Recorrências
// ---------------------------------------------------------------------------

export type NewRecurring = Omit<RecurringTransaction, "id" | "createdAt" | "updatedAt" | "installmentsGenerated"> & {
  installmentsGenerated?: number;
};

export function listRecurringTransactions(): Promise<RecurringTransaction[]> {
  return get<RecurringTransaction[]>("/recurring-transactions");
}

export async function insertRecurringTransaction(r: NewRecurring): Promise<string> {
  const { id } = await post<{ id: string }>("/recurring-transactions", r);
  return id;
}

export function updateRecurringTransaction(id: string, r: NewRecurring): Promise<void> {
  return put<void>(`/recurring-transactions/${id}`, r);
}

export function deleteRecurringTransaction(id: string): Promise<void> {
  return del<void>(`/recurring-transactions/${id}`);
}

export function incrementInstallmentsGenerated(id: string): Promise<void> {
  return post<void>(`/recurring-transactions/${id}/increment-installments`);
}

/** Cria uma cópia independente da recorrência — série de parcelas, se houver, recomeça do zero. O servidor carrega a original pelo id, não precisa mandar o objeto inteiro. */
export async function duplicateRecurringTransaction(r: RecurringTransaction): Promise<string> {
  const { id } = await post<{ id: string }>(`/recurring-transactions/${r.id}/duplicate`);
  return id;
}

/** Solta o vínculo dos lançamentos já gerados por uma recorrência, sem apagá-los. */
export function unlinkTransactionsFromRecurring(recurringId: string): Promise<void> {
  return post<void>(`/recurring-transactions/${recurringId}/unlink-transactions`);
}

/** "Deletar toda a recorrência", mantendo o histórico. */
export function deleteRecurringKeepingHistory(id: string): Promise<void> {
  return del<void>(`/recurring-transactions/${id}/keeping-history`);
}

// ---------------------------------------------------------------------------
// Exclusões de ocorrência ("deletar só este mês")
// ---------------------------------------------------------------------------

/** Todas as exclusões, como um Set de `${recurringId}:${data}` — pronto pra checar com `.has()`. */
export async function listRecurringExclusions(): Promise<Set<string>> {
  const { items } = await get<{ items: string[] }>("/recurring-exclusions");
  return new Set(items);
}

export function addRecurringExclusion(recurringId: string, occurrenceDate: string): Promise<void> {
  return post<void>("/recurring-exclusions", { recurringId, occurrenceDate });
}

// ---------------------------------------------------------------------------
// Anexos
// ---------------------------------------------------------------------------

export async function listAttachmentsByTransaction(transactionIds: string[]): Promise<Map<string, Attachment[]>> {
  if (transactionIds.length === 0) return new Map();
  const obj = await get<Record<string, Attachment[]>>(`/attachments?transactionIds=${transactionIds.map(encodeURIComponent).join(",")}`);
  return new Map(Object.entries(obj));
}

// ---------------------------------------------------------------------------
// Configuração de backup
// ---------------------------------------------------------------------------

export function getBackupSettings(): Promise<BackupSettings | null> {
  return get<BackupSettings | null>("/backup-settings");
}

export function saveBackupDirectory(directory: string, frequencyHours = 12): Promise<void> {
  return post<void>("/backup-settings", { directory, frequencyHours });
}

export function setBackupEnabled(enabled: boolean): Promise<void> {
  return patch<void>("/backup-settings/enabled", { enabled });
}

export function recordBackupResult(result: {
  status: "success" | "failed";
  filePath: string | null;
  rowsExported: number | null;
  errorMessage: string | null;
}): Promise<void> {
  return post<void>("/backup-log", result);
}

export interface BackupLogEntryRow {
  id: number;
  ran_at: string;
  status: "success" | "failed";
  rows_exported: number | null;
  file_path: string | null;
  error_message: string | null;
}

export function listBackupLog(limit = 10): Promise<BackupLogEntryRow[]> {
  return get<BackupLogEntryRow[]>(`/backup-log${qs({ limit })}`);
}

// ---------------------------------------------------------------------------
// Reset total (Zona de Perigo, em Backup & CSV)
// ---------------------------------------------------------------------------

/** Apaga TODOS os dados do usuário no servidor e repõe categorias/conta padrão — o servidor cuida disso sozinho num passo só. */
export function resetAllData(): Promise<void> {
  return post<void>("/reset-all-data");
}
