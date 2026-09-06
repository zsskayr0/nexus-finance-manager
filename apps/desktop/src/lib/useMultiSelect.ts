import { useEffect, useRef, useState } from "react";

/**
 * Seleção múltipla estilo gerenciador de arquivos: Ctrl/Cmd+clique alterna
 * um item, Shift+clique seleciona o intervalo a partir do último âncora,
 * Ctrl/Cmd+A seleciona tudo que está visível (`orderedIds`, já filtrado/
 * ordenado — o intervalo do Shift usa essa mesma ordem), Delete apaga a
 * seleção (via `onDeleteSelected`) e Esc limpa. Atalhos de teclado ficam
 * inativos enquanto o foco está num campo de texto, pra não brigar com
 * digitação normal (ex.: Ctrl+A pra selecionar um texto na busca).
 */
export function useMultiSelect(orderedIds: string[], onDeleteSelected: (ids: string[]) => void, enabled = true) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const anchorRef = useRef<string | null>(null);

  // Se a lista mudar (filtro, período, refresh) e um item selecionado sumir
  // dela, tira ele da seleção — não faz sentido continuar "selecionado" fora
  // da vista.
  useEffect(() => {
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const visible = new Set(orderedIds);
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderedIds.join("|")]);

  /** Chame no onClick da linha, ANTES de rodar a ação padrão (ex.: abrir editar) — retorna `true` se o clique foi de seleção (não deve abrir nada). */
  function handleRowClick(id: string, e: { shiftKey: boolean; ctrlKey: boolean; metaKey: boolean }): boolean {
    if (e.shiftKey && anchorRef.current) {
      const from = orderedIds.indexOf(anchorRef.current);
      const to = orderedIds.indexOf(id);
      if (from !== -1 && to !== -1) {
        const [lo, hi] = from <= to ? [from, to] : [to, from];
        setSelected(new Set(orderedIds.slice(lo, hi + 1)));
      }
      return true;
    }
    if (e.ctrlKey || e.metaKey) {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      anchorRef.current = id;
      return true;
    }
    return false;
  }

  function selectAll() {
    setSelected(new Set(orderedIds));
  }

  function clear() {
    setSelected(new Set());
  }

  useEffect(() => {
    if (!enabled) return;
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const isTyping = !!target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      if (isTyping) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
        e.preventDefault();
        selectAll();
      } else if (e.key === "Escape" && selected.size > 0) {
        clear();
      } else if (e.key === "Delete" && selected.size > 0) {
        e.preventDefault();
        onDeleteSelected([...selected]);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, orderedIds.join("|"), selected, onDeleteSelected]);

  return { selected, handleRowClick, selectAll, clear };
}
