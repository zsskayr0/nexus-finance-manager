import { useEffect, useRef, useState } from "react";
import { IconCheck, IconCopy, IconMoreHorizontal, IconPencil, IconTrash } from "./icons";

export interface OccurrenceMenuActions {
  /** Ausente dentro do próprio modal de edição — "editar" não faz sentido lá dentro. */
  onEdit?: () => void;
  onDuplicate: () => void;
  /** Ausentes quando a ocorrência já virou lançamento — não faz sentido "concluir" o que já foi lançado. */
  onSettle?: () => void;
  onSettlePartial?: () => void;
  onDeleteThis: () => void;
  onDeleteThisAndFuture: () => void;
  onDeleteAll: () => void;
}

/** Menu "..." de ações por ocorrência — editar/duplicar a regra, concluir (se pendente) e deletar em 3 alcances. */
export function RecurringOccurrenceMenu({ onEdit, onDuplicate, onSettle, onSettlePartial, onDeleteThis, onDeleteThisAndFuture, onDeleteAll }: OccurrenceMenuActions) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function run(fn: () => void) {
    return (e: React.MouseEvent) => {
      e.stopPropagation();
      setOpen(false);
      fn();
    };
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        title="Mais ações"
        className="card flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
      >
        <IconMoreHorizontal width={14} height={14} />
      </button>

      {open && (
        <div className="card animate-pop-in absolute right-0 top-[calc(100%+4px)] z-20 w-56 origin-top-right overflow-hidden rounded-[12px] p-1">
          {onEdit && (
            <MenuItem icon={<IconPencil width={13} height={13} />} onClick={run(onEdit)}>
              Editar recorrência
            </MenuItem>
          )}
          <MenuItem icon={<IconCopy width={13} height={13} />} onClick={run(onDuplicate)}>
            Duplicar
          </MenuItem>

          {(onSettle || onSettlePartial) && <Separator />}
          {onSettle && (
            <MenuItem icon={<IconCheck width={13} height={13} strokeWidth={2.6} />} onClick={run(onSettle)}>
              Concluir
            </MenuItem>
          )}
          {onSettlePartial && (
            <MenuItem icon={<IconCheck width={13} height={13} strokeWidth={2.6} />} onClick={run(onSettlePartial)}>
              Concluir parcialmente
            </MenuItem>
          )}

          <Separator />
          <MenuItem icon={<IconTrash width={13} height={13} />} danger onClick={run(onDeleteThis)}>
            Excluir só este mês
          </MenuItem>
          <MenuItem icon={<IconTrash width={13} height={13} />} danger onClick={run(onDeleteThisAndFuture)}>
            Excluir este e os próximos
          </MenuItem>
          <MenuItem icon={<IconTrash width={13} height={13} />} danger onClick={run(onDeleteAll)}>
            Excluir toda a recorrência
          </MenuItem>
        </div>
      )}
    </div>
  );
}

function Separator() {
  return <div className="my-1 h-px bg-[var(--border)]" />;
}

function MenuItem({
  icon,
  danger,
  onClick,
  children,
}: {
  icon: React.ReactNode;
  danger?: boolean;
  onClick: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left text-[0.78rem] font-medium transition-colors " +
        (danger ? "text-[var(--danger)] hover:bg-[rgba(228,99,107,0.1)]" : "text-[var(--text-muted)] hover:bg-[var(--panel-elevated)] hover:text-[var(--text)]")
      }
    >
      {icon}
      {children}
    </button>
  );
}
