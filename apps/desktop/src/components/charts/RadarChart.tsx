import { EmptyChart } from "./LineChart";

export interface RadarSeries {
  label: string;
  color: string;
  /** Um valor por eixo — mesma ordem de `axes`, em escala bruta (a normalização é interna, por eixo). */
  values: number[];
}

const SIZE = 240;
const CENTER = SIZE / 2;
const RADIUS = SIZE / 2 - 34; // espaço pros rótulos dos eixos por fora do polígono
const RINGS = 4;

/**
 * Radar/spider chart pra comparar poucas séries (2-4 categorias) em vários
 * eixos normalizados. Tamanho FIXO em pixel real — de propósito: um radar só
 * fica "redondo" se X e Y tiverem exatamente a mesma escala; qualquer
 * viewBox esticado por porcentagem (a mesma classe de bug já vista em
 * NeonBarChart/CategoryHeatmap) vira uma elipse torta em vez de um polígono
 * fiel. Fixo em pixel, esse problema nem existe.
 */
export function RadarChart({ axes, series }: { axes: string[]; series: RadarSeries[] }) {
  if (axes.length < 3 || series.length === 0) return <EmptyChart />;

  const maxByAxis = axes.map((_, i) => Math.max(1, ...series.map((s) => s.values[i] ?? 0)));

  function axisAngle(i: number): number {
    return (Math.PI * 2 * i) / axes.length - Math.PI / 2;
  }

  function pointFor(axisIndex: number, value: number): [number, number] {
    const angle = axisAngle(axisIndex);
    const ratio = Math.max(0, Math.min(1, value / maxByAxis[axisIndex]!));
    const r = RADIUS * ratio;
    return [CENTER + r * Math.cos(angle), CENTER + r * Math.sin(angle)];
  }

  function ringPoints(ratio: number): string {
    return axes.map((_, i) => `${CENTER + RADIUS * ratio * Math.cos(axisAngle(i))},${CENTER + RADIUS * ratio * Math.sin(axisAngle(i))}`).join(" ");
  }

  return (
    <svg width={SIZE} height={SIZE} style={{ overflow: "visible" }}>
      {Array.from({ length: RINGS }, (_, i) => (
        <polygon key={i} points={ringPoints((i + 1) / RINGS)} fill="none" stroke="var(--border)" strokeWidth={1} opacity={0.5} />
      ))}
      {axes.map((_, i) => (
        <line
          key={i}
          x1={CENTER}
          y1={CENTER}
          x2={CENTER + RADIUS * Math.cos(axisAngle(i))}
          y2={CENTER + RADIUS * Math.sin(axisAngle(i))}
          stroke="var(--border)"
          strokeWidth={1}
          opacity={0.5}
        />
      ))}

      {series.map((s, si) => (
        <polygon
          key={si}
          points={s.values.map((v, i) => pointFor(i, v).join(",")).join(" ")}
          fill={s.color}
          fillOpacity={0.14}
          stroke={s.color}
          strokeWidth={1.6}
        />
      ))}
      {series.map((s, si) =>
        s.values.map((v, i) => {
          const [x, y] = pointFor(i, v);
          return <circle key={`${si}-${i}`} cx={x} cy={y} r={2.4} fill={s.color} />;
        }),
      )}

      {axes.map((label, i) => {
        const angle = axisAngle(i);
        const cos = Math.cos(angle);
        const anchor = cos > 0.3 ? "start" : cos < -0.3 ? "end" : "middle";
        return (
          <text
            key={i}
            x={CENTER + (RADIUS + 20) * cos}
            y={CENTER + (RADIUS + 20) * Math.sin(angle)}
            textAnchor={anchor}
            dominantBaseline="middle"
            fontSize={9.5}
            fontWeight={700}
            fontFamily="Poppins"
            fill="var(--text-faint)"
          >
            {label}
          </text>
        );
      })}
    </svg>
  );
}
