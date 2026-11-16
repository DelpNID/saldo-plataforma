"use client";

// Origem: delp-visto@f66a6c3 src/components/ui/Card.tsx
// -----------------------------------------------------------------------------
// Card.tsx — contêiner branco padrão do design system
//
// Caixa branca com canto arredondado de 16px, borda sutil e sombra leve.
// É a base visual de praticamente todos os blocos de conteúdo do Portal.
// Aceita qualquer atributo de <div> (className extra, role, aria-* etc.).
// -----------------------------------------------------------------------------

import { clsx } from 'clsx';
import type { HTMLAttributes } from 'react';
import { useNaFolha } from '../layout/folha';

export function Card({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  // Numa folha (layout/folha.ts) o cartão é um trecho dela: sem caixa própria.
  const naFolha = useNaFolha();
  return (
    <div
      className={clsx(!naFolha && 'rounded-card border border-subtle bg-bg shadow-subtle', className)}
      {...rest}
    >
      {children}
    </div>
  );
}
