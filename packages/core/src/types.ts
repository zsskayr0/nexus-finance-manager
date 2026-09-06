import { z } from "zod";

/**
 * Schemas Zod que espelham packages/core/src/schema.sql.
 * Servem tanto para validar dados na fronteira (ex.: resultado bruto do OCR
 * antes de virar um lançamento) quanto como fonte dos tipos TS usados nos apps.
 */

// ---------------------------------------------------------------------------
// Categorias
// ---------------------------------------------------------------------------

export const CategoryTypeSchema = z.enum(["income", "expense", "both"]);
export type CategoryType = z.infer<typeof CategoryTypeSchema>;

export const CategorySchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  type: CategoryTypeSchema,
  icon: z.string().nullable(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "cor deve ser um hex #RRGGBB"),
  isDefault: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Category = z.infer<typeof CategorySchema>;

// ---------------------------------------------------------------------------
// Pagadores / Recebedores
// ---------------------------------------------------------------------------

export const PayeeSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  document: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
});
export type Payee = z.infer<typeof PayeeSchema>;

// ---------------------------------------------------------------------------
// Contas (bancárias ou carteira física)
// ---------------------------------------------------------------------------

export const AccountSchema = z.object({
  id: z.string(),
  /** Rótulo mostrado no app — nome do banco, apelido da conta, ou "Carteira Física". */
  name: z.string().min(1),
  bank: z.string().nullable(),
  /** Agência (AG). */
  agency: z.string().nullable(),
  /** Conta corrente (CC). */
  accountNumber: z.string().nullable(),
  /** Cor de identificação da conta — sugerida pelo banco escolhido no seletor, mas livre pra trocar. */
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "cor deve ser um hex #RRGGBB"),
  /** A conta seed que vem pronta ("Carteira Física") — não impede editar/excluir, só marca a origem. */
  isDefault: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Account = z.infer<typeof AccountSchema>;

export const NewAccountSchema = AccountSchema.omit({ id: true, createdAt: true, updatedAt: true }).partial({
  bank: true,
  agency: true,
  accountNumber: true,
  isDefault: true,
});
export type NewAccount = z.infer<typeof NewAccountSchema>;

// ---------------------------------------------------------------------------
// Lançamentos
// ---------------------------------------------------------------------------

export const TransactionTypeSchema = z.enum(["income", "expense"]);
export type TransactionType = z.infer<typeof TransactionTypeSchema>;

export const PaymentMethodSchema = z.enum([
  "pix",
  "pix_automatico",
  "ted",
  "cartao",
  "dinheiro",
  "boleto",
  "outro",
]);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const TransactionSourceSchema = z.enum([
  "manual",
  "share_intent",
  "gallery",
  "recurring_generated",
]);
export type TransactionSource = z.infer<typeof TransactionSourceSchema>;

export const TransactionSchema = z.object({
  id: z.string(),
  type: TransactionTypeSchema,
  amountCents: z.number().int().nonnegative(),
  currency: z.string().length(3).default("BRL"),
  occurredAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "use YYYY-MM-DD"),
  description: z.string().min(1),
  categoryId: z.string().nullable(),
  payeeId: z.string().nullable(),
  accountId: z.string().nullable(),
  paymentMethod: PaymentMethodSchema.nullable(),
  notes: z.string().nullable(),
  source: TransactionSourceSchema.default("manual"),
  ocrRawText: z.string().nullable(),
  ocrConfidence: z.number().min(0).max(1).nullable(),
  recurringTransactionId: z.string().nullable(),
  isReconciled: z.boolean(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type Transaction = z.infer<typeof TransactionSchema>;

/** Formato usado ao criar um lançamento novo (id/timestamps gerados pela camada de dados). */
export const NewTransactionSchema = TransactionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial({
  currency: true,
  categoryId: true,
  payeeId: true,
  accountId: true,
  paymentMethod: true,
  notes: true,
  source: true,
  ocrRawText: true,
  ocrConfidence: true,
  recurringTransactionId: true,
  isReconciled: true,
});
export type NewTransaction = z.infer<typeof NewTransactionSchema>;

// ---------------------------------------------------------------------------
// Anexos (comprovantes)
// ---------------------------------------------------------------------------

export const AttachmentSchema = z.object({
  id: z.string(),
  transactionId: z.string(),
  filePath: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  fileSizeBytes: z.number().int().nonnegative().nullable(),
  checksumSha256: z.string().nullable(),
  createdAt: z.string(),
});
export type Attachment = z.infer<typeof AttachmentSchema>;

// ---------------------------------------------------------------------------
// Recorrências
// ---------------------------------------------------------------------------

export const RecurrenceKindSchema = z.enum(["fixed", "installment"]);
export type RecurrenceKind = z.infer<typeof RecurrenceKindSchema>;

export const RecurrenceFrequencySchema = z.enum(["weekly", "monthly", "yearly"]);
export type RecurrenceFrequency = z.infer<typeof RecurrenceFrequencySchema>;

export const RecurringTransactionSchema = z
  .object({
    id: z.string(),
    type: TransactionTypeSchema,
    description: z.string().min(1),
    amountCents: z.number().int().positive(),
    categoryId: z.string().nullable(),
    payeeId: z.string().nullable(),
    accountId: z.string().nullable(),
    paymentMethod: PaymentMethodSchema.nullable(),
    recurrenceKind: RecurrenceKindSchema,
    frequency: RecurrenceFrequencySchema.default("monthly"),
    intervalCount: z.number().int().positive().default(1),
    dueDay: z.number().int().min(1).max(31).nullable(),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    totalInstallments: z.number().int().positive().nullable(),
    installmentsGenerated: z.number().int().nonnegative(),
    notes: z.string().nullable(),
    isActive: z.boolean(),
    createdAt: z.string(),
    updatedAt: z.string(),
  })
  .refine(
    (r) => r.recurrenceKind !== "installment" || r.totalInstallments !== null,
    { message: "parcelamento requer totalInstallments", path: ["totalInstallments"] },
  );
export type RecurringTransaction = z.infer<typeof RecurringTransactionSchema>;

// ---------------------------------------------------------------------------
// Pendências avulsas (lembretes sem data)
// ---------------------------------------------------------------------------

/**
 * Um lembrete de receita/despesa que o usuário sabe que vai acontecer mas
 * ainda não tem data definida — fica na lista de "Pendências" até ser
 * arrastado pra um dia específico no Fluxo de Trabalho (ou lançado direto
 * pelo Painel), momento em que vira um `Transaction` de verdade e este
 * registro é apagado.
 */
export const PendingItemSchema = z.object({
  id: z.string(),
  type: TransactionTypeSchema,
  description: z.string().min(1),
  amountCents: z.number().int().positive(),
  categoryId: z.string().nullable(),
  payeeId: z.string().nullable(),
  /** Presente quando o lembrete veio de uma "conclusão parcial" de recorrência — o restante do valor. */
  recurringTransactionId: z.string().nullable(),
  notes: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type PendingItem = z.infer<typeof PendingItemSchema>;

export const NewPendingItemSchema = PendingItemSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).partial({ categoryId: true, payeeId: true, recurringTransactionId: true, notes: true });
export type NewPendingItem = z.infer<typeof NewPendingItemSchema>;

/**
 * Uma ocorrência de recorrência que o usuário escolheu explicitamente pular
 * (via "deletar só este mês") — sem isso ela voltaria a aparecer como
 * pendente no próximo cálculo de ocorrências.
 */
export const RecurringExclusionSchema = z.object({
  recurringTransactionId: z.string(),
  occurrenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  createdAt: z.string(),
});
export type RecurringExclusion = z.infer<typeof RecurringExclusionSchema>;

// ---------------------------------------------------------------------------
// Backup
// ---------------------------------------------------------------------------

export const BackupSettingsSchema = z.object({
  id: z.literal(1),
  exportDirectory: z.string().min(1),
  frequencyHours: z.number().int().positive().default(12),
  lastExportAt: z.string().nullable(),
  lastExportStatus: z.enum(["success", "failed", "pending"]).nullable(),
  lastExportFile: z.string().nullable(),
  enabled: z.boolean().default(true),
});
export type BackupSettings = z.infer<typeof BackupSettingsSchema>;

export const BackupLogEntrySchema = z.object({
  id: z.number().int(),
  ranAt: z.string(),
  status: z.enum(["success", "failed"]),
  rowsExported: z.number().int().nonnegative().nullable(),
  filePath: z.string().nullable(),
  errorMessage: z.string().nullable(),
});
export type BackupLogEntry = z.infer<typeof BackupLogEntrySchema>;

// ---------------------------------------------------------------------------
// Resultado bruto do pipeline de OCR (Share Intent), antes de virar NewTransaction
// ---------------------------------------------------------------------------

export const OcrExtractionSchema = z.object({
  rawText: z.string(),
  confidence: z.number().min(0).max(1),
  suggestedType: TransactionTypeSchema.nullable(),
  suggestedAmountCents: z.number().int().nonnegative().nullable(),
  suggestedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  suggestedPayeeName: z.string().nullable(),
});
export type OcrExtraction = z.infer<typeof OcrExtractionSchema>;
