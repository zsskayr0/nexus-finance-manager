import { useEffect, useRef, useState } from "react";
import { niceMax } from "./scale";
import { EmptyChart } from "./LineChart";

export interface BarChartGroup {
  label: string;
  incomeCents: number;
  expenseCents: number;
}

export const NEON_INCOME = "#ff9eb0"; // rosa-vermelho pastel
export const NEON_EXPENSE = "#ff3b3b"; // vermelho neon intenso

const H = 100;
const PAD = { top: 6, right: 4, bottom: 16, left: 4 };

/**
 * Barras divergentes (receita sobe, despesa desce) num visual neon: cada
 * barra desenhada duas vezes (uma cópia borrada por baixo fazendo o "halo",
 * uma nítida por cima). O `viewBox` usa a largura REAL medida do container
 * (via ResizeObserver), não um número fixo — é de propósito: com largura
 * fixa e `width="100%"` esticando pra caber no card, o fator de escala X
 * ficava bem maior que o Y (card bem mais largo que alto), e QUALQUER coisa
 * desenhada em unidade de viewBox — barra, cantos arredondados, blur —
 * saía distorcida (virava pílula deitada em vez de barra em pé). Com
 * viewBox = pixel real, a escala é sempre 1:1 nos dois eixos, então nada
 * estica fora de proporção.
 */
export function NeonBarChart({ groups, labelEvery }: { groups: BarChartGroup[]; labelEvery?: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(400);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (groups.length === 0) return <EmptyChart />;

  const W = Math.max(120, width);
  const maxValue = Math.max(...groups.flatMap((g) => [g.incomeCents, g.expenseCents]), 100) / 100;
  const maxY = niceMax(maxValue);
  const plotTop = PAD.top;
  const plotBottom = H - PAD.bottom;
  const zeroY = plotTop + (plotBottom - plotTop) / 2;
  const halfHeight = (plotBottom - plotTop) / 2;

  const plotWidth = W - PAD.left - PAD.right;
  const groupWidth = plotWidth / groups.length;
  const gap = groups.length > 20 ? 1 : groups.length > 10 ? 2 : 4;
  const barW = Math.max(1.5, Math.min(14, groupWidth - gap));
  const barRadius = Math.min(3, barW / 2);
  const labelStride = labelEvery ?? Math.max(1, Math.ceil(groups.length / 9));

  return (
    <div ref={containerRef} style={{ width: "100%", height: "100%" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ overflow: "visible" }}>
        <defs>
          <linearGradient id="neon-income-fill" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={NEON_INCOME} stopOpacity={0.4} />
            <stop offset="100%" stopColor={NEON_INCOME} stopOpacity={1} />
          </linearGradient>
          <linearGradient id="neon-expense-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={NEON_EXPENSE} stopOpacity={0.4} />
            <stop offset="100%" stopColor={NEON_EXPENSE} stopOpacity={1} />
          </linearGradient>
        </defs>

        <line x1={PAD.left} y1={zeroY} x2={W - PAD.right} y2={zeroY} stroke="var(--border)" strokeWidth={1} opacity={0.4} />

        {groups.map((g, i) => {
          const x = PAD.left + i * groupWidth + (groupWidth - barW) / 2;
          const incomeH = (g.incomeCents / 100 / maxY) * halfHeight;
          const expenseH = (g.expenseCents / 100 / maxY) * halfHeight;
          const showLabel = i === groups.length - 1 || i % labelStride === 0;
          return (
            <g key={i}>
              {incomeH > 0.4 && (
                <>
                  <rect x={x} y={zeroY - incomeH} width={barW} height={incomeH} rx={barRadius} fill={NEON_INCOME} opacity={0.6} style={{ filter: "blur(3px)" }} />
                  <rect x={x} y={zeroY - incomeH} width={barW} height={incomeH} rx={barRadius} fill="url(#neon-income-fill)" />
                </>
              )}
              {expenseH > 0.4 && (
                <>
                  <rect x={x} y={zeroY} width={barW} height={expenseH} rx={barRadius} fill={NEON_EXPENSE} opacity={0.6} style={{ filter: "blur(3px)" }} />
                  <rect x={x} y={zeroY} width={barW} height={expenseH} rx={barRadius} fill="url(#neon-expense-fill)" />
                </>
              )}
              {showLabel && (
                <text x={x + barW / 2} y={H - 5} textAnchor="middle" fontSize={9} fontWeight={700} fontFamily="Poppins" fill="var(--text-faint)">
                  {g.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
