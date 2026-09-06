import { useState } from "react";
import type { Account } from "@nexus/core";
import type { NexusData } from "../lib/hooks";
import { KNOWN_BANKS } from "../lib/banks";
import { AccountModal } from "../components/AccountModal";
import { BankBadge, readableTextColor } from "../components/BankBadge";
import { IconBank, IconPlus } from "../components/icons";

export function AccountsPage({ data }: { data: NexusData }) {
  const { accounts, refresh } = data;
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  return (
    <div className="max-w-2xl">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h2 className="page-title">Contas</h2>
        <button
          onClick={() => setShowNew(true)}
          className="solid flex items-center gap-2 rounded-[11px] px-4 py-2.5 text-[0.8rem] font-bold shadow-[var(--shadow-card)] transition-transform active:scale-[0.98]"
        >
          <IconPlus width={14} height={14} strokeWidth={2.4} />
          Nova conta
        </button>
      </div>

      <div className="card overflow-hidden rounded-2xl">
        {accounts.map((a) => {
          const known = a.bank ? KNOWN_BANKS.find((b) => b.name === a.bank) : undefined;
          return (
          <button
            key={a.id}
            onClick={() => setEditing(a)}
            className="flex w-full items-center gap-3 border-b border-[var(--border)] px-[18px] py-3.5 text-left transition-colors last:border-b-0 hover:bg-[rgba(255,255,255,0.03)]"
          >
            {known ? (
              <BankBadge color={known.color} initials={known.initials} size={36} />
            ) : (
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]"
                style={{ background: a.color, color: readableTextColor(a.color) }}
              >
                <IconBank width={16} height={16} />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-[0.85rem] font-bold">{a.name}</span>
                {a.isDefault && (
                  <span className="shrink-0 rounded-full border border-[var(--border-strong)] px-2 py-0.5 text-[0.62rem] font-bold text-[var(--text-faint)]">Padrão</span>
                )}
              </div>
              <div className="truncate text-[0.72rem] text-[var(--text-faint)]">
                {a.bank ?? (a.agency || a.accountNumber ? "" : "Sem dados bancários")}
                {a.agency && ` · AG ${a.agency}`}
                {a.accountNumber && ` · CC ${a.accountNumber}`}
              </div>
            </div>
          </button>
          );
        })}
      </div>

      {showNew && <AccountModal totalAccounts={accounts.length} onClose={() => setShowNew(false)} onSaved={refresh} />}
      {editing && (
        <AccountModal account={editing} totalAccounts={accounts.length} onClose={() => setEditing(null)} onSaved={refresh} />
      )}
    </div>
  );
}
