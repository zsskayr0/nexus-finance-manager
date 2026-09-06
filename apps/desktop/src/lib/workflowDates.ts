import { daysInMonth, toISO } from "./period";

/**
 * Cálculo de datas do Fluxo de Trabalho — cada modo de visão define sua
 * própria "janela" de dias visíveis a partir de uma âncora (a data que o
 * usuário está navegando), e como avançar/voltar essa âncora.
 */
export type WorkflowView = "timeline" | "month" | "week" | "quinzena";

const MONTH_NAMES = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

export function isoOfDate(date: Date): string {
  return toISO(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function rangeLabel(fromISODate: string, toISODate: string): string {
  const [fy, fm, fd] = fromISODate.split("-").map(Number) as [number, number, number];
  const [ty, tm, td] = toISODate.split("-").map(Number) as [number, number, number];
  if (fy === ty && fm === tm) return `${fd} – ${td} de ${cap(MONTH_NAMES[fm - 1]!)} de ${fy}`;
  if (fy === ty) return `${fd} de ${cap(MONTH_NAMES[fm - 1]!)} – ${td} de ${cap(MONTH_NAMES[tm - 1]!)} de ${fy}`;
  return `${fd}/${fm}/${fy} – ${td}/${tm}/${ty}`;
}

export interface VisibleRange {
  from: string; // ISO
  to: string; // ISO
  label: string;
  /** Dias em ordem de exibição (vazio na visão "month", que usa buildMonthGrid). */
  days: string[];
}

export function computeVisibleRange(view: WorkflowView, anchor: Date): VisibleRange {
  if (view === "month") {
    const y = anchor.getFullYear();
    const m = anchor.getMonth() + 1;
    const from = toISO(y, m, 1);
    const to = toISO(y, m, daysInMonth(y, m));
    return { from, to, label: `${cap(MONTH_NAMES[m - 1]!)} de ${y}`, days: [] };
  }
  if (view === "week") {
    const start = startOfWeek(anchor);
    const days = Array.from({ length: 7 }, (_, i) => isoOfDate(addDays(start, i)));
    return { from: days[0]!, to: days[6]!, label: rangeLabel(days[0]!, days[6]!), days };
  }
  if (view === "quinzena") {
    const start = startOfWeek(anchor);
    const days = Array.from({ length: 15 }, (_, i) => isoOfDate(addDays(start, i)));
    return { from: days[0]!, to: days[14]!, label: rangeLabel(days[0]!, days[14]!), days };
  }
  // timeline: janela larga de 45 dias — 15 pra trás, 29 pra frente da âncora.
  const start = addDays(anchor, -15);
  const days = Array.from({ length: 45 }, (_, i) => isoOfDate(addDays(start, i)));
  return { from: days[0]!, to: days[44]!, label: rangeLabel(days[0]!, days[44]!), days };
}

export function stepAnchor(view: WorkflowView, anchor: Date, dir: 1 | -1): Date {
  if (view === "month") {
    const d = new Date(anchor);
    d.setMonth(d.getMonth() + dir);
    return d;
  }
  if (view === "week") return addDays(anchor, dir * 7);
  if (view === "quinzena") return addDays(anchor, dir * 15);
  return addDays(anchor, dir * 30); // timeline: pula em blocos de 30 dias
}
