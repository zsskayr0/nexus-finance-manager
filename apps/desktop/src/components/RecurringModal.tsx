import { useEffect, useRef, useState } from "react";
import {
  formatCentsToBRL,
  toCents,
  fromCents,
  todayISO,
  type Account,
  type Category,
  type PaymentMethod,
  type RecurrenceFrequency,
  type RecurrenceKind,
  type RecurringTransaction,
  type Transaction,
} from "@nexus/core";
import { deleteRecurringKeepingHistory, duplicateRecurringTransaction, findOrCreatePayee, insertRecurringTransaction, updateRecurringTransaction } from "../lib/db";
import { deleteOccurrenceAndFuture, deleteOccurrenceOnly, settleOccurrence } from "../lib/recurring";
import { RecurringOccurrenceMenu } from "./RecurringOccurrenceMenu";
import { PartialSettleModal } from "./PartialSettleModal";
import { CategorySelect } from "./CategorySelect";
import { IconX } from "./icons";

const FREQUENCIES: Array<{ value: RecurrenceFrequency; label: string }> = [
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
  { value: "yearly", label: "Anual" },
];

const PAYMENT_METHODS: Array<{ value: PaymentMethod; label: string }> = [
  { value: "pix", label: "Pix" },
  { value: "pix_automatico", label: "Pix Automático" },
  { value: "ted", label: "TED" },
  { value: "cartao", label: "Cartão" },
  { value: "dinheiro", label: "Dinheiro" },
  { value: "boleto", label: "Boleto" },
  { value: "outro", label: "Outro" },
];

/**
 * Cria ou edita uma recorrência (fixa ou parcelada) — passe `recurring` para
 * abrir em modo edição. Mesmo esquema flutuante/fixo do painel de
 * lançamento (`docked`): fixo faz parte do layout da página (a Recorrências
 * reserva a coluna), flutuante é o modal centralizado de sempre.
 *
 * Editando, o cabeçalho ganha o MESMO menu "..." da linha (duplicar,
 * concluir, concluir parcialmente, excluir em 3 alcances) — pra isso ele
 * precisa saber de QUAL ocorrência veio o clique (`occurrenceDate` e
 * companhia), não só da regra.
 */
export function RecurringModal({
  categories,
  accounts,
  recurring,
  payeeName: existingPayeeName,
  defaultStartDate,
  occurrenceDate,
  installmentNumber = null,
  occurrenceTransaction = null,
  docked = false,
  onClose,
  onSaved,
}: {
  categories: Category[];
  accounts: Account[];
  recurring?: RecurringTransaction;
  payeeName?: string;
  /** Data de início sugerida pra uma recorrência NOVA — o primeiro dia do período filtrado na tela, por padrão hoje. */
  defaultStartDate?: string;
  /** Data da ocorrência que foi clicada pra abrir esta edição — habilita o menu de ações (concluir/duplicar/excluir). */
  occurrenceDate?: string;
  installmentNumber?: number | null;
  /** Lançamento real já gerado pra essa ocorrência, se houver — sem ele, "concluir" fica disponível. */
  occurrenceTransaction?: Transaction | null;
  docked?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = !!recurring;
  const [type, setType] = useState<"income" | "expense">(recurring?.type ?? "expense");
  const [description, setDescription] = useState(recurring?.description ?? "");
  const [amount, setAmount] = useState(recurring ? fromCents(recurring.amountCents).toFixed(2).replace(".", ",") : "");
  const [categoryId, setCategoryId] = useState(recurring?.categoryId ?? "");
  const [payeeName, setPayeeName] = useState(existingPayeeName ?? "");
  const defaultAccountId = accounts.find((a) => a.isDefault)?.id ?? accounts[0]?.id ?? "";
  const [accountId, setAccountId] = useState(recurring?.accountId ?? defaultAccountId);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">(recurring?.paymentMethod ?? "");
  const [kind, setKind] = useState<RecurrenceKind>(recurring?.recurrenceKind ?? "fixed");
  const [frequency, setFrequency] = useState<RecurrenceFrequency>(recurring?.frequency ?? "monthly");
  const [intervalCount, setIntervalCount] = useState(String(recurring?.intervalCount ?? 1));
  const [dueDay, setDueDay] = useState(recurring?.dueDay ? String(recurring.dueDay) : "");
  const [startDate, setStartDate] = useState(recurring?.startDate ?? defaultStartDate ?? todayISO());
  const [endDate, setEndDate] = useState(recurring?.endDate ?? "");
  const [totalInstallments, setTotalInstallments] = useState(recurring?.totalInstallments ? String(recurring.totalInstallments) : "12");
  const [notes, setNotes] = useState(recurring?.notes ?? "");
  const [isActive, setIsActive] = useState(recurring?.isActive ?? true);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showPartial, setShowPartial] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [swapping, setSwapping] = useState(false);

  // Painel fixo trocando de recorrência (mesma instância, prop nova) —
  // resincroniza os campos, igual o painel de lançamento.
  const targetId = recurring?.id ?? "new";
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setSwapping(true);
    setType(recurring?.type ?? "expense");
    setDescription(recurring?.description ?? "");
    setAmount(recurring ? fromCents(recurring.amountCents).toFixed(2).replace(".", ",") : "");
    setCategoryId(recurring?.categoryId ?? "");
    setPayeeName(existingPayeeName ?? "");
    setAccountId(recurring?.accountId ?? defaultAccountId);
    setPaymentMethod(recurring?.paymentMethod ?? "");
    setKind(recurring?.recurrenceKind ?? "fixed");
    setFrequency(recurring?.frequency ?? "monthly");
    setIntervalCount(String(recurring?.intervalCount ?? 1));
    setDueDay(recurring?.dueDay ? String(recurring.dueDay) : "");
    setStartDate(recurring?.startDate ?? defaultStartDate ?? todayISO());
    setEndDate(recurring?.endDate ?? "");
    setTotalInstallments(recurring?.totalInstallments ? String(recurring.totalInstallments) : "12");
    setNotes(recurring?.notes ?? "");
    setIsActive(recurring?.isActive ?? true);
    setError(null);
    const t = setTimeout(() => setSwapping(false), 220);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId]);

  const relevantCategories = categories.filter((c) => c.type === type || c.type === "both");
  const parsedAmountPreview = Number(amount.replace(/\./g, "").replace(",", "."));
  const amountPreview = Number.isFinite(parsedAmountPreview) && amount ? formatCentsToBRL(toCents(parsedAmountPreview)) : null;

  async function handleSave() {
    setError(null);
    const parsedAmount = Number(amount.replace(/\./g, "").replace(",", "."));
    if (!description.trim()) return setError("Informe uma descrição.");
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return setError("Informe um valor válido.");
    if (kind === "installment" && (!totalInstallments || Number(totalInstallments) < 1)) {
      return setError("Informe o número de parcelas.");
    }

    setSaving(true);
    try {
      const payeeId = payeeName.trim() ? await findOrCreatePayee(payeeName) : null;
      const draft = {
        type,
        description: description.trim(),
        amountCents: toCents(parsedAmount),
        categoryId: categoryId || null,
        payeeId,
        accountId: accountId || null,
        paymentMethod: paymentMethod || null,
        recurrenceKind: kind,
        frequency,
        intervalCount: Math.max(1, Number(intervalCount) || 1),
        dueDay: dueDay ? Math.min(31, Math.max(1, Number(dueDay))) : null,
        startDate,
        endDate: endDate || null,
        totalInstallments: kind === "installment" ? Number(totalInstallments) : null,
        notes: notes.trim() || null,
        isActive,
      };
      if (isEditing) {
        await updateRecurringTransaction(recurring.id, draft);
      } else {
        await insertRecurringTransaction(draft);
      }
      onSaved();
      if (!docked) onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  // Ações do menu "..." — mesma lógica da linha na lista, só que a partir
  // de dentro do próprio formulário de edição.
  async function withBusy(fn: () => Promise<unknown>, closeAfter = true) {
    setBusy(true);
    try {
      await fn();
      onSaved();
      if (closeAfter) onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const handleDuplicateAction = () => recurring && withBusy(() => duplicateRecurringTransaction(recurring), false);
  const handleSettleAction = () => recurring && occurrenceDate && withBusy(() => settleOccurrence(recurring, occurrenceDate, installmentNumber));
  const handleDeleteThisAction = () => recurring && occurrenceDate && withBusy(() => deleteOccurrenceOnly(recurring, occurrenceDate, occurrenceTransaction));
  const handleDeleteThisAndFutureAction = () =>
    recurring && occurrenceDate && withBusy(() => deleteOccurrenceAndFuture(recurring, occurrenceDate, occurrenceTransaction));
  const handleDeleteAllAction = () => recurring && withBusy(() => deleteRecurringKeepingHistory(recurring.id));

  const body = (
    <>
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
        <h3 className="text-[0.98rem] font-bold">{isEditing ? "Editar recorrência" : "Nova recorrência"}</h3>
        <div className="flex items-center gap-1.5">
          {isEditing && occurrenceDate && (
            <RecurringOccurrenceMenu
              onDuplicate={handleDuplicateAction}
              onSettle={occurrenceTransaction ? undefined : handleSettleAction}
              onSettlePartial={occurrenceTransaction ? undefined : () => setShowPartial(true)}
              onDeleteThis={handleDeleteThisAction}
              onDeleteThisAndFuture={handleDeleteThisAndFutureAction}
              onDeleteAll={handleDeleteAllAction}
            />
          )}
          <button onClick={onClose} className="card flex h-7 w-7 items-center justify-center rounded-[9px] text-[var(--text-muted)] transition-colors hover:text-[var(--text)]">
            <IconX width={13} height={13} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="mb-3 flex rounded-[11px] border border-[var(--border)] bg-[var(--bg)] p-[3px]">
          <button
            onClick={() => setType("expense")}
            className={"flex-1 rounded-lg py-1.5 text-[0.8rem] font-bold transition-colors " + (type === "expense" ? "solid-danger" : "text-[var(--text-muted)]")}
          >
            Despesa
          </button>
          <button
            onClick={() => setType("income")}
            className={"flex-1 rounded-lg py-1.5 text-[0.8rem] font-bold transition-colors " + (type === "income" ? "bg-[var(--panel-elevated)] text-[var(--text)]" : "text-[var(--text-muted)]")}
          >
            Receita
          </button>
        </div>

        {amountPreview && (
          <div className={"mono mb-4 text-[1.5rem] font-bold leading-none " + (type === "income" ? "text-[var(--text)]" : "text-[var(--danger)]")}>
            {type === "income" ? "+" : "−"}
            {amountPreview}
          </div>
        )}

        <div className={"flex flex-col gap-3.5 transition-all duration-200 " + (swapping ? "scale-[0.99] opacity-40" : "scale-100 opacity-100")}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor">
              <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" className="input mono" autoFocus={!docked} />
            </Field>
            <Field label="Categoria">
              <CategorySelect categories={relevantCategories} value={categoryId} onChange={setCategoryId} />
            </Field>
          </div>

          <Field label="Descrição">
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Aluguel, Netflix, Financiamento do carro" className="input" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Pagador / Recebedor">
              <input value={payeeName} onChange={(e) => setPayeeName(e.target.value)} placeholder="Ex.: Imobiliária Ideal" className="input" />
            </Field>
            <Field label="Conta">
              <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className="input">
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Forma de pagamento">
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className="input">
              <option value="">Sem definir</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </Field>

          <div className="flex rounded-[11px] border border-[var(--border)] bg-[var(--bg)] p-[3px]">
            <button
              onClick={() => setKind("fixed")}
              className={"flex-1 rounded-lg py-1.5 text-[0.78rem] font-bold transition-colors " + (kind === "fixed" ? "bg-[var(--panel-elevated)] text-[var(--text)]" : "text-[var(--text-muted)]")}
            >
              Fixa
            </button>
            <button
              onClick={() => setKind("installment")}
              className={"flex-1 rounded-lg py-1.5 text-[0.78rem] font-bold transition-colors " + (kind === "installment" ? "bg-[var(--panel-elevated)] text-[var(--text)]" : "text-[var(--text-muted)]")}
            >
              Parcelada
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Frequência">
              <select value={frequency} onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)} className="input">
                {FREQUENCIES.map((f) => (
                  <option key={f.value} value={f.value}>
                    {f.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="A cada">
              <input type="number" min={1} value={intervalCount} onChange={(e) => setIntervalCount(e.target.value)} className="input mono" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Início">
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="input mono" />
            </Field>
            <Field label={kind === "installment" ? "Parcelas" : "Dia de vencimento"}>
              {kind === "installment" ? (
                <input type="number" min={1} value={totalInstallments} onChange={(e) => setTotalInstallments(e.target.value)} className="input mono" />
              ) : (
                <input type="number" min={1} max={31} value={dueDay} onChange={(e) => setDueDay(e.target.value)} placeholder="mesmo dia do início" className="input mono" />
              )}
            </Field>
          </div>

          {kind === "fixed" && (
            <Field label="Encerra em (opcional)">
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="input mono" />
            </Field>
          )}

          <Field label="Observações">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" rows={2} className="input resize-none" />
          </Field>

          {isEditing && (
            <label className="flex items-center gap-2.5 text-[0.8rem] font-semibold text-[var(--text-muted)]">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="h-4 w-4 accent-[var(--text)]" />
              Recorrência ativa
            </label>
          )}
        </div>

        {error && <p className="mt-3 text-[0.75rem] text-[var(--danger)]">{error}</p>}
      </div>

      <div className="border-t border-[var(--border)] px-5 py-4">
        <button onClick={handleSave} disabled={saving || busy} className="solid w-full rounded-[13px] py-3 text-[0.86rem] font-bold shadow-[var(--shadow-card)] transition-transform active:scale-[0.98] disabled:opacity-60">
          {saving ? "Salvando…" : isEditing ? "Salvar alterações" : "Criar recorrência"}
        </button>
      </div>
    </>
  );

  // Overlay flutuante próprio, independente do modal estar docked ou não —
  // por isso pode só se sobrepor por cima, sem precisar de outro tratamento.
  const partialModal = showPartial && recurring && occurrenceDate && (
    <PartialSettleModal
      recurring={recurring}
      date={occurrenceDate}
      installmentNumber={installmentNumber}
      onClose={() => setShowPartial(false)}
      onSaved={() => {
        onSaved();
        onClose();
      }}
    />
  );

  if (docked) {
    return (
      <div className="flex h-full w-full flex-col border-l border-[var(--border)] bg-[var(--panel)]">
        {body}
        {partialModal}
        <style>{INPUT_STYLE}</style>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="animate-fade-in absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="card relative flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-2xl">
        {body}
      </div>
      {partialModal}
      <style>{INPUT_STYLE}</style>
    </div>
  );
}

const INPUT_STYLE = `
  .input {
    width: 100%;
    background: var(--panel-elevated);
    border: 1px solid var(--border);
    border-radius: 11px;
    padding: 9px 11px;
    font-size: 0.83rem;
    color: var(--text);
    font-family: inherit;
    transition: border-color .15s ease;
  }
  .input:focus { outline: 2px solid var(--border-strong); outline-offset: 1px; }
`;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[0.66rem] font-semibold uppercase tracking-[0.06em] text-[var(--text-faint)]">{label}</span>
      {children}
    </label>
  );
}
