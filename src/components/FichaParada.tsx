"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * O cabeçalho da ficha da Tarefa, parado ao rolar logo abaixo do topo de 64px (como o
 * `.fixo` de antes). Mede a própria altura e a publica em `--cab-ficha` no elemento pai,
 * para quem para logo abaixo dele (a lista de execuções) saber onde parar.
 */
export function FichaParada({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    const pai = el?.parentElement;
    if (!el || !pai || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => pai.style.setProperty("--cab-ficha", `${el.offsetHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      className="sticky top-16 z-10 -mx-4 border-b border-subtle bg-bg-2 px-4 py-2.5 md:-mx-6 md:px-6 print:static print:mx-0 print:px-0"
    >
      {children}
    </div>
  );
}
