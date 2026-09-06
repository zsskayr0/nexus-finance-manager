/**
 * Modo de cor dos gráficos do Painel — alternável, persiste entre sessões.
 * "Monocromático" mantém a linguagem preto/branco/cinza do resto do app
 * (receitas em branco cheio, despesas em branco com menos opacidade,
 * sem nenhum matiz); "Colorido" troca por um verde e um vermelho pastel,
 * pra quem prefere identificar receita/despesa pela cor à primeira vista.
 */

export type ChartColorMode = "mono" | "color";

export interface ChartPalette {
  income: string;
  expense: string;
  incomeSoft: string; // usado no preenchimento de área do gráfico de linha
}

export const CHART_PALETTES: Record<ChartColorMode, ChartPalette> = {
  mono: {
    income: "#f5f5f6",
    expense: "rgba(245,245,246,0.42)",
    incomeSoft: "rgba(245,245,246,0.16)",
  },
  color: {
    income: "#8fd9ac",
    expense: "#e99a9d",
    incomeSoft: "rgba(143,217,172,0.22)",
  },
};

const STORAGE_KEY = "nexus:chart-color-mode";

export function loadChartColorMode(): ChartColorMode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "color" ? "color" : "mono";
  } catch {
    return "mono";
  }
}

export function saveChartColorMode(mode: ChartColorMode) {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // localStorage indisponível (ex.: contexto privado) — segue sem persistir.
  }
}
