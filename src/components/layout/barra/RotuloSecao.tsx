"use client";

// Origem: delp-visto@f66a6c3 src/components/layout/barra/RotuloSecao.tsx
// -----------------------------------------------------------------------------
// RotuloSecao.tsx — o rótulo de bloco das barras laterais ("VISÃO GERAL",
// "ADMINISTRAÇÃO", "CONTA"). Caixa alta pequena e cinza: separa blocos sem pesar,
// e é o registro das barras de referência que o Lucas aprovou em 11/09/2026.
//
// Recolhida no desktop, o rótulo some — em 72px não cabe, e quem separa os
// blocos passa a ser o respiro entre eles. No drawer ele continua visível.
// -----------------------------------------------------------------------------
import { clsx } from 'clsx';

interface RotuloSecaoProps {
  children: string;
  recolhida?: boolean;
}

export function RotuloSecao({ children, recolhida = false }: RotuloSecaoProps) {
  return (
    <p
      className={clsx(
        'px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-txt-muted',
        recolhida && 'shell:hidden',
      )}
    >
      {children}
    </p>
  );
}
