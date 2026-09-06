import { formatCentsToBRL } from "@nexus/core";
import type { ChartPalette } from "../../lib/chartColors";
import { compactBRL, niceMax, scaleLinear } from "./scale";

export interface LineChartPoint {
  label: string;
  valueCents: number;
}

// Este gráfico mora sozinho numa linha bem mais larga que os outros cards
// — W/H grandes evitam que o navegador precise "esticar" o desenho (e o
// texto junto) pra caber, o que virava zoom gigante. Mas PAD é só o
// espaço reservado pro texto dos eixos, que continua do MESMO tamanho de
// sempre (fontSize não escalou) — por isso PAD fica pequeno igual antes,
// não escala junto com W/H. Escalar os dois juntos foi o erro da vez
// passada: sobrou uma faixa vazia enorme nas bordas.
const W = 1400;
const H = 466; // mesma proporção ~3:1 (30% mais baixo que os outros), só que na escala nova
const PAD = { top: 20, right: 20, bottom: 30, left: 58 };

/** Gráfico de linha (evolução do saldo). Sem biblioteca — SVG desenhado a partir da escala real dos dados. */
export function LineChart({ points, color }: { points: LineChartPoint[]; color: ChartPalette["income"] }) {
  if (points.length === 0) return <EmptyChart />;

  const values = points.map((p) => p.valueCents / 100);
  const maxY = niceMax(Math.max(...values, 1));
  const x = scaleLinear([0, points.length - 1], [PAD.left, W - PAD.right]);
  const y = scaleLinear([0, maxY], [H - PAD.bottom, PAD.top]);

  const coords = points.map((p, i) => ({ cx: x(i), cy: y(p.valueCents / 100), p }));
  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.cx},${c.cy}`).join(" ");
  const areaPath = `${linePath} L${coords[coords.length - 1]!.cx},${H - PAD.bottom} L${coords[0]!.cx},${H - PAD.bottom} Z`;

  const gridSteps = [0, 0.25, 0.5, 0.75, 1];
  const last = coords[coords.length - 1]!;

  // Muitos pontos (ex.: um mês inteiro em dias) — mostra só uma amostra de
  // marcadores e rótulos no eixo X pra não virar uma parede de texto.
  const labelStride = Math.max(1, Math.ceil(coords.length / 7));
  const gradientId = `lineFill-${color.replace(/[^a-z0-9]/gi, "")}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ overflow: "visible" }}>
      <g>
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
      </g>

      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
      <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

      {coords.map((c, i) => {
        const isLast = i === coords.length - 1;
        if (!isLast && i % labelStride !== 0) return null;
        return (
          <circle key={i} cx={c.cx} cy={c.cy} r={isLast ? 3.5 : 2.5} fill={color}>
            <title>
              {c.p.label} · {formatCentsToBRL(c.p.valueCents)}
            </title>
          </circle>
        );
      })}

      <text x={last.cx} y={last.cy - 9} textAnchor="end" fontSize={10.5} fontWeight={700} fill="var(--text)">
        {formatCentsToBRL(last.p.valueCents)}
      </text>

      {coords.map((c, i) => {
        if (i !== coords.length - 1 && i % labelStride !== 0) return null;
        return (
          <text key={i} x={c.cx} y={H - 10} textAnchor="middle" fontSize={8.5} fontWeight={600} fontFamily="Poppins" fill="var(--text-faint)">
            {c.p.label}
          </text>
        );
      })}
    </svg>
  );
}

export function EmptyChart() {
  return (
    <div className="flex h-[160px] items-center justify-center text-[0.78rem] text-[var(--text-faint)]">
      Sem dados suficientes ainda.
    </div>
  );
}
