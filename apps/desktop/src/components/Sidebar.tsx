import { useState } from "react";
import { AppLogo } from "./Logo";
import {
  IconBank,
  IconChevronsUpDown,
  IconCloudDown,
  IconGithub,
  IconGrid,
  IconKanban,
  IconLifeBuoy,
  IconList,
  IconLogOut,
  IconRepeat,
  IconSettings,
  IconTag,
  IconX,
} from "./icons";

export type Page = "dashboard" | "transactions" | "recurring" | "workflow" | "accounts" | "categories" | "backup" | "settings" | "help";

// TODO: troque pela URL real assim que o repositório existir no GitHub.
const GITHUB_REPO_URL: string | null = null;

const NAV_ITEMS: Array<{ page: Page; label: string; icon: typeof IconGrid }> = [
  { page: "dashboard", label: "Painel", icon: IconGrid },
  { page: "transactions", label: "Transações", icon: IconList },
  { page: "recurring", label: "Recorrências", icon: IconRepeat },
  { page: "workflow", label: "Fluxo de Trabalho", icon: IconKanban },
  { page: "accounts", label: "Contas", icon: IconBank },
  { page: "categories", label: "Categorias", icon: IconTag },
];

const SYSTEM_ITEMS: Array<{ page: Page; label: string; icon: typeof IconGrid }> = [
  { page: "backup", label: "Backup & CSV", icon: IconCloudDown },
  { page: "help", label: "Ajuda & Suporte", icon: IconLifeBuoy },
  { page: "settings", label: "Configurações", icon: IconSettings },
];

/**
 * No desktop (`md:` e acima) é a coluna fixa de sempre. Abaixo disso vira
 * uma gaveta (drawer) fora do fluxo — `fixed`, deslizando de baixo do
 * conteúdo — controlada por `mobileOpen`/`onCloseMobile` (estado mora em
 * App.tsx, que também abre um botão de hambúrguer numa barra só-mobile).
 */
export function Sidebar({
  current,
  onNavigate,
  mobileOpen = false,
  onCloseMobile,
}: {
  current: Page;
  onNavigate: (p: Page) => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  function handleNavigate(page: Page) {
    onNavigate(page);
    onCloseMobile?.();
  }

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={onCloseMobile} />}
      <aside
        className={
          "fixed inset-y-0 left-0 z-50 flex w-64 shrink-0 flex-col gap-1 border-r border-[var(--border)] bg-[var(--bg)] p-3.5 transition-transform duration-200 md:static md:z-auto md:w-56 md:translate-x-0 " +
          (mobileOpen ? "translate-x-0" : "-translate-x-full")
        }
      >
        <div className="mb-6 flex items-center justify-between px-2 pt-1">
          <AppLogo />
          <button
            onClick={onCloseMobile}
            className="card flex h-7 w-7 items-center justify-center rounded-[9px] text-[var(--text-muted)] md:hidden"
          >
            <IconX width={14} height={14} />
          </button>
        </div>

      <nav className="flex flex-col gap-0.5">
        {NAV_ITEMS.map(({ page, label, icon: Icon }) => (
          <NavLink key={page} active={current === page} onClick={() => handleNavigate(page)}>
            <Icon width={16} height={16} className="shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* empurra o rodapé (sistema + usuário) pra base da sidebar */}
      <div className="mt-auto flex flex-col gap-0.5">
        <div className="mb-1.5 mt-3.5 px-2.5 text-[0.62rem] font-semibold uppercase tracking-[0.09em] text-[var(--text-faint)]">
          Sistema
        </div>
        {SYSTEM_ITEMS.map(({ page, label, icon: Icon }) => (
          <NavLink key={page} active={current === page} onClick={() => handleNavigate(page)}>
            <Icon width={16} height={16} className="shrink-0" />
            {label}
          </NavLink>
        ))}

        {GITHUB_REPO_URL ? (
          <a
            href={GITHUB_REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2.5 rounded-[11px] border border-transparent px-3 py-2.5 text-left text-[0.83rem] font-semibold text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
          >
            <IconGithub width={16} height={16} className="shrink-0" />
            GitHub
          </a>
        ) : (
          <div
            title="Repositório ainda não publicado"
            className="flex cursor-default items-center gap-2.5 rounded-[11px] border border-transparent px-3 py-2.5 text-left text-[0.83rem] font-semibold text-[var(--text-faint)] opacity-50"
          >
            <IconGithub width={16} height={16} className="shrink-0" />
            GitHub
          </div>
        )}

        <div className="relative mt-3 border-t border-[var(--border)] pt-3">
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="card flex w-full items-center gap-2.5 rounded-[11px] px-2.5 py-2 transition-transform active:scale-[0.98]"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] bg-[var(--text)] text-[0.66rem] font-bold text-[var(--bg)]">
              DR
            </div>
            <span className="flex-1 truncate text-left text-[0.82rem] font-semibold">Diogo Roque</span>
            <IconChevronsUpDown width={14} height={14} className="shrink-0 text-[var(--text-faint)]" />
          </button>

          {userMenuOpen && (
            <div className="card animate-pop-in absolute bottom-[calc(100%+6px)] left-0 right-0 z-10 origin-bottom overflow-hidden rounded-[11px] p-1">
              <button
                onClick={() => setUserMenuOpen(false)}
                className="flex w-full items-center gap-2.5 rounded-[9px] px-2.5 py-2 text-left text-[0.8rem] font-medium text-[var(--text-muted)] hover:bg-[var(--panel-elevated)] hover:text-[var(--text)]"
              >
                <IconLogOut width={14} height={14} />
                Sair
              </button>
            </div>
          )}
        </div>
      </div>
      </aside>
    </>
  );
}

function NavLink({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "flex items-center gap-2.5 rounded-[11px] border px-3 py-2.5 text-left text-[0.83rem] font-semibold transition-colors " +
        (active
          ? "border-[var(--border-strong)] bg-[var(--panel-elevated)] text-[var(--text)] shadow-[inset_3px_0_0_0_var(--text)]"
          : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]")
      }
    >
      {children}
    </button>
  );
}
