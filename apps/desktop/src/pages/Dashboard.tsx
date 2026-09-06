import { useEffect, useMemo, useRef, useState } from "react";
import { formatCentsToBRL, todayISO, type Transaction } from "@nexus/core";
import {
  computeKpis,
  expenseByCategory,
  expenseByPaymentMethod,
  incomeExpenseForPeriodWithForecast,
  topExpenses,
  topIncomes,
} from "../lib/aggregate";
import { periodNoun, periodRange, type Period } from "../lib/period";
import { getGreeting } from "../lib/greeting";
import { CHART_PALETTES, loadChartColorMode, saveChartColorMode, type ChartColorMode } from "../lib/chartColors";
import { pendingRecurrencesForPeriod } from "../lib/recurring";
import { setTransactionReconciled } from "../lib/db";
import type { NexusData } from "../lib/hooks";
import { KpiCard } from "../components/KpiCard";
import { PeriodPicker } from "../components/PeriodPicker";
import { ComposedAreaChart } from "../components/charts/ComposedAreaChart";
import { DonutChart } from "../components/charts/DonutChart";
import { HorizontalBarChart } from "../components/charts/HorizontalBarChart";
import { PendingList } from "../components/PendingList";
import { PendingItemModal } from "../components/PendingItemModal";
import { TransactionsPanel } from "../components/TransactionsPanel";
import { TransactionModal } from "../components/TransactionModal";
import { IconArrowDown, IconArrowUp, IconMoon, IconPlus, IconSun, IconWallet } from "../components/icons";

// Primeira linha: só o gráfico principal (baixinho, de propósito) e
// "Recorrências pendentes", lado a lado. `overflow:hidden`/`min-h-0` sozinhos
// NÃO bastam aqui: numa linha de altura automática (flex ou grid), o
// tamanho da linha é definido pelo maior conteúdo entre os dois lados —
// "esconder overflow" só evita que o conteúdo VAZE pra fora da caixa, não
// muda o tamanho que a caixa pede pra ter. Com muitas recorrências
// pendentes, o card pedia uma caixa gigante e a linha toda esticava pra
// caber. A solução é medir a altura REAL do gráfico (via ResizeObserver) e
// aplicar esse número, em pixels, como altura fixa do card de pendências —
// aí sim o overflow-y-auto passa a ter algo pra rolar. O resto vem depois,
// numa grade própria que quebra linha.
// Largura em pixels fixos foi testada só num monitor ultrawide — numa tela
// 1080p comum a mesma caixa de 480px sobra muito mais (proporcionalmente),
// espremendo o gráfico principal e encolhendo tudo dentro do SVG dele
// (inclusive o popup do hover, que é dimensionado em unidades do viewBox).
// `clamp()` resolve isso: acompanha a largura da janela entre um piso e um
// teto, em vez de um número fixo que só fica "certo" numa resolução.
const HERO_ROW_MIN_WIDTH = 560;
// `%` (não `vw`) porque precisa ser relativo à LINHA (já descontada a
// sidebar), não à janela inteira — 480px fixo já era ~29% da área de
// conteúdo num 1080p (por isso "exagerado"), mas só ~15% numa ultrawide
// (por isso tinha ficado bom lá). 24% fica proporcional nos dois.
const PENDING_COLUMN_WIDTH = "clamp(300px, 24%, 480px)";
const HERO_HEIGHT_FALLBACK = 460;
const GRID_CARD_MIN = 300;

export function Dashboard({
  data,
  period,
  onPeriodChange,
}: {
  data: NexusData;
  period: Period;
  onPeriodChange: (p: Period) => void;
}) {
  const [showNew, setShowNew] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [colorMode, setColorMode] = useState<ChartColorMode>("mono");
  const [includeForecast, setIncludeForecast] = useState(false);
  const [showNewPending, setShowNewPending] = useState(false);
  const greeting = useMemo(() => getGreeting("Diogo"), []);
  const { transactions, categories, accounts, categoriesById, payeesById, recurringTransactions, pendingItems, recurringExclusions, loading, refresh } = data;

  // Altura real (em px) do card do gráfico principal, medida ao vivo — é o
  // que o card de "Recorrências pendentes" ao lado usa como sua própria
  // altura fixa, pra rolar por dentro em vez de esticar a linha inteira.
  const heroChartRef = useRef<HTMLDivElement>(null);
  const [heroHeight, setHeroHeight] = useState(HERO_HEIGHT_FALLBACK);

  useEffect(() => {
    const el = heroChartRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height;
      if (height) setHeroHeight(height);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    setColorMode(loadChartColorMode());
  }, []);

  function handleColorModeChange(mode: ChartColorMode) {
    setColorMode(mode);
    saveChartColorMode(mode);
  }

  const palette = CHART_PALETTES[colorMode];
  const range = periodRange(period);
  const noun = periodNoun(period);
  const today = todayISO();
  const kpis = computeKpis(transactions, range);
  const allBars = incomeExpenseForPeriodWithForecast(transactions, recurringTransactions, period, recurringExclusions);
  // Desligado, mostra só o confirmado — zera a parte prevista em vez de
  // remover baldes (a divisão agora é por lançamento, não por balde inteiro).
  const bars = includeForecast ? allBars : allBars.map((p) => ({ ...p, incomeForecastCents: 0, expenseForecastCents: 0 }));
  const donut = expenseByCategory(transactions, categoriesById, range);
  const byMethod = expenseByPaymentMethod(transactions, range);
  const pendingRecurringAll = pendingRecurrencesForPeriod(recurringTransactions, transactions, range, recurringExclusions);
  // Recorrências futuras (depois de hoje) só entram na lista de pendências
  // quando "considerar previsões" está ligado — do contrário só mostra o
  // que já venceu e ainda não foi lançado.
  const pendingRecurring = includeForecast ? pendingRecurringAll : pendingRecurringAll.filter((p) => p.date <= today);
  const topExp = topExpenses(transactions, range, 5);
  const topInc = topIncomes(transactions, range, 5);
  const recent = transactions.filter((t) => t.occurredAt >= range.from && t.occurredAt <= range.to);
  const periodAdjective = noun === "do mês" ? "mês atual" : noun === "do ano" ? "ano selecionado" : "período selecionado";
  // Visão mensal: rótulo em todo dia. Ano/intervalo: amostra automática (o
  // componente decide, tem gente demais pra numerar um por um).
  const labelEvery = period.kind === "month" ? 1 : undefined;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.1em] text-[var(--text-faint)]">Painel Financeiro</div>
          <h2 className="page-title flex items-center gap-2.5">
            {greeting.headline}
            {greeting.icon === "sun" ? (
              <IconSun width={20} height={20} className="text-[var(--text-faint)]" />
            ) : (
              <IconMoon width={18} height={18} className="text-[var(--text-faint)]" />
            )}
          </h2>
          <p className="mt-1 text-[0.82rem] text-[var(--text-faint)]">{greeting.subtext}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2.5 pt-1">
          <PeriodPicker value={period} onChange={onPeriodChange} />
          <button
            onClick={() => setShowNew(true)}
            className="solid flex items-center gap-2 rounded-[11px] px-4 py-2.5 text-[0.8rem] font-bold shadow-[var(--shadow-card)] transition-transform active:scale-[0.98]"
          >
            <IconPlus width={14} height={14} strokeWidth={2.4} />
            Novo lançamento
          </button>
        </div>
      </div>

      {!loading && transactions.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 rounded-2xl px-6 py-16 text-center">
          <IconWallet width={34} height={34} className="text-[var(--text-faint)]" />
          <p className="text-[0.9rem] font-semibold">Nenhum lançamento ainda</p>
          <p className="max-w-sm text-[0.8rem] text-[var(--text-faint)]">Registre sua primeira transação pra começar a acompanhar o painel.</p>
          <div className="mt-1">
            <button onClick={() => setShowNew(true)} className="solid rounded-[11px] px-4 py-2.5 text-[0.8rem] font-bold">
              Novo lançamento
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-5 grid grid-cols-4 gap-3.5">
            <KpiCard label="Saldo total" value={formatCentsToBRL(kpis.balanceTotalCents)} icon={<IconWallet width={13} height={13} />} />
            <KpiCard
              label={`Receitas ${noun}`}
              value={formatCentsToBRL(kpis.incomeCents)}
              icon={<IconArrowUp width={13} height={13} strokeWidth={2.4} />}
              tone="income"
            />
            <KpiCard
              label={`Despesas ${noun}`}
              value={formatCentsToBRL(kpis.expenseCents)}
              icon={<IconArrowDown width={13} height={13} strokeWidth={2.4} />}
              tone="expense"
            />
            <KpiCard
              label="Taxa de economia"
              value={kpis.savingsRatePct === null ? "—" : `${kpis.savingsRatePct.toFixed(1)}%`}
            />
          </div>

          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[0.98rem] font-bold">Gráficos — {periodAdjective}</h3>
            <div className="flex items-center gap-2">
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.06em] text-[var(--text-faint)]">Cor</span>
              <div className="card flex rounded-[10px] p-0.5">
                <ColorModeButton active={colorMode === "mono"} onClick={() => handleColorModeChange("mono")}>
                  Monocromático
                </ColorModeButton>
                <ColorModeButton active={colorMode === "color"} onClick={() => handleColorModeChange("color")}>
                  Colorido
                </ColorModeButton>
              </div>
            </div>
          </div>

          {/* Linha 1: só o gráfico principal (mais baixo, de propósito) e as
              recorrências pendentes, lado a lado. A altura do card da
              direita é travada, em pixels, na altura medida do card da
              esquerda (via ResizeObserver, acima) — por isso ele rola por
              dentro em vez de esticar a linha quando há muitos pendentes. A
              `key` do gráfico força remontar (replay da animação de
              revelação) quando os dados do período mudam. */}
          <div className="mb-3.5 flex items-start gap-3.5">
            <div ref={heroChartRef} className="min-w-0" style={{ flex: `1 1 ${HERO_ROW_MIN_WIDTH}px` }}>
              <ChartCard
                title="Receitas x despesas"
                legend={[
                  { label: "Receitas", color: palette.income },
                  { label: "Despesas", color: palette.expense },
                ]}
                actions={
                  <button
                    onClick={() => setIncludeForecast((v) => !v)}
                    title={includeForecast ? "Considerando o que ainda vai acontecer no período" : "Mostrar só o que já aconteceu"}
                    className={"rounded-full px-3 py-1 text-[0.68rem] font-bold transition-colors " + (includeForecast ? "solid" : "card text-[var(--text-faint)]")}
                  >
                    Previsões {includeForecast ? "ligadas" : "desligadas"}
                  </button>
                }
              >
                <ComposedAreaChart
                  key={period.kind + JSON.stringify(range) + includeForecast}
                  points={bars}
                  incomeColor={palette.income}
                  expenseColor={palette.expense}
                  labelEvery={labelEvery}
                />
              </ChartCard>
            </div>
            <div className="shrink-0 overflow-hidden" style={{ width: PENDING_COLUMN_WIDTH, height: heroHeight }}>
              <ChartCard
                title={`Pendências — ${periodAdjective}`}
                tall
                actions={
                  <button
                    onClick={() => setShowNewPending(true)}
                    title="Criar uma pendência sem data (lembrete)"
                    className="card flex h-6 w-6 items-center justify-center rounded-[7px] text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
                  >
                    <IconPlus width={12} height={12} strokeWidth={2.4} />
                  </button>
                }
              >
                <PendingList recurringItems={pendingRecurring} reminderItems={pendingItems} categoriesById={categoriesById} onSettled={refresh} />
              </ChartCard>
            </div>
          </div>

          {/* Linha 2 em diante: o resto, numa grade própria que quebra
              linha sozinha — não compartilha altura com a linha 1.
              `items-stretch` (o padrão do grid) faz os cards que caem na
              mesma linha da grade sempre igualarem a altura do mais alto
              (geralmente "Gastos por categoria", por causa da legenda) —
              antes usava `items-start` e cada card ficava com a altura do
              próprio conteúdo, o que parecia desalinhado quando um vizinho
              bem mais baixo (ex.: os de barra única) sobrava vazio do lado.
              `auto-fit` + `1fr` (em vez de um teto fixo) faz os cards
              esticarem em largura pra preencher a linha inteira também, não
              importa quantos couberem. */}
          <div
            className="mb-5 grid items-stretch gap-3.5"
            style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${GRID_CARD_MIN}px, 1fr))` }}
          >
            <ChartCard title={`Gastos por categoria — ${periodAdjective}`}>
              <DonutChart segments={donut} />
            </ChartCard>

            <ChartCard title="Despesas por forma de pagamento">
              <HorizontalBarChart items={byMethod} color={palette.expense} />
            </ChartCard>

            <ChartCard title={`Maiores despesas — ${periodAdjective}`}>
              <HorizontalBarChart items={topExp} color={palette.expense} />
            </ChartCard>

            <ChartCard title={`Maiores receitas — ${periodAdjective}`}>
              <HorizontalBarChart items={topInc} color={palette.income} />
            </ChartCard>
          </div>

          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[0.98rem] font-bold">Últimas transações — {periodAdjective}</h3>
          </div>
          <TransactionsPanel
            transactions={recent}
            categoriesById={categoriesById}
            payeesById={payeesById}
            variant="compact"
            onEdit={setEditingTx}
            onToggleReconciled={(tx) => setTransactionReconciled(tx.id, !tx.isReconciled).then(refresh)}
          />
        </>
      )}

      {showNewPending && <PendingItemModal categories={categories} onClose={() => setShowNewPending(false)} onSaved={refresh} />}
      {showNew && <TransactionModal categories={categories} accounts={accounts} onClose={() => setShowNew(false)} onSaved={refresh} />}
      {editingTx && (
        <TransactionModal
          categories={categories}
          accounts={accounts}
          transaction={editingTx}
          payeeName={payeesById.get(editingTx.payeeId ?? "")?.name}
          onClose={() => setEditingTx(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

function ChartCard({
  title,
  legend,
  actions,
  tall,
  children,
}: {
  title: string;
  legend?: Array<{ label: string; color: string }>;
  /** Controle extra no cabeçalho do card (ex.: o toggle de previsões). */
  actions?: React.ReactNode;
  /** Ocupa as duas linhas da grade (uma coluna inteira), em vez de uma célula. */
  tall?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={"card flex min-w-0 flex-col rounded-2xl p-5 pb-4" + (tall ? " h-full overflow-hidden" : "")}>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h4 className="truncate text-[0.82rem] font-bold">{title}</h4>
        <div className="flex shrink-0 items-center gap-3">
          {legend && (
            <div className="flex shrink-0 gap-3">
              {legend.map((item) => (
                <div key={item.label} className="flex items-center gap-1.5 text-[0.66rem] font-semibold text-[var(--text-muted)]">
                  <span className="h-2 w-2 rounded-sm" style={{ background: item.color }} />
                  {item.label}
                </div>
              ))}
            </div>
          )}
          {actions}
        </div>
      </div>
      {tall ? <div className="min-h-0 flex-1 overflow-y-auto">{children}</div> : children}
    </div>
  );
}

function ColorModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={"rounded-lg px-2.5 py-1.5 text-[0.7rem] font-bold transition-colors " + (active ? "bg-[var(--panel-elevated)] text-[var(--text)]" : "text-[var(--text-muted)] hover:text-[var(--text)]")}
    >
      {children}
    </button>
  );
}
