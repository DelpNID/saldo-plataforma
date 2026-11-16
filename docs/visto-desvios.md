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
| `src/lib/tema.ts` | Chave `ascent.tema`; `CHAVE_TEMA` importada de `tema-script.ts`; `useTema`/`useTemaEfetivo` começam em `'sistema'`/`'claro'` e leem o valor no efeito | O layout raiz é de servidor e não pode importar módulo com hooks; o estado inicial lido do navegador quebraria a hidratação (a primeira pintura já sai certa pelo script do `<head>`). |
| `src/lib/tema-script.ts` (= o `<script>` do `index.html`) | Vira uma string exportada, posta no `<head>` pelo `layout.tsx` | No Next não há `index.html`. |
| `src/lib/barra-recolhida.ts` | Chave `ascent.barra-recolhida`; começa aberta e lê no efeito | Mesmo motivo do tema. Quem recolheu a barra a vê abrir e fechar uma vez ao carregar. |
| `src/components/layout/Sidebar.tsx`, `Topbar.tsx`, `AppShell.tsx` | Mesmo markup e classes; sem papéis, âncoras, sino, menu da conta nem saída por inatividade; menu e trilha de `src/lib/navegacao.ts`; dados do topo por prop do layout; `print:hidden` e `print:!pl-0` | O Ascent tem uma senha de equipe, sem papéis. O conteúdo vem por `children` (App Router). |
| `src/components/layout/AppShell.tsx` | Rodapé "Delp · Divulgação interna · Fonte" em `text-txt-2` | O `--muted` dá ~4,2:1 sobre o `--bg-2` (abaixo do AA). |
| `src/components/layout/barra/ItemBarra.tsx` | `next/link` com `aria-current` no lugar do `NavLink` | Não há React Router. |
| `src/components/layout/barra/MarcaBarra.tsx` | Marca Ascent e "Subida de saldo"; lockup com 132px | A arte do Ascent é mais larga (4:1); a mesma altura de letra do Visto pede 132px. |
| `src/components/layout/barra/SeloNumero.tsx` (= `SeloNumero` de `SeloConversas.tsx`) | Fundo `bg-grad-delp` | No escuro o `--delp-red` clareia e o branco por cima cai para ~3:1. |
| `src/components/layout/SeletorTema.tsx` (do grupo "Tema" de `ContaNoCabecalho.tsx`) | Mora no pé da barra; opção ativa em `bg-grad-delp`; 44px | O Ascent não tem menu da conta; mesmo motivo de contraste do selo. |
| `src/components/layout/BotaoTema.tsx` | Arquivo próprio | No Visto ele mora dentro de `ContaNoCabecalho.tsx`. |
| `src/components/ui/Campo.tsx` | Só a `CLASSE_CAMPO` ficou | O componente `Campo` e o `TITULO_SECAO` não têm uso no Ascent. |
| `tailwind.config.js` | Saem as animações (`kenburns`, `etapa`, `shake`, `confirmacao`, `selo`, `risco`, `pulso`) | São do carrossel do Login e do `AvisoFlutuante` do Visto, que o Ascent não tem. |
| `src/app/login/page.tsx` (= `LoginPage.tsx`) | Uma cena só (`public/images/cena-ascent.svg`, arte própria na linguagem das cenas do Visto), sem carrossel; "Entrar no sistema" (sem usuário lembrado: o Ascent entra com a senha da equipe); sem "Esqueci minha senha", "Lembrar usuário", aviso de Caps Lock e freio de tentativas; rodapé sem "tentativas registradas" e sem aviso de privacidade; endosso da Delp branco no tema escuro (duas imagens trocadas por CSS) | O Ascent não tem usuários, recuperação de senha, trilha de tentativas nem página de privacidade: o texto só diz o que é verdade no sistema. |
| `src/components/CampoSenha.tsx` (campo "Senha" + `classeInput` de `LoginPage.tsx`) | Componente cliente próprio | O Login do Ascent é de servidor; só o mostrar/ocultar precisa de estado. |
| `src/lib/saudacao.ts` (= `saudacaoDaHora` de `src/lib/formato.ts`) | Arquivo próprio, com o teste do Visto | O `formato.ts` do Ascent já existia e é outro. |

## Cores fixas permitidas

Fora dos tokens, só nestes pontos:
- `src/app/layout.tsx` (`themeColor`) e `src/app/manifest.ts` (`background_color`, `theme_color`): são metadados para o navegador e o celular, não estilo de tela.
- A arte do Login (`public/images/cena-ascent.svg`): é sempre escura.
- A sombra do botão Entrar (`CLASSE_BOTAO_ENTRAR`): veio igual do Visto.

## Peças do Visto que não vieram

Pela regra do Visto, **peça sem uso não fica**. Ficaram de fora até agora:
- `use-prefere-menos-movimento.ts`, que nenhuma peça copiada usa. Se vier, precisa começar em `false` e ler o `window` num efeito, porque o Visto lê no estado inicial e isso quebra a renderização no servidor.
- `Modal`, `Abas`, `Combobox`, `CabecalhoSecao`, `FaixaDaMarca`, o sino, o menu da conta e as Configurações (fora do escopo do Ascent).
- `Card` e `Carregando` chegaram a ser copiados, mas saíram na limpeza final: nenhuma tela os usou.
