// Origem: delp-visto@f66a6c3 src/components/ui/Badge.tsx
// -----------------------------------------------------------------------------
// Badge.tsx — etiqueta de status (ex.: "Nova", "Em análise", "Concluída")
//
// Decisão de acessibilidade: o texto é sempre escuro (text-txt) e a cor do
// tom aparece no fundo suave e no dot. Os tons semânticos puros (#22A84E,
// #C99A00...) não atingem contraste AA em texto pequeno sobre fundo claro —
// e a cor nunca deve ser o único sinal do estado (daltonismo).
// -----------------------------------------------------------------------------

import { clsx } from 'clsx';
import type { ReactNode } from 'react';

/** Tons disponíveis, mapeados para as cores semânticas do tema. */
export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral';

const tones: Record<BadgeTone, { dot: string }> = {
  success: { dot: 'bg-success' },
  warning: { dot: 'bg-warning' },
  danger: { dot: 'bg-danger' },
  // Estado APAGADO (inativo/desligado): o dot cinza é o que diferencia
  // "situação neutra" de ausência de badge.
  neutral: { dot: 'bg-border-med' },
};

export function Badge({ tone, children }: { tone: BadgeTone; children: ReactNode }) {
  return (
    // Visual formal e neutro: borda cinza discreta, sem fundo colorido — a
    // cor do estado aparece apenas no dot. Rótulo em micro-caps espaçadas
    // (mesma tipografia dos títulos de grupo do menu).
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-badge border border-subtle bg-bg px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.08em] text-txt">
      {/* Dot colorido: reforço visual do tom, invisível para leitores de tela
          (o texto do badge já diz o estado). */}
      <span className={clsx('h-1.5 w-1.5 rounded-full', tones[tone].dot)} aria-hidden="true" />
      {children}
    </span>
  );
}
