// Origem: delp-visto@f66a6c3 src/components/ui/Campo.tsx
// Desvios: CLASSE_CAMPO com min-h-11 (44px, alvo de toque do Ascent; no Visto ~38px).
//   Ver docs/visto-desvios.md.
// -----------------------------------------------------------------------------
// Campo.tsx — o par rótulo/valor dos diálogos de leitura do Portal (17/08).
//
// Nasceu duplicado, idêntico, em FichaTrabalhador (Portal interno) e
// FichaColaborador (Portal do Terceiro). Quando a ficha do funcionário do
// Siclope adotou o mesmo padrão, a terceira cópia foi a hora de parar.
//
// O valor QUEBRA em vez de truncar: numa ficha, o dado inteiro importa mais que
// a linha alinhada — quem abre a ficha vem justamente ler o campo.
// -----------------------------------------------------------------------------
import type { ReactNode } from 'react';

/** Título de seção da ficha: micro-caps logo abaixo do divisor que a separa. */
export const TITULO_SECAO = 'text-[11px] font-bold uppercase tracking-[0.08em] text-txt-2';

/** A moldura de um campo de formulário — input, select, textarea. Estava
 *  escrita duas vezes (`ContatosEmpresa` e `FormularioTipoDocumento`) quando o
 *  Acervo precisou de uma terceira, e a régua do repositório é UMA por peça
 *  repetida. O que é de cada uso (`mt-`, `disabled:`) fica no uso. */
export const CLASSE_CAMPO =
  'min-h-11 w-full rounded-btn border border-med bg-bg px-3 py-2 text-sm text-txt placeholder:text-txt-muted transition-colors hover:border-txt-muted/60 focus:border-delp-red focus:outline-none focus:ring-2 focus:ring-delp-red/25';

/**
 * Um dado da ficha, em rótulo micro-caps sobre o valor.
 *
 * Um `dl` por par, e não um `dl` só em volta da grade: assim rótulo e valor
 * seguem associados quando as colunas reflowam. HTML5 permite a lista de
 * definição com um único par, e o preflight do Tailwind já zera a margem que o
 * browser daria ao `dd`, então o visual é o mesmo dos dois `p` que havia antes.
 */
export function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <dl className="min-w-0">
      <dt className="text-[11px] uppercase tracking-[0.08em] text-txt-muted">{rotulo}</dt>
      <dd className="mt-0.5 break-words text-sm text-txt">{children}</dd>
    </dl>
  );
}
