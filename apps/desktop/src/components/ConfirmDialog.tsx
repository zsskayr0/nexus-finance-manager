/** Confirmação simples pra ações destrutivas (ex.: excluir em bloco) — sim/não, sem campos. */
export function ConfirmDialog({
  title,
  message,
  confirmLabel = "Excluir",
  busy = false,
  onConfirm,
  onCancel,
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="animate-fade-in absolute inset-0 bg-black/60" onClick={onCancel} />
      <div className="card relative flex w-full max-w-sm flex-col overflow-hidden rounded-2xl p-5">
        <h3 className="mb-1.5 text-[0.95rem] font-bold">{title}</h3>
        <p className="mb-4 text-[0.8rem] text-[var(--text-muted)]">{message}</p>
        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            disabled={busy}
            className="card flex-1 rounded-[11px] py-2.5 text-[0.82rem] font-semibold text-[var(--text-muted)] transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="solid-danger flex-1 rounded-[11px] py-2.5 text-[0.82rem] font-bold transition-transform active:scale-[0.98] disabled:opacity-60"
          >
            {busy ? "Excluindo…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
