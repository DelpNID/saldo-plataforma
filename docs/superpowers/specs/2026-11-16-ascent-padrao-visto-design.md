# Ascent — novo nome e padrão visual do Visto

**Data:** 16/11/2026
**Status:** aguardando aprovação do responsável (Lucas)
**Tipo:** web · modo NID Formal — este documento faz o papel do `/nid:specify`; o plano sai de `superpowers:writing-plans` e passa por um gate (revisão crítica) antes do código.

## 1. Intenção

A Plataforma de Saldo passa a se chamar **Ascent** e adota **ao pé da letra** o padrão visual do Visto (`C:\dev\gg-digital\delp-visto`), para que as aplicações desenvolvidas no NID sigam um padrão só. "Ao pé da letra" quer dizer **o mesmo código**, não uma imitação: os mesmos tokens, as mesmas classes Tailwind e os mesmos componentes de `ui/` e `layout/`, adaptados só no que o Next.js exige. Uma melhoria feita num sistema deve poder ir para o outro copiando o arquivo.

Quem usa não muda: o PCP no computador (Painel, Linhagem, Pendências, Tarefa, Atualizar) e a gestão no celular (Gestão).

## 2. Objetivos

1. **Nome e marca Ascent** em tudo que aparece: título da aba e template (`%s · Ascent`), manifest (`name`, `short_name`), título do app instalado no iPhone, Login, barra lateral, página 404, `aria-label`s e rodapé. O subtítulo sob a logo na barra é **"Subida de saldo"** (o papel que "Gestão de Terceiros" tem sob a logo do Visto).
2. **Camada de design do Visto** dentro do Ascent: `tailwind.config.js`, `postcss.config.js`, tokens e base de `src/index.css` (vira o `src/app/globals.css`), fontes, componentes e hooks listados na seção 5.
3. **Moldura do Visto**: barra lateral de 264px (72px recolhida, com o símbolo), topo de 64px com a trilha de navegação, `main` sem limite de largura, gaveta abaixo de 900px.
4. **Tema claro e escuro** como no Visto: tokens em triplas RGB, `:root[data-tema='escuro']`, escolha `claro | escuro | sistema` guardada no navegador, aplicada antes da primeira pintura e trocada pelo botão do topo.
5. **As 6 telas reescritas** com os componentes e as réguas do Visto (seção 6), **sem perder nada** do que o usuário vê ou faz hoje.

## 3. Fora do escopo

- Regras de negócio, cálculo, leitura da planilha, carga, Prisma, rotas de API, login e sessão. `src/lib/` (regras, kpis, planilha, carga, gravarCarga, formato, sessao) não muda; os 45 testes continuam passando sem alteração.
- Endereço `saldopcpdelp.vercel.app`, nome do projeto na Vercel (`subidadesaldo`) e nome do repositório (`saldo-plataforma`). Trocar o endereço quebra o link de quem já usa; só com pedido explícito.
- Peças do Visto sem uso no Ascent: sino, menu da conta, Configurações, Modal, Abas, Combobox, FaixaDaMarca, carrossel do login, tokens das mesas (`mesa-*`), `marca-fundo`, `tinta`. Regra herdada do Visto: **peça sem uso não fica**.
- Pacote de design compartilhado entre os sistemas.
- Funcionalidade nova.

## 4. Anti-objetivos (falhou, mesmo que funcione)

- O Ascent "parecido" com o Visto, mas com classes e componentes próprios.
- Perder qualquer coisa de hoje: números, filtros, ordenação, paginação, tocar para copiar, cabeçalhos parados ao rolar, impressão, alvo de toque de 44px, a Gestão instalável no celular, o atalho "Está no celular?".
- Cor como único sinal de situação, ou texto abaixo do contraste AA, em qualquer um dos dois temas.
- Hex solto no JSX ou classe fixa do Tailwind (`bg-white`, `text-green-700`), inclusive dentro de mapas de constantes, **no código escrito para o Ascent**. As peças copiadas ficam como no Visto, que já convive com os poucos fixos dele (`text-white` sobre o vermelho do botão, `bg-black/40` da gaveta, o contorno branco do ponto do minigráfico) e com o `lg:` do Login.

## 5. Abordagens (escolhida: A)

| | Como | Troca |
|---|---|---|
| **A. Tailwind + camada de design do Visto** ✅ | Instala Tailwind 3.4 (mesma versão do Visto), copia tokens, componentes e hooks, reescreve o visual das telas com as classes do Visto e aposenta o CSS atual. | Mais trabalho agora (16 componentes e 6 telas), mas o código fica igual ao do Visto. |
| B. CSS próprio imitando o Visto | Reescreve `globals.css` com os mesmos valores. | Igual na tela, diferente no código: toda mudança futura vira tradução manual. |
| C. Pacote compartilhado | Extrai o design do Visto para um pacote usado pelos dois. | Só faz sentido com um terceiro sistema. |

O responsável escolheu **A** em 16/11/2026, com o objetivo de "deixar o Ascent no mesmo padrão das aplicações desenvolvidas aqui".

### O que vem do Visto (origem → destino)

| Visto | Ascent | Adaptação |
|---|---|---|
| `tailwind.config.js` | `tailwind.config.js` | `content` aponta para `src/**/*.{ts,tsx}`; saem só os tokens sem uso (§3). |
| `postcss.config.js` | `postcss.config.js` (ou `.mjs`) | — |
| `src/index.css` | `src/app/globals.css` (substitui o atual) | Saem os tokens sem uso; sobe o bloco `--vermelho-1..6`, `--grade`, unidades, semânticas, tema escuro, `.grade-indicadores`, autofill, menos movimento. |
| `@fontsource` Barlow 400–700 e JetBrains Mono 400–600 | importados no `layout.tsx` raiz | Sai o `next/font/google`. |
| `lib/tema.ts` + script inline do `index.html` | `src/lib/tema.ts` + `<script>` no `<head>` do `layout.tsx` | Chave `ascent.tema`; `suppressHydrationWarning` no `<html>`. |
| `lib/barra-recolhida.ts`, `lib/use-largura-elemento.ts`, `lib/use-prefere-menos-movimento.ts` | mesmos nomes em `src/lib/` | Testes que existirem no Visto vêm junto, para `tests/`. |
| `ui/Button`, `ui/Badge`, `ui/Card`, `ui/Campo` (`CLASSE_CAMPO`, `TITULO_SECAO`, `Campo`), `ui/Segmentado`, `ui/TileIndicador` (+ `lib/indicador-tendencia.ts` se a série for usada) | `src/components/ui/` | — |
| `layout/Painel`, `CabecalhoSecao`, `EstadoVazio`, `Carregando`, `AppShell`, `Sidebar`, `Topbar`, `barra/MarcaBarra`, `barra/ItemBarra`, `barra/RotuloSecao`, `BotaoTema` (de `ContaNoCabecalho`), `folha.ts` (se o Painel/Card exigirem) | `src/components/layout/` | `NavLink`/`useLocation` do React Router viram `next/link` + `usePathname`; o shell vira o layout de um grupo de rotas do App Router. |
| `marca/LogoVisto.tsx` | `src/components/marca/LogoAscent.tsx` (`LogoAscent`, `SimboloAscent`) | Troca de arte (§7). |
| `ESCALA_VERMELHOS` / `COR_*` de `lib/terceiros-ui.ts`, `SELO_TOM` de `lib/formato.ts` | `src/lib/cores.ts` (novo) | Só a escala, o catálogo de cores do Ascent e o `SELO_TOM`. |

Dependências novas: `tailwindcss@^3.4`, `postcss`, `autoprefixer` (dev); `clsx`, `lucide-react`, `@fontsource/barlow`, `@fontsource/jetbrains-mono`. Todas ficam no projeto e não exigem administrador na estação.

### Regra da cópia

- Origem fixa: **delp-visto no commit `f66a6c3`**. Cada arquivo copiado abre com um cabeçalho `Origem: delp-visto@f66a6c3 <caminho>` e, se houver, a lista de desvios. Os comentários do Visto ficam.
- A peça muda só no que o Next.js exige (`next/link`, `usePathname`, `"use client"`) e em **extensões aditivas** quando o conteúdo de hoje do Ascent não cabe nela, sem mudar o comportamento que o Visto já tem. As conhecidas:
  - `Painel`: `acao` aceita `href` (o `onClick` não passa do servidor para o navegador) e `apoio` aceita conteúdo (a nota de Retrabalho tem link);
  - `TileIndicador`: ganha um espaço para conteúdo abaixo do valor (a comparação Saldo × Fabricação, o link "ver lista", o detalhe de RA da Tarefa) e aceita uma variação já escrita ("desde ontem", "em 7 dias"), além das variações mensal e por período que ele já calcula.
- **Alvo de toque de 44px continua valendo no Ascent** (regra de hoje, `--delp-toque`; a Gestão é usada no celular com o dedo). As peças do Visto abaixo disso ganham altura no Ascent, com o desvio anotado: o `Segmentado` (~30px), a moldura de campo `CLASSE_CAMPO` (~38px) e o link "Ver →" do `Painel` (~26px). Recomendação aplicada em 16/11 sem resposta explícita do responsável; se ele preferir o tamanho do Visto, os três desvios saem.
- **Nada volta para o Visto neste trabalho** (outro repositório, outro ciclo). Os desvios ficam listados em `docs/visto-desvios.md`, para serem levados ao Visto depois, se fizer sentido.

## 6. Como fica cada parte

### 6.1 Moldura

- **Barra lateral** (`Sidebar`): lockup Ascent + "Subida de saldo"; recolhida, só o símbolo. Itens com ícone `lucide-react`, na ordem de hoje:
  - grupo **Acompanhamento**: Painel · Linhagem · Pendências · Gestão;
  - grupo **Dados**: Atualizar.
  O item **Pendências** leva o número de componentes pendentes de baixa da carga ativa (o selo do `ItemBarra`), que o `Topo` atual já calcula. Selo zero não aparece.
- **Topo** (`Topbar`): botão da gaveta (abaixo de 900px) · trilha `Ascent › <tela>` (a tela sai do mesmo array do menu; a Tarefa vira `Ascent › Painel › Tarefa 1.18`) · à direita, **seletor de projeto** (o `SeletorProjeto` de hoje, vestido de botão do Visto, com o nome do projeto e "atualizado <data>") · `BotaoTema` como no Visto (alterna claro ⇄ escuro, a partir de 640px) · botão **Sair** (ghost).
- **Escolha do tema completa no pé da barra lateral**: "Tema: Claro · Escuro · Automático", com a mesma marcação do grupo de tema do menu da conta do Visto (`role="radiogroup"`, opção ativa em vermelho). Abaixo de 900px a barra é a gaveta, então o celular também troca o tema por ali. O padrão é **Automático** (`sistema`). Assim o "Automático" nunca se perde, mesmo depois de um clique no botão do topo.
- **Sem cabeçalho de página** nas telas (regra do Visto): a trilha nomeia a tela e o seletor mostra o projeto e o centro de custo. Para leitores de tela, cada tela mantém um `h1`; onde o Visto não o mostra, ele fica `sr-only`.
- O rodapé de hoje ("Delp · Divulgação interna · Fonte: <arquivo>") vira uma linha `text-xs text-txt-muted` no fim do `main`.
- `main`: `w-full flex-1 px-4 py-6 md:px-6 md:py-8`, sem limite de largura; o limite é por bloco (faixa de indicadores, texto até 70ch).
- O Login e a 404 ficam **fora** da moldura (grupo de rotas próprio).

### 6.2 Réguas que valem em todas as telas (copiadas do `CLAUDE.md` do Visto)

- Bloco: `Painel` (`rounded-card border border-subtle bg-bg p-4 shadow-subtle`), título de 15px em tinta escura, apoio de 12px `muted`, link "Ver →" à direita. Título de bloco **nunca** em vermelho.
- Rótulo de seção: `TITULO_SECAO`; cabeçalho de tabela `text-[11px] font-semibold uppercase tracking-[0.1em] text-txt-muted`.
- **Todo número, data, código de tarefa, OP e desenho em `font-mono`** (JetBrains Mono, dígitos de largura fixa).
- Faixa de indicadores: `.grade-indicadores` com `TileIndicador`.
- Botões: `Button` primary (pílula com o degradê vermelho) só na ação principal da tela (Entrar, Gravar carga); o resto é ghost ou botão de linha.
- Campos: `CLASSE_CAMPO`. Alternadores de recorte (ex.: "Todos / Pendentes"): `Segmentado`.
- Vazio e carregando: `EstadoVazio` e `Carregando`.
- Pontos de quebra só `sm:`, `shell:` (900px) e `duascol:` (1280px).

### 6.3 Situação e cor

- **Situação vira `Badge`** (borda neutra, texto em maiúsculas pequenas, ponto colorido). Mapa: concluída / ok → `success`; em andamento / parcial → `warning`; sem avanço / sem saldo / pendente → `danger`; sem dado → `neutral`. O texto continua dizendo a situação; o ponto só reforça.
- **Plano de corte** (hoje a etiqueta preta com o número): `Badge` neutro com o número em mono e o tipo (CNC ou PA/PC) no `title`.
- **Ritmo** (atraso, acompanha, à frente): texto com seta, cor do `SELO_TOM` (`danger` = `text-delp-red`, `success` = `text-success-forte`).
- **Gráficos e barras usam só a escala de vermelhos** (`ESCALA_VERMELHOS`, regra do Visto). Os azuis Subsea e Mooring do Saldo × Fabricação (16/11) e o verde, laranja e vermelho das barras de situação da Gestão **saem**:
  - barra de avanço simples: degrau [4];
  - Saldo × Fabricação: Saldo [5], Fabricação [3] (degraus não vizinhos; nome e % sempre escritos ao lado);
  - situação dos códigos na Gestão: concluídos [2], em andamento [4], sem avanço [6] (o mesmo uso de "apta / pendente / irregular" do Visto), sempre com o rótulo escrito;
  - gráfico de evolução: linha [4], ponto atual [6], grade `--grade`; largura medida (`useLarguraElemento`, 1 unidade = 1px) e altura fixa.
- **Fundos e textos são os cinzas do Visto** (`#F5F5F5`, `#EDEDED`, `#333`…), não o bege `#EAE5DF` usado hoje. Decisão do responsável em 16/11/2026 ("copiar o Visto ao pé da letra"), com ciência de que esses cinzas não são os neutros da paleta corporativa. O bege continua no **ícone** do Ascent, que é arte da marca.

### 6.4 Telas

| Tela | Anatomia Visto | Observações |
|---|---|---|
| **Painel** (`/`) | Faixa de 4 `TileIndicador` → `Painel` com a lista de códigos (tabela, cabeçalho parado ao rolar). | O tile de avanço mostra o % e, com fabricação, a comparação Saldo × Fabricação logo abaixo. A página inteira rola (decisão de 15/11, sem caixa com rolagem própria). O atalho "Está no celular?" continua só abaixo de 700px. A nota de Retrabalho vira apoio do bloco. |
| **Linhagem** | `Painel` por projeto, árvore com os fios de hoje em `border-subtle`/`border-med`. | Botões "abrir" viram `Button` ghost compacto; códigos em mono. |
| **Pendências** | Barra de filtros (campo + `Segmentado`/selects com `CLASSE_CAMPO`), filtros ativos como pílulas, tabela no `Painel`, paginação. | Ordenação e `aria-sort` iguais. |
| **Tarefa** (`/tarefa/[cod]`) | Ficha aberta no lugar, com a volta no topo; faixa de indicadores; "De onde vem o saldo" num `Painel`; **Estruturas por execução com a anatomia da Bancada, adaptada**: lista de execuções à esquerda, árvore à direita, um fio entre as colunas. A lista fica **parada ao rolar** (`sticky`, logo abaixo do topo, rolando por dentro se passar da altura da janela). A árvore **rola com a página**. | A Bancada pura do Visto (as duas colunas rolando por dentro, com altura medida) não serve aqui: ela vem abaixo dos indicadores, cairia no piso de 320px e deixaria a árvore de milhares de componentes numa janelinha. Ela também cortaria a impressão, e em 15/11 o pedido foi página que rola inteira, sem caixa com rolagem própria. Por isso o `useAlturaRestante` sai da lista de cópias. Abaixo de `duascol`, empilha. Troca de código e ações ficam no topo da ficha. |
| **Atualizar** (`/importar`) | `Painel` com as etapas, a área de soltar o arquivo, o resumo da carga em `Campo`s e `Button` primary "Gravar". | O fluxo do worker e a conferência não mudam. |
| **Gestão** (`/gestao`) | Anatomia do Dashboard do Visto: faixa de indicadores atravessando, grade de 12 colunas, trilho de 340px a partir de `duascol`. No celular, coluna única dentro da moldura, com a gaveta. | Continua sendo o `start_url` do app instalado. A busca por desenho/código/equipamento fica no topo. |
| **Login** | Anatomia do Login do Visto: lado escuro (só desktop) com a logo negativa, uma frase e o endosso "Uma plataforma Delp"; painel de 480px à direita com o filete vermelho de 4px no topo, campo de senha e `Button` primary. Fora do desktop, só o painel. | Uma cena estática, sem carrossel: fundo radial quase preto com a grade sutil das cenas do Visto e os triângulos da logo como marca d'água. Frase proposta: **"O saldo de cada projeto, do que já subiu ao que falta baixar."** |
| **404** | `EstadoVazio` dentro da moldura vazia. | — |

## 7. Marca

- Arquivos recebidos em 16/11: `ascent-logo.svg` (base e "Ascent" em preto, para fundo claro), `ascent-logo-negativo.svg` (base e texto em branco, para fundo escuro), `ascent-icone.svg` (quadrado arredondado bege com os triângulos e a base). Entram em `public/images/` **sem alteração** (os metadados de procedência ficam).
- **Símbolo** (`ascent-simbolo.svg`, novo): só os três triângulos e a base, recortado do lockup, para a barra recolhida. Base em `currentColor` ou duas versões (preta e branca), para servir aos dois temas.
- `LogoAscent tom="escuro"` usa `ascent-logo.svg` no tema claro e `ascent-logo-negativo.svg` no escuro, como o `LogoVisto` faz com grafite e branco.
- Ícones: `favicon` (SVG do ícone), `icone-192.png`, `icone-512.png` e `apple-touch-icon.png` gerados a partir de `ascent-icone.svg`. O ícone **maskable** precisa de uma versão com fundo bege sangrando até a borda e o desenho dentro da zona segura (os 80% centrais), porque o ícone atual passa dela nos cantos da base.
- `delp-logo.png` sai da barra; fica só no endosso do Login ("Uma plataforma Delp"), como no Visto.
- `theme_color` e `background_color` do manifest passam para os tokens do Visto (`#FFFFFF` e `#F5F5F5`).

## 8. Restrições

- Next.js 14 App Router com componentes de servidor; o que precisa de estado ou do caminho (barra, topo, tema, seletor) é `"use client"`; os dados continuam vindo dos componentes de servidor e descem por props.
- Tailwind 3.4, a mesma linha do Visto.
- `/api/importar` e o limite de 4,5 MB da Vercel não são tocados.
- Trabalho em branch (`feat/ascent-padrao-visto`), nunca direto na `main`.
- **Verificação** (forma `vitest-playwright` do projeto): `npm test` (45 testes e os que vierem com os hooks do Visto), `npm run build` e `npm run lint` verdes; **conferência visual** com o app rodando, em desktop (1526px, a largura de referência do Visto) e celular (390px), nos dois temas, em todas as telas. Sem evidência, sem commit.
  - Ferramenta: o **Edge headless da estação**, como o Visto já confere, sem baixar navegador. O Playwright e testes visuais automáticos ficam fora deste trabalho.
  - As capturas mostram dado de projeto de cliente: ficam em `design/ascent-verificacao/` (já fora do git pelo `.gitignore`) e **não entram no PR**. O PR diz o que foi conferido, em quais larguras e temas.
  - Base de dados da conferência: **o banco configurado no `.env` local**, autorizado pelo responsável em 16/11/2026. Na prática a conferência só lê. A única gravação possível é o `garantirHistorico` da Gestão criar o resumo de uma carga que ainda não o tenha, o mesmo que acontece quando qualquer pessoa abre a tela.
- `CLAUDE.md` do projeto: a seção "Padrão visual" é reescrita para apontar para o padrão do Visto (Tailwind, tokens, réguas, moldura), e o nome do sistema muda no título. `README.md` acompanha.

## 9. Deixado para quem constrói

- Escolha dos ícones `lucide-react` de cada item do menu.
- Estrutura dos grupos de rotas do App Router e onde o layout busca os dados do topo (projetos, pendentes).
- Recorte exato do símbolo e geração dos PNGs (ferramenta disponível no projeto, sem instalar nada fora dele).
- Detalhe de cada tela dentro das réguas da §6, desde que nada da §4 aconteça.
- Ordem de migração (moldura e tokens primeiro, depois tela a tela, com o build verde a cada passo).
