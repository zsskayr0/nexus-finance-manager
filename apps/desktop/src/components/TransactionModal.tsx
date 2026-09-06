import { useEffect, useRef, useState } from "react";
import { formatCentsToBRL, toCents, todayISO, fromCents, type Account, type Category, type PaymentMethod, type Transaction } from "@nexus/core";
import { deleteTransaction, findOrCreatePayee, insertTransaction, updateTransaction } from "../lib/db";
import { CategorySelect } from "./CategorySelect";
import { IconCheck, IconTrash, IconX } from "./icons";

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
 * Painel de lançamento — dois jeitos de aparecer:
 *  - flutuante (padrão): modal centralizado, fecha ao clicar fora. Cada
 *    abertura é uma instância nova (o pai troca a `key`).
 *  - fixo (`docked`): painel colado na direita, sem fundo escurecendo o
 *    resto da tela. O pai mantém a MESMA instância entre lançamentos
 *    diferentes (key constante) — então, em vez de fechar/reabrir, os
 *    campos são resincronizados aqui dentro e o valor "rola" como um
 *    caça-níquel até o novo número.
 */
export function TransactionModal({
  categories,
  accounts,
  transaction,
  payeeName: existingPayeeName,
  docked = false,
  onClose,
  onSaved,
}: {
  categories: Category[];
  accounts: Account[];
  transaction?: Transaction;
  /** Nome do pagador/recebedor já resolvido (o painel não faz lookup por id sozinho). */
  payeeName?: string;
  docked?: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = !!transaction;
  const [type, setType] = useState<"income" | "expense">(transaction?.type ?? "expense");
  const [amount, setAmount] = useState(transaction ? fromCents(transaction.amountCents).toFixed(2).replace(".", ",") : "");
  const [description, setDescription] = useState(transaction?.description ?? "");
  const [date, setDate] = useState(transaction?.occurredAt ?? todayISO());
  const [categoryId, setCategoryId] = useState<string>(transaction?.categoryId ?? "");
  const [payeeName, setPayeeName] = useState(existingPayeeName ?? "");
  const defaultAccountId = accounts.find((a) => a.isDefault)?.id ?? accounts[0]?.id ?? "";
  const [accountId, setAccountId] = useState(transaction?.accountId ?? defaultAccountId);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(transaction?.paymentMethod ?? "pix");
  const [notes, setNotes] = useState(transaction?.notes ?? "");
  // Prevista (padrão) x efetivada — some lançamento novo entra como algo que
  // ainda vai acontecer, não como fato consumado; o gráfico do Painel usa
  // esse status (não a data) pra decidir o que é sólido e o que é pontilhado.
  const [isReconciled, setIsReconciled] = useState(transaction?.isReconciled ?? false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [swapping, setSwapping] = useState(false);

  // Painel fixo trocando de lançamento (mesma instância, prop nova) —
  // resincroniza os campos e dispara o pulso visual + a roleta do valor.
  const targetId = transaction?.id ?? "new";
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    setSwapping(true);
    setType(transaction?.type ?? "expense");
    setAmount(transaction ? fromCents(transaction.amountCents).toFixed(2).replace(".", ",") : "");
    setDescription(transaction?.description ?? "");
    setDate(transaction?.occurredAt ?? todayISO());
    setCategoryId(transaction?.categoryId ?? "");
    setPayeeName(existingPayeeName ?? "");
    setAccountId(transaction?.accountId ?? defaultAccountId);
    setPaymentMethod(transaction?.paymentMethod ?? "pix");
    setNotes(transaction?.notes ?? "");
    setIsReconciled(transaction?.isReconciled ?? false);
    setError(null);
    const t = setTimeout(() => setSwapping(false), 220);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId]);

  const relevantCategories = categories.filter((c) => c.type === type || c.type === "both");
  const parsedAmount = Number(amount.replace(/\./g, "").replace(",", "."));
  const amountPreview = Number.isFinite(parsedAmount) && amount ? formatCentsToBRL(toCents(parsedAmount)) : null;

  async function handleSave() {
    setError(null);
    if (!description.trim()) return setError("Informe uma descrição.");
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) return setError("Informe um valor válido.");

    setSaving(true);
    try {
      const payeeId = payeeName.trim() ? await findOrCreatePayee(payeeName) : null;
      const draft = {
        type,
        amountCents: toCents(parsedAmount),
        currency: "BRL" as const,
        occurredAt: date,
        description: description.trim(),
        categoryId: categoryId || null,
        payeeId,
        accountId: accountId || null,
        paymentMethod,
        notes: notes.trim() || null,
        source: "manual" as const,
        isReconciled,
      };
      if (isEditing) {
        await updateTransaction(transaction.id, draft);
      } else {
        await insertTransaction(draft);
      }
      onSaved();
      if (!docked) onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!transaction) return;
    setDeleting(true);
    try {
      await deleteTransaction(transaction.id);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setDeleting(false);
    }
  }

  const body = (
    <>
      <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
        <h3 className="text-[0.98rem] font-bold">{isEditing ? "Editar lançamento" : "Novo lançamento"}</h3>
        <div className="flex items-center gap-1.5">
          {isEditing && (
            <button
              onClick={handleDelete}
              disabled={deleting || saving}
              title="Excluir lançamento"
              className="card flex h-7 w-7 items-center justify-center rounded-[9px] text-[var(--text-muted)] transition-colors hover:text-[var(--danger)] disabled:opacity-60"
            >
              <IconTrash width={13} height={13} />
            </button>
          )}
          <button onClick={onClose} className="card flex h-7 w-7 items-center justify-center rounded-[9px] text-[var(--text-muted)] transition-colors hover:text-[var(--text)]">
            <IconX width={13} height={13} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="mb-4 flex rounded-[11px] border border-[var(--border)] bg-[var(--bg)] p-[3px]">
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

        <div className="mb-4 flex rounded-[11px] border border-[var(--border)] bg-[var(--bg)] p-[3px]">
          <button
            onClick={() => setIsReconciled(false)}
            title="Ainda não aconteceu — entra pontilhado na previsão do gráfico"
            className={"flex-1 rounded-lg py-1.5 text-[0.8rem] font-bold transition-colors " + (!isReconciled ? "bg-[var(--panel-elevated)] text-[var(--text)]" : "text-[var(--text-muted)]")}
          >
            Prevista
          </button>
          <button
            onClick={() => setIsReconciled(true)}
            title="Já aconteceu de verdade — entra sólido no gráfico"
            className={"flex flex-1 items-center justify-center gap-1.5 rounded-lg py-1.5 text-[0.8rem] font-bold transition-colors " + (isReconciled ? "solid" : "text-[var(--text-muted)]")}
          >
            <IconCheck width={12} height={12} strokeWidth={2.6} />
            Efetivada
          </button>
        </div>

        {amountPreview && (
          <RollingAmount
            rollKey={targetId}
            text={`${type === "income" ? "+" : "−"}${amountPreview}`}
            className={"mono mb-4 block text-[1.8rem] font-bold leading-none " + (type === "income" ? "text-[var(--text)]" : "text-[var(--danger)]")}
          />
        )}

        <div className={"flex flex-col gap-3.5 transition-all duration-200 " + (swapping ? "scale-[0.99] opacity-40" : "scale-100 opacity-100")}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor">
              <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0,00" className="input mono" autoFocus={!docked} />
            </Field>
            <Field label="Data">
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="input mono" />
            </Field>
          </div>

          <Field label="Descrição">
            <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Mercado Extra" className="input" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Categoria">
              <CategorySelect categories={relevantCategories} value={categoryId} onChange={setCategoryId} />
            </Field>
            <Field label="Forma de pagamento">
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)} className="input">
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Pagador / Recebedor">
              <input value={payeeName} onChange={(e) => setPayeeName(e.target.value)} placeholder="Ex.: Mercado Extra Ltda" className="input" />
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

          <Field label="Observações">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Opcional" rows={3} className="input resize-none" />
          </Field>
        </div>

        {error && <p className="mt-3 text-[0.75rem] text-[var(--danger)]">{error}</p>}
      </div>

      <div className="border-t border-[var(--border)] px-5 py-4">
        <button onClick={handleSave} disabled={saving || deleting} className="solid w-full rounded-[13px] py-3 text-[0.86rem] font-bold shadow-[var(--shadow-card)] transition-transform active:scale-[0.98] disabled:opacity-60">
          {saving ? "Salvando…" : isEditing ? "Salvar alterações" : "Salvar lançamento"}
        </button>
      </div>
    </>
  );

  if (docked) {
    // Faz parte do layout da página (o pai reserva a coluna) — não é
    // posicionamento fixo, então empurra o conteúdo ao lado em vez de
    // flutuar por cima dele.
    return (
      <div className="animate-slide-in-right flex h-full w-full flex-col border-l border-[var(--border)] bg-[var(--panel)]">
        {body}
        <style>{INPUT_STYLE}</style>
      </div>
    );
  }

  // Sem fixar: volta a ser o menu flutuante centralizado de sempre —
  // fecha ao clicar fora, um de cada vez.
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="animate-fade-in absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="card animate-pop-in relative flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl">
        {body}
      </div>
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

/**
 * Número que "rola" como caça-níquel quando `rollKey` muda (não quando só
 * `text` muda, como ao digitar) — cada dígito passa por uns ticks aleatórios
 * antes de assentar no valor real; sinal e pontuação ficam parados.
 */
function RollingAmount({ text, rollKey, className }: { text: string; rollKey: string; className?: string }) {
  const [display, setDisplay] = useState(text);
  const prevKey = useRef(rollKey);

  useEffect(() => {
    if (prevKey.current === rollKey) {
      // mesmo lançamento (ex.: digitando o valor) — atualiza na hora, sem rolar.
      setDisplay(text);
      return;
    }
    prevKey.current = rollKey;

    let ticks = 0;
    const maxTicks = 7;
    const id = setInterval(() => {
      ticks++;
      if (ticks >= maxTicks) {
        setDisplay(text);
        clearInterval(id);
        return;
      }
      setDisplay(text.replace(/\d/g, () => String(Math.floor(Math.random() * 10))));
    }, 40);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rollKey, text]);

  return <span className={className}>{display}</span>;
}
