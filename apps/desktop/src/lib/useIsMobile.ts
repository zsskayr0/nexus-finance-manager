import { useEffect, useState } from "react";

/**
 * `true` abaixo do breakpoint `md` do Tailwind (768px) — usado nos poucos
 * lugares onde uma classe responsiva pura não basta (altura calculada via
 * ResizeObserver, largura passada como número pra um componente de
 * gráfico) e a decisão precisa acontecer em JS mesmo.
 */
export function useIsMobile(breakpointPx = 768): boolean {
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth < breakpointPx);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpointPx - 1}px)`);
    const handler = () => setIsMobile(mql.matches);
    handler();
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [breakpointPx]);

  return isMobile;
}
