import { useState } from "react";
import type { Account } from "@nexus/core";
import { deleteAccountKeepingHistory, insertAccount, updateAccount } from "../lib/db";
import { COLOR_SWATCHES } from "../lib/colorSwatches";
import { BankPicker } from "./BankPicker";
import { IconTrash, IconX } from "./icons";

/** Cria ou edita uma conta (bancária ou a "Carteira Física") — passe `account` para abrir em modo edição. */
export function AccountModal({
  account,
  totalAccounts,
  onClose,
  onSaved,
}: {
  account?: Account;
  /** Quantas contas existem no total — bloqueia excluir a última (sempre precisa sobrar pelo menos uma). */
  totalAccounts: number;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = !!account;
  const [name, setName] = useState(account?.name ?? "");
  const [bank, setBank] = useState(account?.bank ?? "");
  const [color, setColor] = useState(account?.color ?? COLOR_SWATCHES[0]!);
  const [agency, setAgency] = useState(account?.agency ?? "");
  const [accountNumber, setAccountNumber] = useState(account?.accountNumber ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleBankPick(pickedBank: string, suggestedColor: string | null) {
    // Nome ainda vazio, ou igual ao banco escolhido antes (nunca foi editado
    // à mão) — atualiza junto. Depois que o usuário digitar o próprio nome,
    // trocar de banco não mexe mais nele.
    setName((prev) => (prev.trim() === "" || prev === bank ? pickedBank : prev));
    setBank(pickedBank);
    if (suggestedColor) setColor(suggestedColor);
  }

  async function handleSave() {
    setError(null);
    if (!name.trim()) return setError("Informe um nome pra conta.");

    setSaving(true);
    try {
      const draft = {
        name: name.trim(),
        bank: bank.trim() || null,
        agency: agency.trim() || null,
        accountNumber: accountNumber.trim() || null,
        color,
        isDefault: account?.isDefault ?? false,
      };
      if (isEditing) {
        await updateAccount(account.id, draft);
      } else {
        await insertAccount(draft);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!account) return;
    if (totalAccounts <= 1) return setError("Precisa sobrar pelo menos uma conta.");
    setDeleting(true);
    try {
      await deleteAccountKeepingHistory(account.id);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setDeleting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="animate-fade-in absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="card relative flex w-full max-w-sm flex-col overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
          <h3 className="text-[0.98rem] font-bold">{isEditing ? "Editar conta" : "Nova conta"}</h3>
          <div className="flex items-center gap-1.5">
            {isEditing && (
              <button
                onClick={handleDelete}
                disabled={deleting || saving}
                title="Excluir conta"
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

        <div className="flex flex-col gap-3.5 px-5 py-5">
          <Field label="Banco">
            <BankPicker value={bank} onPick={handleBankPick} />
          </Field>

          <Field label="Nome da conta">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Itaú — Pessoal" className="input" />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Agência (AG)">
              <input value={agency} onChange={(e) => setAgency(e.target.value)} placeholder="Opcional" className="input mono" />
            </Field>
            <Field label="Conta (CC)">
              <input value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} placeholder="Opcional" className="input mono" />
            </Field>
          </div>

          <Field label="Cor de identificação">
            <div className="flex flex-wrap gap-2">
              {COLOR_SWATCHES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  title={c}
                  className="h-7 w-7 shrink-0 rounded-full transition-transform active:scale-90"
                  style={{
                    background: c,
                    boxShadow: color === c ? "0 0 0 2px var(--panel), 0 0 0 4px var(--text)" : "0 0 0 1px var(--border)",
                  }}
                />
              ))}
            </div>
          </Field>

          {error && <p className="text-[0.75rem] text-[var(--danger)]">{error}</p>}
        </div>

        <div className="border-t border-[var(--border)] px-5 py-4">
          <button onClick={handleSave} disabled={saving || deleting} className="solid w-full rounded-[13px] py-3 text-[0.86rem] font-bold shadow-[var(--shadow-card)] transition-transform active:scale-[0.98] disabled:opacity-60">
            {saving ? "Salvando…" : isEditing ? "Salvar alterações" : "Criar conta"}
          </button>
        </div>
      </div>

      <style>{`
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
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[0.66rem] font-semibold uppercase tracking-[0.06em] text-[var(--text-faint)]">{label}</span>
      {children}
    </label>
  );
}
