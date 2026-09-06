import { useState } from "react";
import type { Category, CategoryType } from "@nexus/core";
import { createCategory, deleteCategoryKeepingHistory, updateCategory } from "../lib/db";
import { COLOR_SWATCHES } from "../lib/colorSwatches";
import { IconPicker } from "./IconPicker";
import { IconTrash, IconX } from "./icons";

const TYPE_OPTIONS: Array<{ value: CategoryType; label: string }> = [
  { value: "expense", label: "Despesa" },
  { value: "income", label: "Receita" },
  { value: "both", label: "Ambas" },
];

/**
 * Cria ou edita uma categoria — passe `category` para abrir em modo edição.
 * `onCreated` (opcional) recebe a categoria recém-criada com os dados já em
 * mãos (sem esperar um refresh do banco) — usado pelo CategorySelect pra
 * criar categoria "on the go" de dentro de outro formulário (lançamento,
 * recorrência, pendência) sem precisar navegar até a aba Categorias.
 */
export function CategoryModal({
  category,
  onClose,
  onSaved,
  onCreated,
}: {
  category?: Category;
  onClose: () => void;
  onSaved: () => void;
  onCreated?: (category: Category) => void;
}) {
  const isEditing = !!category;
  const [name, setName] = useState(category?.name ?? "");
  const [type, setType] = useState<CategoryType>(category?.type ?? "expense");
  const [icon, setIcon] = useState<string | null>(category?.icon ?? "tag");
  const [color, setColor] = useState(category?.color ?? COLOR_SWATCHES[0]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setError(null);
    if (!name.trim()) return setError("Informe um nome pra categoria.");

    setSaving(true);
    try {
      const draft = { name: name.trim(), type, icon, color };
      if (isEditing) {
        await updateCategory(category.id, draft);
      } else {
        const id = await createCategory(draft);
        const now = new Date().toISOString();
        onCreated?.({ id, ...draft, isDefault: false, createdAt: now, updatedAt: now });
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
    if (!category) return;
    setDeleting(true);
    try {
      await deleteCategoryKeepingHistory(category.id);
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
          <h3 className="text-[0.98rem] font-bold">{isEditing ? "Editar categoria" : "Nova categoria"}</h3>
          <div className="flex items-center gap-1.5">
            {isEditing && !confirmingDelete && (
              <button
                onClick={() => setConfirmingDelete(true)}
                disabled={deleting || saving}
                title="Excluir categoria"
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

        {confirmingDelete ? (
          <div className="flex flex-col gap-4 px-5 py-5">
            <p className="text-[0.8rem] text-[var(--text-muted)]">
              Excluir <strong className="text-[var(--text)]">{category?.name}</strong>? Lançamentos, recorrências e pendências que usam essa categoria
              continuam existindo — só ficam sem categoria. O histórico não é apagado.
            </p>
            {error && <p className="text-[0.75rem] text-[var(--danger)]">{error}</p>}
            <div className="flex gap-2.5">
              <button
                onClick={() => setConfirmingDelete(false)}
                disabled={deleting}
                className="card flex-1 rounded-[11px] py-2.5 text-[0.82rem] font-semibold text-[var(--text-muted)] transition-transform active:scale-[0.98] disabled:opacity-60"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="solid-danger flex-1 rounded-[11px] py-2.5 text-[0.82rem] font-bold transition-transform active:scale-[0.98] disabled:opacity-60"
              >
                {deleting ? "Excluindo…" : "Excluir"}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-3.5 px-5 py-5">
              <Field label="Nome da categoria">
                <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Lazer" className="input" autoFocus />
              </Field>

              <Field label="Tipo">
                <div className="card flex rounded-[11px] p-0.5">
                  {TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setType(opt.value)}
                      className={
                        "flex-1 rounded-[9px] px-2 py-1.5 text-[0.76rem] font-bold transition-colors " +
                        (type === opt.value ? "bg-[var(--panel-elevated)] text-[var(--text)]" : "text-[var(--text-muted)] hover:text-[var(--text)]")
                      }
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Ícone">
                <IconPicker value={icon} onPick={setIcon} />
              </Field>

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
              <button
                onClick={handleSave}
                disabled={saving}
                className="solid w-full rounded-[13px] py-3 text-[0.86rem] font-bold shadow-[var(--shadow-card)] transition-transform active:scale-[0.98] disabled:opacity-60"
              >
                {saving ? "Salvando…" : isEditing ? "Salvar alterações" : "Criar categoria"}
              </button>
            </div>
          </>
        )}
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
