import { formatCentsToBRL } from "@nexus/core";
import { compactBRL, niceMax, scaleLinear } from "./scale";
import { EmptyChart } from "./LineChart";

export interface BarChartGroup {
  label: string;
  incomeCents: number;
  expenseCents: number;
}

const W = 400;
const H = 100;
const PAD = { top: 10, right: 8, bottom: 18, left: 38 };

/** Barras pareadas — receitas x despesas intercaladas por balde (dia/mês, conforme o período). */
export function BarChart({ groups, incomeColor, expenseColor }: { groups: BarChartGroup[]; incomeColor: string; expenseColor: string }) {
  if (groups.length === 0) return <EmptyChart />;

  const maxValue = Math.max(...groups.flatMap((g) => [g.incomeCents, g.expenseCents]), 100) / 100;
  const maxY = niceMax(maxValue);
  const y = scaleLinear([0, maxY], [H - PAD.bottom, PAD.top]);
  const baseline = H - PAD.bottom;

  const plotWidth = W - PAD.left - PAD.right;
  const groupWidth = plotWidth / groups.length;
  // Muitos baldes (ex.: os dias de um mês) — barras ficam bem finas, sem
  // gap perceptível, e o eixo X mostra só uma amostra de rótulos.
  const gap = groups.length > 15 ? 1 : groups.length > 8 ? 3 : 6;
  const barW = Math.max(1.5, Math.min(20, (groupWidth - gap - 4) / 2));
  const barRadius = Math.min(3, barW / 2);
  const labelStride = Math.max(1, Math.ceil(groups.length / 7));

  const gridSteps = [0, 0.25, 0.5, 0.75, 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" preserveAspectRatio="none" style={{ overflow: "visible" }}>
      {gridSteps.map((t) => {
        const value = maxY * t;
        const gy = y(value);
        return (
          <g key={t}>
            <line x1={PAD.left} y1={gy} x2={W - PAD.right} y2={gy} stroke="var(--border)" strokeWidth={1} opacity={t === 0 ? 1 : 0.6} />
            <text x={PAD.left - 6} y={gy + 3} textAnchor="end" fontSize={8.5} fontFamily="Poppins" fill="var(--text-faint)">
              {compactBRL(value)}
            </text>
          </g>
        );
      })}

      {groups.map((g, i) => {
        const groupStart = PAD.left + i * groupWidth;
        const pairWidth = barW * 2 + gap;
        const offset = (groupWidth - pairWidth) / 2;
        const incomeX = groupStart + offset;
        const expenseX = incomeX + barW + gap;
        const incomeH = baseline - y(g.incomeCents / 100);
        const expenseH = baseline - y(g.expenseCents / 100);
        const showLabel = i === groups.length - 1 || i % labelStride === 0;

        return (
          <g key={i}>
            <rect x={incomeX} y={baseline - incomeH} width={barW} height={Math.max(incomeH, 0)} rx={barRadius} fill={incomeColor}>
              <title>
                {g.label} · Receitas · {formatCentsToBRL(g.incomeCents)}
              </title>
            </rect>
            <rect x={expenseX} y={baseline - expenseH} width={barW} height={Math.max(expenseH, 0)} rx={barRadius} fill={expenseColor}>
              <title>
                {g.label} · Despesas · {formatCentsToBRL(g.expenseCents)}
              </title>
            </rect>
            {showLabel && (
              <text x={groupStart + groupWidth / 2} y={H - 10} textAnchor="middle" fontSize={8.5} fontWeight={600} fontFamily="Poppins" fill="var(--text-faint)">
                {g.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
