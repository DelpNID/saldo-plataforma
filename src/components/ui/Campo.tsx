// Origem: delp-visto@f66a6c3 src/components/ui/Campo.tsx
// Desvios: CLASSE_CAMPO com min-h-11 (44px, alvo de toque do Ascent; no Visto ~38px); só ela
//   ficou — o componente `Campo` (par rótulo/valor das fichas) e o `TITULO_SECAO` não têm uso
//   no Ascent (regra do Visto: peça sem uso não fica). Ver docs/visto-desvios.md.
// -----------------------------------------------------------------------------

/** A moldura de um campo de formulário — input, select, textarea. Estava
 *  escrita duas vezes (`ContatosEmpresa` e `FormularioTipoDocumento`) quando o
 *  Acervo precisou de uma terceira, e a régua do repositório é UMA por peça
 *  repetida. O que é de cada uso (`mt-`, `disabled:`) fica no uso. */
export const CLASSE_CAMPO =
  'min-h-11 w-full rounded-btn border border-med bg-bg px-3 py-2 text-sm text-txt placeholder:text-txt-muted transition-colors hover:border-txt-muted/60 focus:border-delp-red focus:outline-none focus:ring-2 focus:ring-delp-red/25';
