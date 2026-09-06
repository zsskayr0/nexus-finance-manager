/**
 * Marca do Nexus — "O Diafragma" (conceito 05 das explorações de marca):
 * dois anéis segmentados desalinhados em torno de um ponto fixo central.
 * Fala de foco (lente) e custódia (mecanismo de cofre) na mesma forma.
 * Tipografia do lockup: Chivo Light, uppercase, tracking largo — "precisão
 * de instrumento", como descrito na exploração original.
 */
export function ApertureMark({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className={className} style={{ color: "var(--text)" }}>
      <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth={7} strokeDasharray="52 36" strokeDashoffset={26} strokeLinecap="butt" />
      <circle cx="50" cy="50" r="25" fill="none" stroke="currentColor" strokeWidth={7} strokeDasharray="31 23" strokeLinecap="butt" />
      <circle cx="50" cy="50" r="10" fill="currentColor" />
    </svg>
  );
}

export function AppLogo({ size = 20, wordmarkSize = 18 }: { size?: number; wordmarkSize?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <ApertureMark size={size} />
      <span
        style={{
          fontFamily: "'Chivo', sans-serif",
          fontWeight: 300,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          fontSize: wordmarkSize,
        }}
      >
        Nexus
      </span>
    </div>
  );
}
