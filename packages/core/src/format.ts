/**
 * Helpers de formatação compartilhados. `amountCents` é sempre a fonte da
 * verdade (inteiro, sem ponto flutuante) — estas funções só convertem para
 * exibição.
 */

const BRL_FORMATTER = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/** Converte centavos (2362550 → "R$ 23.625,50") para exibição em pt-BR. */
export function formatCentsToBRL(amountCents: number): string {
  return BRL_FORMATTER.format(amountCents / 100);
}

/** Converte um valor decimal (234.5) para centavos inteiros (23450), arredondando. */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/** Converte centavos de volta para decimal (23450 → 234.5). */
export function fromCents(amountCents: number): number {
  return amountCents / 100;
}

/** "2026-09-04" → "04/09/2026" */
export function formatDateBR(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

/** "04/09/2026" → "2026-09-04" (aceita "4/9/2026" também) */
export function parseDateBRToISO(dateBR: string): string {
  const [d, m, y] = dateBR.split("/");
  if (!d || !m || !y) throw new Error(`Data inválida: ${dateBR}`);
  return `${y.padStart(4, "0")}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

/** Hoje em ISO (YYYY-MM-DD), respeitando o fuso local do dispositivo. */
export function todayISO(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}
