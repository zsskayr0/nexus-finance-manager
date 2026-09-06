import { useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { save } from "@tauri-apps/plugin-dialog";
import { formatCentsToBRL, type Category } from "@nexus/core";
import type { NexusData } from "../lib/hooks";
import { periodRange, periodNoun, type Period } from "../lib/period";
import { categoryAnalysis, expenseByCategory, type CategoryStat } from "../lib/aggregate";
import { CategoryModal } from "../components/CategoryModal";
import { PeriodPicker } from "../components/PeriodPicker";
import { DonutChart } from "../components/charts/DonutChart";
import { RadarChart } from "../components/charts/RadarChart";
import { readableTextColor } from "../components/BankBadge";
import { CategoryIcon, IconArrowDown, IconArrowUp, IconDownload, IconGrid, IconPlus, IconTag } from "../components/icons";

const TYPE_LABEL: Record<Category["type"], string> = { income: "Receita", expense: "Despesa", both: "Ambas" };
const RADAR_AXES = ["Total gasto", "Nº lançamentos", "Ticket médio", "Recorrências ativas"];
// Mesma lógica de largura responsiva da coluna de "Pendências" no Painel —
// acompanha a largura da linha entre um piso e um teto, em vez de um número
// fixo que só fica proporcional numa resolução específica.
const DESTAQUE_CARD_WIDTH = 300;
const RADAR_CARD_WIDTH = 600;
// Coluna da gestão de categorias, na extrema esquerda — mais larga que a do
// destaque/radar porque cada linha carrega nome + selo "Padrão".
const CATEGORIES_LIST_WIDTH = "clamp(300px, 28%, 400px)";

function pct(n: number): string {
  return `${n.toFixed(0)}%`;
}

function csvField(v: string | number): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function buildInsight(stats: CategoryStat[]): string | null {
  if (stats.length === 0) return null;
  const top = stats[0]!;
  const share = pct(top.shareOfTotalPct);
  if (top.changePct !== null && Math.abs(top.changePct) >= 1) {
    const dir = top.changePct > 0 ? "a mais" : "a menos";
    return `${top.name} consumiu ${share} do total gasto no período — ${pct(Math.abs(top.changePct))} ${dir} que no período anterior.`;
  }
  return `${top.name} foi a categoria com maior gasto no período, consumindo ${share} do total.`;
}

/**
 * Gestão de categorias — uma página só (o par "Lista/Análise" é uma
 * distinção que só volta a fazer sentido no mobile, com telas menores; aqui
 * no desktop tudo cabe junto, análise em cima e gestão embaixo): um "quadro
 * comparativo" no estilo decision-matrix no topo — quem é a categoria
 * destaque do período, como as top 3 se comparam, um donut com a fatia de
 * TODAS as categorias e um ranking completo — e o CRUD de categorias logo
 * abaixo.
 */
export function CategoriesPage({ data, period, onPeriodChange }: { data: NexusData; period: Period; onPeriodChange: (p: Period) => void }) {
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);

  const { categories, transactions, recurringTransactions, categoriesById, refresh } = data;
  const range = periodRange(period);

  const stats = useMemo(
    () => categoryAnalysis(transactions, recurringTransactions, categoriesById, range),
    [transactions, recurringTransactions, categoriesById, range.from, range.to],
  );
  const donutSegments = useMemo(() => expenseByCategory(transactions, categoriesById, range), [transactions, categoriesById, range.from, range.to]);
  const top3 = stats.slice(0, 3);
  const totalConsidered = stats.reduce((sum, s) => sum + s.count, 0);
  const insight = buildInsight(stats);
  const rankingMax = Math.max(1, ...stats.map((s) => s.totalCents));

  async function handleExportCsv() {
    const header = ["Categoria", "Total (R$)", "Lançamentos", "Ticket médio (R$)", "Variação vs período anterior (%)", "Recorrências ativas"].join(",");
    const rows = stats.map((s) =>
      [
        csvField(s.name),
        (s.totalCents / 100).toFixed(2),
        s.count,
        (s.avgTicketCents / 100).toFixed(2),
        s.changePct === null ? "" : s.changePct.toFixed(1),
        s.activeRecurringCount,
      ]
        .map(csvField)
        .join(","),
    );
    const csv = [header, ...rows].join("\n");
    const path = await save({ defaultPath: `categorias_${range.from}_a_${range.to}.csv`, filters: [{ name: "CSV", extensions: ["csv"] }] });
    if (!path) return;
    await invoke("write_text_file", { path, contents: csv });
  }

  return (
    <div>
      <div className="mb-3.5 flex items-center justify-between gap-4">
        <h2 className="page-title">Categorias</h2>
        <div className="flex items-center gap-2.5">
          <PeriodPicker value={period} onChange={onPeriodChange} />
          <button
            onClick={() => setShowNew(true)}
            className="solid flex items-center gap-2 rounded-[11px] px-4 py-2.5 text-[0.8rem] font-bold shadow-[var(--shadow-card)] transition-transform active:scale-[0.98]"
          >
            <IconPlus width={14} height={14} strokeWidth={2.4} />
            Nova categoria
          </button>
        </div>
      </div>

      {/* "Todas as categorias" fica na extrema esquerda, largura fixa — o
          resto dos widgets (análise) disputa o espaço que sobra à direita,
          em vez de tudo empilhado em largura total. */}
      <div className="flex items-start gap-3.5">
        <div className="shrink-0" style={{ width: CATEGORIES_LIST_WIDTH }}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-[0.9rem] font-bold">Todas as categorias</h3>
            <span className="text-[0.72rem] text-[var(--text-faint)]">{categories.length} cadastradas</span>
          </div>

          {categories.length === 0 ? (
            <div className="card flex flex-col items-center gap-3 rounded-2xl px-6 py-16 text-center">
              <IconTag width={30} height={30} className="text-[var(--text-faint)]" />
              <p className="text-[0.9rem] font-semibold">Nenhuma categoria cadastrada</p>
              <div className="mt-1">
                <button onClick={() => setShowNew(true)} className="solid rounded-[11px] px-4 py-2.5 text-[0.8rem] font-bold">
                  Nova categoria
                </button>
              </div>
            </div>
          ) : (
            <div className="card overflow-hidden rounded-2xl">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setEditing(c)}
                  className="flex w-full items-center gap-3 border-b border-[var(--border)] px-[18px] py-3.5 text-left transition-colors last:border-b-0 hover:bg-[rgba(255,255,255,0.03)]"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]" style={{ background: c.color, color: readableTextColor(c.color) }}>
                    <CategoryIcon icon={c.icon} width={16} height={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[0.85rem] font-bold">{c.name}</span>
                      {c.isDefault && (
                        <span className="shrink-0 rounded-full border border-[var(--border-strong)] px-2 py-0.5 text-[0.62rem] font-bold text-[var(--text-faint)]">Padrão</span>
                      )}
                    </div>
                    <div className="truncate text-[0.72rem] text-[var(--text-faint)]">{TYPE_LABEL[c.type]}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {stats.length === 0 ? (
            <div className="card flex flex-col items-center gap-3 rounded-2xl px-6 py-14 text-center">
              <IconGrid width={28} height={28} className="text-[var(--text-faint)]" />
              <p className="text-[0.9rem] font-semibold">Nada pra analisar {periodNoun(period)}</p>
              <p className="max-w-sm text-[0.8rem] text-[var(--text-faint)]">Lance algumas despesas com categoria neste período pra ver o comparativo.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-3.5">
          {/* Linha principal: conteúdo denso à esquerda, e — mesmo
              tratamento da coluna de "Pendências" no Painel — um card à
              parte na direita, numa coluna própria, com o destaque do
              período e o comparativo visual (radar). `items-stretch`
              (padrão do flex) faz a coluna da direita acompanhar a altura
              da esquerda, então o radar cresce pra preencher em vez de
              sobrar vazio embaixo. */}
          <div className="flex items-stretch gap-3.5">
            <div className="flex min-w-0 flex-1 flex-col gap-3.5">
              {/* Key specs: top 3 por participação */}
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${top3.length}, minmax(0, 1fr))` }}>
                {top3.map((s, i) => (
                  <div key={s.categoryId} className="card rounded-2xl p-4">
                    <div className="mb-2.5 flex items-center justify-between gap-2">
                      <span className="truncate text-[0.78rem] font-bold">{s.name}</span>
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--panel-elevated)] text-[0.62rem] font-bold text-[var(--text-muted)]">
                        #{i + 1}
                      </span>
                    </div>
                    <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--panel-elevated)]">
                      <div className="h-full rounded-full" style={{ width: `${Math.max(4, s.shareOfTotalPct)}%`, background: s.color }} />
                    </div>
                    <div className="flex items-baseline justify-between">
                      <span className="mono text-[1.1rem] font-bold">{s.shareOfTotalPct.toFixed(0)}%</span>
                      <span className="text-[0.66rem] text-[var(--text-faint)]">do total</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Raw specs: estatísticas cruas por categoria */}
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${top3.length}, minmax(0, 1fr))` }}>
                {top3.map((s) => (
                  <div key={s.categoryId} className="card flex flex-col gap-2 rounded-2xl p-4">
                    <RawSpecRow label="Total gasto" value={formatCentsToBRL(s.totalCents)} />
                    <RawSpecRow label="Lançamentos" value={String(s.count)} />
                    <RawSpecRow label="Ticket médio" value={formatCentsToBRL(s.avgTicketCents)} />
                    <RawSpecRow label="Recorrências ativas" value={String(s.activeRecurringCount)} />
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3.5">
                {/* Donut: fatia de TODAS as categorias */}
                <div className="card min-w-[280px] flex-1 rounded-2xl p-5">
                  <h4 className="mb-3 text-[0.82rem] font-bold">Participação de todas as categorias</h4>
                  <DonutChart segments={donutSegments} />
                </div>

                {/* Ranking completo */}
                <div className="card min-w-[280px] flex-1 rounded-2xl p-5">
                  <h4 className="mb-3 text-[0.82rem] font-bold">Ranking completo</h4>
                  <div className="flex max-h-[200px] flex-col gap-2.5 overflow-y-auto pr-1">
                    {stats.map((s) => (
                      <div key={s.categoryId} className="flex items-center gap-2.5">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-[7px]" style={{ background: s.color, color: readableTextColor(s.color) }}>
                          <CategoryIcon icon={s.icon} width={12} height={12} />
                        </div>
                        <span className="w-24 shrink-0 truncate text-[0.72rem] font-semibold">{s.name}</span>
                        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--panel-elevated)]">
                          <div className="h-full rounded-full" style={{ width: `${Math.max(3, (s.totalCents / rankingMax) * 100)}%`, background: s.color }} />
                        </div>
                        <span className="mono w-20 shrink-0 text-right text-[0.72rem] font-bold">{formatCentsToBRL(s.totalCents)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Category breakdown */}
              <div className="card rounded-2xl p-5">
                <h4 className="mb-3 text-[0.82rem] font-bold">Comparativo por métrica</h4>
                <div className="flex flex-col gap-3">
                  <BreakdownBarRow label="Total gasto" stats={top3} value={(s) => s.totalCents} format={(v) => formatCentsToBRL(v)} />
                  <BreakdownBarRow label="Nº lançamentos" stats={top3} value={(s) => s.count} format={(v) => String(v)} />
                  <BreakdownBarRow label="Ticket médio" stats={top3} value={(s) => s.avgTicketCents} format={(v) => formatCentsToBRL(v)} />
                  <BreakdownBarRow label="Recorrências ativas" stats={top3} value={(s) => s.activeRecurringCount} format={(v) => String(v)} />
                  <div className="grid gap-2" style={{ gridTemplateColumns: `100px repeat(${top3.length}, minmax(0, 1fr))` }}>
                    <span className="text-[0.7rem] font-semibold text-[var(--text-muted)]">Variação</span>
                    {top3.map((s) => (
                      <ChangeBadge key={s.categoryId} changePct={s.changePct} />
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Coluna da direita: destaque do período (300px) + comparativo
                visual/radar (600px, mais largo — o radar precisa de mais
                espaço horizontal) — larguras diferentes, então cada card
                tem a própria em vez de uma largura só pra coluna inteira. */}
            <div className="flex shrink-0 flex-col gap-3.5">
              <div
                className="card rounded-2xl p-5"
                style={{ width: DESTAQUE_CARD_WIDTH, background: "radial-gradient(circle at 15% 10%, rgba(255,60,75,0.1), transparent 60%), var(--panel)" }}
              >
                <div className="mb-3 flex items-center justify-between gap-2">
                  <span className="text-[0.64rem] font-semibold uppercase tracking-[0.06em] text-[var(--text-faint)]">{periodNoun(period)}</span>
                  <span className="text-[0.64rem] text-[var(--text-faint)]">{formatCentsToBRL(stats.reduce((s, c) => s + c.totalCents, 0))}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]" style={{ background: top3[0]!.color, color: readableTextColor(top3[0]!.color) }}>
                    <CategoryIcon icon={top3[0]!.icon} width={18} height={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[0.6rem] font-semibold uppercase tracking-[0.06em] text-[var(--text-faint)]">Destaque</div>
                    <div className="truncate text-[0.95rem] font-bold">{top3[0]!.name}</div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end">
                    <span className="mono text-[1.15rem] font-bold">{top3[0]!.shareOfTotalPct.toFixed(0)}</span>
                    <span className="text-[0.58rem] font-semibold text-[var(--text-faint)]">/100</span>
                  </div>
                </div>
              </div>

              <div className="card flex flex-1 flex-col items-center justify-center rounded-2xl p-5" style={{ width: RADAR_CARD_WIDTH }}>
                <h4 className="mb-1 self-start text-[0.82rem] font-bold">Comparativo visual</h4>
                <RadarChart
                  axes={RADAR_AXES}
                  series={top3.map((s) => ({
                    label: s.name,
                    color: s.color,
                    values: [s.totalCents / 100, s.count, s.avgTicketCents / 100, s.activeRecurringCount],
                  }))}
                />
                <div className="mt-2 flex flex-wrap justify-center gap-3">
                  {top3.map((s) => (
                    <span key={s.categoryId} className="flex items-center gap-1.5 text-[0.66rem] font-semibold text-[var(--text-muted)]">
                      <span className="h-2 w-2 rounded-sm" style={{ background: s.color }} />
                      {s.name}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Insight callout */}
          {insight && (
            <div
              className="card flex items-center gap-3 rounded-2xl px-4 py-3.5"
              style={{ background: "radial-gradient(circle at 10% 50%, rgba(255,90,100,0.12), transparent 70%), var(--panel)" }}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(255,90,100,0.14)] text-[var(--danger)]">
                <IconArrowUp width={14} height={14} strokeWidth={2.4} />
              </div>
              <p className="text-[0.8rem] font-semibold">{insight}</p>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between gap-3 px-1">
            <span className="text-[0.72rem] text-[var(--text-faint)]">
              {stats.length} categoria{stats.length > 1 ? "s" : ""} com gasto · {totalConsidered} lançamento{totalConsidered > 1 ? "s" : ""} considerado{totalConsidered > 1 ? "s" : ""}
            </span>
            <button
              onClick={handleExportCsv}
              className="card flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-[0.76rem] font-bold text-[var(--text-muted)] transition-colors hover:text-[var(--text)]"
            >
              <IconDownload width={13} height={13} />
              Exportar CSV
            </button>
          </div>
        </div>
          )}
        </div>
      </div>

      {showNew && <CategoryModal onClose={() => setShowNew(false)} onSaved={refresh} />}
      {editing && <CategoryModal category={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
    </div>
  );
}

function RawSpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[0.7rem] text-[var(--text-faint)]">{label}</span>
      <span className="mono text-[0.78rem] font-bold">{value}</span>
    </div>
  );
}

function BreakdownBarRow({
  label,
  stats,
  value,
  format,
}: {
  label: string;
  stats: CategoryStat[];
  value: (s: CategoryStat) => number;
  format: (v: number) => string;
}) {
  const max = Math.max(1, ...stats.map(value));
  return (
    <div className="grid items-center gap-2" style={{ gridTemplateColumns: `100px repeat(${stats.length}, minmax(0, 1fr))` }}>
      <span className="text-[0.7rem] font-semibold text-[var(--text-muted)]">{label}</span>
      {stats.map((s) => {
        const v = value(s);
        return (
          <div key={s.categoryId} className="flex flex-col gap-1">
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--panel-elevated)]">
              <div className="h-full rounded-full" style={{ width: `${Math.max(4, (v / max) * 100)}%`, background: s.color }} />
            </div>
            <span className="mono text-[0.68rem] font-bold text-[var(--text-muted)]">{format(v)}</span>
          </div>
        );
      })}
    </div>
  );
}

function ChangeBadge({ changePct }: { changePct: number | null }) {
  if (changePct === null) {
    return <span className="text-center text-[0.68rem] text-[var(--text-faint)]">—</span>;
  }
  const isUp = changePct > 0;
  const Icon = isUp ? IconArrowUp : IconArrowDown;
  return (
    <span className={"mono flex items-center justify-center gap-1 text-[0.7rem] font-bold " + (isUp ? "text-[var(--danger)]" : "text-[var(--text)]")}>
      <Icon width={10} height={10} strokeWidth={2.6} />
      {Math.abs(changePct).toFixed(0)}%
    </span>
  );
}
