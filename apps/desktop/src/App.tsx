import { useEffect, useState } from "react";
import { Sidebar, type Page } from "./components/Sidebar";
import { Dashboard } from "./pages/Dashboard";
import { TransactionsPage } from "./pages/Transactions";
import { RecurringPage } from "./pages/Recurring";
import { WorkflowPage } from "./pages/Workflow";
import { AccountsPage } from "./pages/Accounts";
import { CategoriesPage } from "./pages/Categories";
import { BackupSettingsPage } from "./pages/BackupSettings";
import { SettingsPage } from "./pages/Settings";
import { ComingSoon } from "./pages/ComingSoon";
import { TransactionModal } from "./components/TransactionModal";
import { useNexusData } from "./lib/hooks";
import { listCategories } from "./lib/db";
import { getServerUrl } from "./lib/serverConfig";
import { initBackupWorker } from "./lib/backup";
import { defaultPeriod, type Period } from "./lib/period";
import type { PanelTarget } from "./lib/panelTarget";
import type { RecurringPanelTarget } from "./lib/recurringPanelTarget";
import { RecurringModal } from "./components/RecurringModal";

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");
  const [ready, setReady] = useState(false);
  // Se o boot falhar (ex.: erro de migration no banco), melhor mostrar o
  // motivo do que ficar preso em "Carregando…" pra sempre sem nenhuma pista.
  const [bootError, setBootError] = useState<string | null>(null);
  // Período "universal": a mesma seleção vale no Painel e em Transações,
  // igual o botão "Novo lançamento" aparece nas duas telas.
  const [period, setPeriod] = useState<Period>(defaultPeriod());
  // Painel de lançamento fixo, em Transações — mora aqui (não na página)
  // porque, fixo, ele reserva uma coluna no layout inteiro da janela, não
  // só dentro da área de conteúdo.
  const [panelTarget, setPanelTarget] = useState<PanelTarget | null>(null);
  const [panelPinned, setPanelPinned] = useState(false);
  // Mesmo esquema, pro painel de recorrência em Recorrências.
  const [recurringPanelTarget, setRecurringPanelTarget] = useState<RecurringPanelTarget | null>(null);
  const [recurringPanelPinned, setRecurringPanelPinned] = useState(false);
  const data = useNexusData();

  // O app não guarda mais banco local — tudo depende do servidor (Docker,
  // porta 7023 por padrão) estar no ar. Uma chamada simples aqui no boot
  // (as categorias já vêm seedadas por padrão no servidor) serve de "ping":
  // se falhar, mostra o motivo em vez de ficar preso em "Carregando…" sem
  // nenhuma pista de que o servidor é que não está rodando.
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    (async () => {
      try {
        await listCategories();
        setReady(true);
        // Garante que os dados sejam (re)carregados junto deste ping — se
        // uma tentativa anterior do useNexusData já tinha falhado (ex.:
        // servidor ainda subindo), essa falha não tem retry automático
        // próprio, então força um aqui.
        data.refresh();
        unlisten = await initBackupWorker();
      } catch (err) {
        console.error("Falha ao iniciar o Nexus:", err);
        const detail = err instanceof Error ? err.message : String(err);
        setBootError(`Não consegui falar com o servidor Nexus em ${getServerUrl()}. Confira se ele está rodando (docker compose up -d). Detalhe: ${detail}`);
      }
    })();
    return () => unlisten?.();
  }, []);

  const dockedEditingTx = panelTarget?.mode === "edit" ? panelTarget.tx : undefined;
  const dockedRecurringTarget = recurringPanelTarget?.mode === "edit" ? recurringPanelTarget : undefined;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar current={page} onNavigate={setPage} />

      <main className="flex flex-1 overflow-hidden">
        <div className="min-w-0 flex-1 overflow-y-auto p-7">
          {page === "settings" ? (
            // Sempre acessível, mesmo com bootError — é a válvula de escape
            // pra corrigir o endereço/chave do servidor sem precisar editar
            // nada fora do app.
            <SettingsPage />
          ) : bootError ? (
            <div className="mx-auto mt-20 max-w-md rounded-2xl border border-[var(--danger)] bg-[rgba(228,99,107,0.08)] px-6 py-5 text-center">
              <p className="mb-1.5 text-[0.9rem] font-bold text-[var(--danger)]">Não consegui iniciar o Nexus</p>
              <p className="mono mb-4 text-[0.72rem] text-[var(--text-faint)]">{bootError}</p>
              <div className="flex justify-center gap-2">
                <button onClick={() => window.location.reload()} className="card rounded-[10px] px-3.5 py-2 text-[0.78rem] font-semibold text-[var(--text-muted)] hover:text-[var(--text)]">
                  Tentar de novo
                </button>
                <button onClick={() => setPage("settings")} className="solid rounded-[10px] px-3.5 py-2 text-[0.78rem] font-bold">
                  Configurar servidor
                </button>
              </div>
            </div>
          ) : !ready ? (
            <div className="py-20 text-center text-[0.82rem] text-[var(--text-faint)]">Carregando…</div>
          ) : page === "dashboard" ? (
            <Dashboard data={data} period={period} onPeriodChange={setPeriod} />
          ) : page === "transactions" ? (
            <TransactionsPage
              data={data}
              period={period}
              onPeriodChange={setPeriod}
              panelTarget={panelTarget}
              onPanelTargetChange={setPanelTarget}
              panelPinned={panelPinned}
              onTogglePanelPinned={() => setPanelPinned((v) => !v)}
            />
          ) : page === "backup" ? (
            <BackupSettingsPage onDataChanged={data.refresh} />
          ) : page === "recurring" ? (
            <RecurringPage
              data={data}
              period={period}
              onPeriodChange={setPeriod}
              panelTarget={recurringPanelTarget}
              onPanelTargetChange={setRecurringPanelTarget}
              panelPinned={recurringPanelPinned}
              onTogglePanelPinned={() => setRecurringPanelPinned((v) => !v)}
            />
          ) : page === "workflow" ? (
            <WorkflowPage data={data} />
          ) : page === "accounts" ? (
            <AccountsPage data={data} />
          ) : page === "categories" ? (
            <CategoriesPage data={data} period={period} onPeriodChange={setPeriod} />
          ) : page === "help" ? (
            <ComingSoon title="Ajuda & Suporte" description="Central de ajuda e canais de suporte — próxima etapa do desenvolvimento." />
          ) : (
            <SettingsPage />
          )}
        </div>

        {ready && page === "transactions" && panelPinned && panelTarget && (
          <div className="h-full w-[420px] shrink-0 overflow-hidden">
            <TransactionModal
              docked
              categories={data.categories}
              accounts={data.accounts}
              transaction={dockedEditingTx}
              payeeName={dockedEditingTx && data.payeesById.get(dockedEditingTx.payeeId ?? "")?.name}
              onClose={() => setPanelTarget(null)}
              onSaved={data.refresh}
            />
          </div>
        )}

        {ready && page === "recurring" && recurringPanelPinned && recurringPanelTarget && (
          <div className="h-full w-[420px] shrink-0 overflow-hidden">
            <RecurringModal
              docked
              categories={data.categories}
              accounts={data.accounts}
              recurring={dockedRecurringTarget?.recurring}
              payeeName={dockedRecurringTarget && data.payeesById.get(dockedRecurringTarget.recurring.payeeId ?? "")?.name}
              occurrenceDate={dockedRecurringTarget?.occurrenceDate}
              installmentNumber={dockedRecurringTarget?.installmentNumber}
              occurrenceTransaction={dockedRecurringTarget?.occurrenceTransaction}
              onClose={() => setRecurringPanelTarget(null)}
              onSaved={data.refresh}
            />
          </div>
        )}
      </main>
    </div>
  );
}
