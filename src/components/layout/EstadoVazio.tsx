// Origem: delp-visto@f66a6c3 src/components/layout/EstadoVazio.tsx
// -----------------------------------------------------------------------------
// EstadoVazio.tsx — o bloco "não há nada aqui" padrão. Centralizado; o
// invólucro (Card, célula de tabela) é do chamador. Ícone solto sem fundo,
// padrão do sistema desde 30/07/2026.
// -----------------------------------------------------------------------------
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

interface EstadoVazioProps {
  icone?: LucideIcon;
  titulo: string;
  descricao?: string;
  /** CTA opcional (ex.: botão de criar o primeiro item). */
  acao?: ReactNode;
}

export function EstadoVazio({ icone: Icone, titulo, descricao, acao }: EstadoVazioProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      {Icone && (
        <span
          className="flex h-14 w-14 items-center justify-center text-delp-red"
          aria-hidden="true"
        >
          <Icone size={26} />
        </span>
      )}
      <p className="font-semibold text-txt">{titulo}</p>
      {descricao && <p className="max-w-sm text-sm text-txt-2">{descricao}</p>}
      {acao}
    </div>
  );
}
