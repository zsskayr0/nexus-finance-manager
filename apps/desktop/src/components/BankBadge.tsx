/** Preto ou branco, o que der mais contraste em cima de `hex` (luminância relativa, regra padrão WCAG simplificada). */
export function readableTextColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.6 ? "#111112" : "#f5f5f6";
}

/**
 * Selo colorido de banco — cor real da marca + sigla, sem depender de
 * nenhum logo baixado (o app é 100% offline). Usado no seletor de bancos e
 * na lista de Contas.
 */
export function BankBadge({ color, initials, size = 32 }: { color: string; initials: string; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-[9px] font-bold"
      style={{ width: size, height: size, background: color, color: readableTextColor(color), fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
}
