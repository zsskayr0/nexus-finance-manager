/**
 * Paleta curada de cores de identificação — uma fonte só, usada tanto em
 * Contas quanto em Categorias (e em qualquer outro seletor de cor futuro).
 * Importante que seja uma fonte única: a cor de uma categoria agora é
 * renderizada de verdade em vários lugares (ícone, gráficos, faixa lateral
 * dos lançamentos), então a mesma categoria precisa parecer igual em toda
 * parte — o que só se garante escolhendo sempre da mesma paleta.
 */
export const COLOR_SWATCHES = [
  "#f5f5f6", // quase branco
  "#c7c7cc", // cinza claro
  "#96969c", // cinza médio
  "#e4636b", // vermelho
  "#f2895a", // terracota
  "#f2a154", // laranja
  "#f5d76e", // amarelo
  "#c9d96a", // lima
  "#8fd9ac", // verde
  "#7dd3c0", // teal
  "#6ec6ff", // azul
  "#8ca6f2", // índigo
  "#b98cf2", // roxo
  "#f28fb0", // rosa
] as const;
