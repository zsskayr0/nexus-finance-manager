import { useEffect, useRef } from "react";
import { formatCentsToBRL } from "@nexus/core";
import { EmptyChart } from "./LineChart";

export interface HeatmapRow {
  label: string;
  /** Um valor (centavos) por posição de `bucketLabels` — mesma ordem. */
  values: number[];
}

const CELL = 16;
const GAP = 4;
const LABEL_W = 96;

function Cell({ value, max, title }: { value: number; max: number; title: string }) {
  const intensity = value / max;
  const hasValue = value > 0;
  return (
    <div
      title={title}
      style={{
        width: CELL,
        height: CELL,
        borderRadius: 4,
        background: hasValue ? `rgba(255,90,100,${0.22 + intensity * 0.7})` : "rgba(255,255,255,0.045)",
        border: hasValue ? "none" : "1px solid var(--border)",
        // O halo fica curto de propósito (não passa da metade do GAP) — um
        // blur mais largo que o espaço entre células faz elas se fundirem
        // numa mancha só.
        boxShadow: hasValue && intensity > 0.2 ? `0 0 ${2 + intensity * 3}px rgba(255,70,90,${0.35 + intensity * 0.4})` : "none",
      }}
    />
  );
}

/**
 * Dia (ou mês) do período em tons de vermelho pastel — quanto mais intenso,
 * mais brilho neon a célula ganha. Dois jeitos de organizar:
 *  - `columns` definido: quebra em grade (várias linhas de largura fixa) —
 *    usado no mês, pra caber os ~30 dias sem estourar a largura do card.
 *  - sem `columns`: uma faixa só, com scroll horizontal — usado em período
 *    maior (ano), onde o card já é mais largo; `draggable` liga o
 *    "arrastar pra rolar" (clique e arraste, sem precisar da barrinha).
 */
export function CategoryHeatmap({
  bucketLabels,
  rows,
  showRowLabels = true,
  columns,
  draggable = false,
}: {
  bucketLabels: string[];
  rows: HeatmapRow[];
  showRowLabels?: boolean;
  /** Quando definido, quebra as células em linhas desse tamanho em vez de uma faixa só. */
  columns?: number;
  /** "Arrastar pra rolar" com o mouse, além da rolagem normal — só faz sentido sem `columns`. */
  draggable?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!draggable) return;
    const el = scrollRef.current;
    if (!el) return;
    let dragging = false;
    let startX = 0;
    let startScroll = 0;
    function onDown(e: MouseEvent) {
      dragging = true;
      startX = e.pageX;
      startScroll = el!.scrollLeft;
      el!.style.cursor = "grabbing";
    }
    function onMove(e: MouseEvent) {
      if (!dragging) return;
      e.preventDefault();
      el!.scrollLeft = startScroll - (e.pageX - startX);
    }
    function onUp() {
      dragging = false;
      el!.style.cursor = "grab";
    }
    el.style.cursor = "grab";
    el.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      el.removeEventListener("mousedown", onDown);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [draggable]);

  if (rows.length === 0 || bucketLabels.length === 0) return <EmptyChart />;

  const max = Math.max(1, ...rows.flatMap((r) => r.values));
  const rowLabel = rows[0]!.label;

  if (columns) {
    const values = rows[0]!.values;
    return (
      <div className="flex flex-wrap" style={{ gap: GAP, width: columns * CELL + (columns - 1) * GAP }}>
        {values.map((v, i) => (
          <Cell key={i} value={v} max={max} title={`${bucketLabels[i]} · ${rowLabel}: ${formatCentsToBRL(v)}`} />
        ))}
      </div>
    );
  }

  const everyN = Math.max(1, Math.ceil(bucketLabels.length / 12));

  return (
    <div ref={scrollRef} className="overflow-x-auto" style={{ scrollBehavior: "smooth" }}>
      <div className="inline-flex flex-col gap-[3px]">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center gap-2">
            {showRowLabels && (
              <span className="shrink-0 truncate text-right text-[0.64rem] font-semibold text-[var(--text-muted)]" style={{ width: LABEL_W }}>
                {row.label}
              </span>
            )}
            <div className="flex" style={{ gap: GAP }}>
              {row.values.map((v, i) => (
                <Cell key={i} value={v} max={max} title={`${bucketLabels[i]} · ${row.label}: ${formatCentsToBRL(v)}`} />
              ))}
            </div>
          </div>
        ))}

        <div className="flex items-center gap-2">
          {showRowLabels && <span className="shrink-0" style={{ width: LABEL_W }} />}
          <div className="flex" style={{ gap: GAP }}>
            {bucketLabels.map((l, i) => (
              <span key={i} className="mono shrink-0 text-center text-[0.56rem] text-[var(--text-faint)]" style={{ width: CELL }}>
                {i === bucketLabels.length - 1 || i % everyN === 0 ? l : ""}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
