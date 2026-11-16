"use client";

// Origem: delp-visto@f66a6c3 src/components/ui/Segmentado.tsx
// Desvios: botões com 44px de altura (min-h-11, inline-flex para centrar) — alvo de
//   toque do Ascent, usado no celular; no Visto eles têm ~30px. Ver docs/visto-desvios.md.
// -----------------------------------------------------------------------------
// Segmentado.tsx — o alternador de RECORTE de um mesmo bloco (14/09/2026):
// duas ou três opções coladas, a escolhida em branco sobre o trilho cinza.
//
// Não confundir com `Abas`: aba troca o CONTEÚDO da tela e é navegação; isto
// troca a JANELA de um gráfico ou de uma lista que continua no mesmo lugar
// ("últimos 12 meses" × "próximos 6"). Por isso são botões com aria-pressed, e
// não um tablist.
// -----------------------------------------------------------------------------
import { clsx } from 'clsx';

export function Segmentado<T extends string>({
  opcoes,
  valor,
  aoTrocar,
  ariaLabel,
}: {
  opcoes: { id: T; rotulo: string }[];
  valor: T;
  aoTrocar: (id: T) => void;
  /** O que o alternador escolhe — sem ele o grupo não se nomeia para quem
   *  navega por leitor de tela. */
  ariaLabel: string;
}) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className="inline-flex shrink-0 gap-0.5 rounded-btn border border-subtle bg-bg-2 p-0.5"
    >
      {opcoes.map((o) => (
        <button
          key={o.id}
          type="button"
          aria-pressed={valor === o.id}
          onClick={() => aoTrocar(o.id)}
          className={clsx(
            'inline-flex min-h-11 items-center whitespace-nowrap rounded-[8px] px-3 py-1 text-xs font-semibold transition-colors',
            valor === o.id
              ? 'bg-bg text-txt shadow-subtle'
              : 'text-txt-2 hover:text-txt',
          )}
        >
          {o.rotulo}
        </button>
      ))}
    </div>
  );
}
