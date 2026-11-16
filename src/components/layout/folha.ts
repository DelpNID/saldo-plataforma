"use client";

// Origem: delp-visto@f66a6c3 src/components/layout/folha.ts
// -----------------------------------------------------------------------------
// folha.ts — a página que é UMA folha só (08/10/2026, "vários retângulos
// brancos soltos no fundo, acho que se deixar tudo em um apenas ficaria
// melhor"; direção A de onze em `empresa-folha-unica-direcoes.html`). Dentro de
// uma folha, as peças que desenham caixa própria — Card, Painel, TileIndicador,
// Abas — perdem borda, sombra e canto, e a separação passa a ser o fio entre
// elas, que é de quem monta a folha. Fora de uma folha nada muda: o padrão é
// false. O Modal zera o contexto, porque flutua acima da folha.
//
// `.ts` e não `.tsx`: o Fast Refresh reclama de arquivo .tsx que exporta hook.
// -----------------------------------------------------------------------------
import { createContext, useContext } from 'react';

export const FolhaContexto = createContext(false);

export function useNaFolha(): boolean {
  return useContext(FolhaContexto);
}
