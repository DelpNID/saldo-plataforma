# Desvios do Ascent em relação ao Visto

O Ascent copia a camada de design do Visto (`C:\dev\gg-digital\delp-visto`, commit **`f66a6c3`**) ao pé da letra, para que as aplicações do NID sigam um padrão só. Cada arquivo copiado começa com `Origem: delp-visto@f66a6c3 <caminho>`.

Esta lista registra **o que mudou e por quê**, arquivo por arquivo. Serve para duas coisas:
- levar ao Visto o que valer para os dois sistemas;
- comparar com o Visto antes de copiar uma versão nova de uma peça.

Nada aqui foi aplicado no Visto.

| Arquivo no Ascent | O que mudou | Por quê |
|---|---|---|
| `tailwind.config.js` | `content` só em `src/`; saem as cores `tinta`, `mesa` e `marca-fundo` | O Next não tem `index.html`; as cores são do domínio do Visto (mesas, logo de empresa, trilho do Interruptor) e não têm uso aqui. |
| `src/app/globals.css` (= `src/index.css`) | Saem `--mesa-*`, `--marca-fundo` e `--tinta*`; entram `.so-tema-claro`/`.so-tema-escuro` | Mesmos tokens sem uso; as duas regras trocam a arte da marca por tema sem JavaScript (ver `LogoAscent`). |
| `postcss.config.mjs` | `tailwindcss/nesting` a mais | Provisório: só existe para o `legado.css` enquanto as telas migram. Sai na limpeza final. |
| `src/components/marca/LogoAscent.tsx` (= `LogoVisto.tsx`) | Arte do Ascent em SVG; as duas versões no HTML, escolhidas por CSS; `alt` nas duas | O Ascent renderiza no servidor: trocar o `src` por `useTemaEfetivo` faria o HTML do servidor discordar do navegador quando o tema salvo é o escuro. A imagem escondida já sai da árvore de acessibilidade. |
| `src/components/ui/Segmentado.tsx` | Botões com 44px (`min-h-11`) | Alvo de toque do Ascent, usado no celular (no Visto ~30px). |
| `src/components/ui/Campo.tsx` | `CLASSE_CAMPO` com `min-h-11` | Alvo de toque (no Visto ~38px). |
| `src/components/layout/Painel.tsx` | `acao.href` (vira `next/link`); `apoio` aceita conteúdo; link da ação com 44px | O `onClick` não passa de página de servidor para o navegador; a nota de Retrabalho tem link; alvo de toque. |
| `src/components/ui/TileIndicador.tsx` | `children` (conteúdo abaixo do valor); `variacaoTexto` (variação já escrita); variação "boa" em `text-success-forte` | O Ascent mostra a barra Saldo × Fabricação, links e "desde ontem" / "em 7 dias", que não são série mensal; o `--success` puro dá ~3:1 em texto de 12px (abaixo do AA). |
| `"use client"` em `Card`, `Painel`, `TileIndicador`, `Segmentado` e `folha.ts` | Diretiva do Next | `createContext`/`useContext`, hooks e eventos só rodam em componente de cliente no App Router. O Visto é SPA e não precisa. |

## Peças do Visto que não vieram

Pela regra do Visto, **peça sem uso não fica**. Ficaram de fora até agora:
- `use-prefere-menos-movimento.ts`, que nenhuma peça copiada usa. Se vier, precisa começar em `false` e ler o `window` num efeito, porque o Visto lê no estado inicial e isso quebra a renderização no servidor.
- `Modal`, `Abas`, `Combobox`, `CabecalhoSecao`, `FaixaDaMarca`, o sino, o menu da conta e as Configurações (fora do escopo do Ascent).
