# Ascent — novo nome e padrão visual do Visto · Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Renomear a Plataforma de Saldo para Ascent e trocar toda a camada visual pela do Visto (Tailwind, tokens, componentes, moldura, tema claro/escuro), tela a tela, sem mudar regra de negócio.

**Architecture:** Tailwind 3.4 entra ao lado do CSS atual. O CSS antigo fica preso numa classe `.legado` (aninhamento do `tailwindcss/nesting`), para que telas ainda não migradas continuem iguais dentro da moldura nova. A moldura vira o layout do grupo de rotas `(app)`, alimentado por uma função de servidor. Cada tela migra numa tarefa própria; a última tarefa apaga o CSS antigo. A conferência visual é feita por um script que dirige o Edge da estação pelo protocolo de depuração (CDP).

**Tech Stack:** Next.js 14 App Router · React 18 · TypeScript · Tailwind CSS 3.4 · `clsx` · `lucide-react` · `@fontsource` · Prisma · Vitest · Edge headless (CDP) via `tsx`.

**Spec:** `docs/superpowers/specs/2026-11-16-ascent-padrao-visto-design.md`. Leia junto com este plano.

**Origem das cópias:** `C:\dev\gg-digital\delp-visto` no commit `f66a6c3`. Logos recebidas em `C:\Users\lucas.almeida\Downloads\ascent-logo.svg`, `ascent-logo-negativo.svg`, `ascent-icone.svg`.

**Gate NID (16/11/2026):** red-team com veredito **GO com correções**. As 12 correções já estão no texto abaixo. **Execução:** a estação não alcança o banco (porta 5432 bloqueada na rede da Delp). Por decisão do responsável em 16/11, cada tarefa commita com `npm test` + `npm run build` + `npm run lint` como evidência, e **todas as capturas rodam no fim**: `00-antes`, tirada da `main` num worktree separado, e `12-final`, com os critérios visuais de cada tarefa conferidos de uma vez.

## Global Constraints

- Branch `feat/ascent-padrao-visto`. Nada na `main`, nenhum push, deploy ou merge (o merge é do responsável).
- Commits semânticos em pt-BR (`feat: …`, `refactor: …`, `chore: …`), terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. **Sem evidência de verificação, sem commit.**
- Verificação de cada tarefa: `npm test`, `npm run build` e `npm run lint` verdes, mais `npm run capturas -- <etapa>` com o relatório lido (seção de cada tarefa diz o que conferir).
- Ordem fixa quando houver capturas: **parar o servidor de dev** (encerrar o processo que escuta na porta 3000, porque parar só o `npm` deixa o Next órfão no Windows) → `npm test && npm run build && npm run lint` → `npm run dev` → `npm run capturas`. O `next build` apaga o `.next` que o dev usa. O script confere pelo manifest que a porta 3000 é deste app (o Visto usa a mesma porta).
- Arquivos de negócio **não mudam**: `src/lib/{regras,kpis,planilha,carga,gravarCarga,formato,sessao,db,lerXlsx,leitor.worker}.ts`, `src/app/api/**`, `prisma/**`. Os 45 testes atuais passam sem edição.
- Toda peça copiada do Visto abre com `// Origem: delp-visto@f66a6c3 <caminho no Visto>` e, se houver, `// Desvios: …`. Os comentários do Visto ficam. Todo desvio também entra em `docs/visto-desvios.md`.
- Versões: `tailwindcss@^3.4.19`, `postcss@^8.5`, `autoprefixer@^10.5` (dev); `clsx@^2.1.1`, `lucide-react@^1.24.0`, `@fontsource/barlow@^5.3.0` (pesos 400, 500, 600, 700), `@fontsource/jetbrains-mono@^5.3.0` (pesos 400, 500, 600). Sai o `next/font/google`.
- Tokens: os valores do `src/index.css` do Visto, claro e escuro, **exceto** `--mesa-*`, `--marca-fundo` e `--tinta*` (e as classes correspondentes no `tailwind.config.js`).
- Pontos de quebra no código do Ascent: só `sm:`, `md:` (padding do `main`, como no Visto), `shell:` (900px) e `duascol:` (1280px). Nada de `lg:`, `xl:` ou `min-[…]:` em código novo. Peça copiada mantém o que tem.
- Sem hex solto nem classe fixa (`bg-white`, `text-green-700`) em código novo; cor de gráfico vem de `src/lib/cores.ts` por `style`.
- Alvo de toque ≥ 44px em todo controle clicável do Ascent (desvios do `Segmentado`, `CLASSE_CAMPO` e link "Ver →" do `Painel`).
- Todo número, data, código de tarefa, OP e desenho em `font-mono`.
- Impressão: o que some hoje continua sumindo (moldura, filtros, ferramentas, paginação, troca de código), via `print:hidden`.
- Textos fixos: nome **Ascent**; subtítulo da barra **Subida de saldo**; frase do Login **O saldo de cada projeto, do que já subiu ao que falta baixar.**; endosso **Uma plataforma** + `delp-logo.png`.
- Chaves do navegador: tema `ascent.tema` (padrão `sistema`), barra `ascent.barra-recolhida`.
- Nunca ler nem imprimir o `.env`. Os scripts leem as variáveis em tempo de execução (`tsx --env-file=.env`).
- Capturas mostram dado de cliente: só em `design/ascent-verificacao/<etapa>/` (fora do git), nunca no commit nem no PR.

## Review Focus

1. **Login sem sessão**: o `middleware` redireciona tudo que não está na lista de exceções. As artes do Login (`/images/…`) e os ícones precisam abrir sem sessão. → Tarefa 2: exceção `images/` no matcher, conferida pela captura `login` sem cookie.
2. **Tema escuro salvo ou do sistema, barra recolhida**: a primeira pintura já sai no tema certo e o React não reclama de hidratação (o Visto é SPA, o Ascent renderiza no servidor). → Tarefas 0 e 4:
   - o relatório verifica se o script do tema está no `<head>` de `/login` e de `/`;
   - as variantes `-salvo-escuro` (escuro salvo com o sistema claro) e `-barra-recolhida` gravam o `localStorage` antes de abrir;
   - os erros de console são registrados, e a etapa `moldura` exige zero erros de hidratação;
   - o teste do `SCRIPT_TEMA` cobre o tema salvo, o do sistema e o armazenamento bloqueado.
3. **Celular (390px) e blocos parados**: nenhuma tela rola de lado; a gaveta abre, fecha no Esc e devolve o foco; os blocos que hoje ficam parados ao rolar continuam parados **abaixo** do topo de 64px. → O relatório mede `scrollWidth > innerWidth` em toda tela; as capturas `-rolado` (janela de 900px rolada) mostram o que ficou parado.
4. **Tarefa com árvore enorme e impressão**: o código `RETRABALHO` tem milhares de componentes. A lista de execuções parada não pode cobrir a árvore, e a impressão sai sem a moldura. → Tarefa 6: `retrabalho-*-rolado` e `tarefa-794-claro-impressao` (largura de A4).
5. **Código que não existe**: `/tarefa/<inexistente>` mostra a 404 nova dentro da moldura (`(app)/not-found.tsx`). Uma URL desconhecida mostra a 404 fora da moldura (`not-found.tsx` da raiz). → Tarefa 11: captura `inexistente`. O 404 do próprio documento não conta como erro de console.
6. **Contraste AA nos dois temas** (design §4): o relatório lista, por captura, todo texto abaixo de 4,5:1 (3:1 se grande) contra o fundo efetivo. Mesmo antes de a tela migrar, nenhuma etapa pode piorar a contagem em relação à anterior; na `12-final` ela é zero.

---

### Task 0: Branch, ferramenta de capturas e linha de base

**Files:**
- Create: `scripts/edge-cdp.ts`, `scripts/plano-capturas.ts`, `scripts/capturar-telas.ts`
- Create: `tests/plano-capturas.test.ts`
- Modify: `package.json` (scripts `capturas` e `icones`)
- Add ao commit: `docs/superpowers/specs/2026-11-16-ascent-padrao-visto-design.md`, este plano

**Interfaces:**
- Produces:
  - `abrirEdge(): Promise<Edge>`. `Edge = { enviar<T = unknown>(metodo: string, params?: object): Promise<T>; ao(evento: string, ouvinte: (p) => void): () => void; fechar(): Promise<void> }`.
    - Sobe `msedge.exe` (caminho padrão `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`, sobreposto por `EDGE_PATH`) com `--headless=new --remote-debugging-port=9333 --remote-allow-origins=http://127.0.0.1:9333 --user-data-dir=<pasta temporária> --no-first-run --no-default-browser-check --hide-scrollbars about:blank`.
    - **Sem `--no-proxy-server`**: a PSI proíbe contornar o proxy, e o Chromium já não passa localhost pelo proxy.
    - Conecta no alvo `page` pelo `WebSocket` global do Node. `fechar()` encerra o navegador e apaga o perfil num `finally`.
  - `capturarPng(edge: Edge, o: { url: string; largura: number; tema: 'claro' | 'escuro'; impressao?: boolean; modo?: 'pagina' | 'rolado'; armazenamento?: Record<string, string>; cookie?: { nome: string; valor: string } }): Promise<{ png: Buffer; erros: string[]; rolagemLateral: boolean; contraste: string[] }>`
    - `contraste`: textos abaixo do AA contra o fundo efetivo. Não é medido no modo rolado nem na impressão.
    - `armazenamento`: gravado por `Page.addScriptToEvaluateOnNewDocument` depois de limpar o `localStorage` da origem.
    - O erro de rede do próprio documento navegado não conta.
  - `renderizarSvg(edge: Edge, svg: string, tamanho: number): Promise<Buffer>` (fundo transparente; usado na Tarefa 2)
  - `planoDeCapturas(tarefa: string): Captura[]`. `Captura = { nome; caminho; largura: 1526 | 390 | 794; tema: 'claro' | 'escuro'; logado: boolean; impressao: boolean; modo: 'pagina' | 'rolado'; armazenamento?: Record<string, string>; arquivo: string }`

- [ ] **Step 1: Criar a branch**

Run: `git switch -c feat/ascent-padrao-visto`
Expected: `Switched to a new branch 'feat/ascent-padrao-visto'`

- [ ] **Step 2: Escrever o teste do plano de capturas**

`tests/plano-capturas.test.ts`, importando `planoDeCapturas` de `../scripts/plano-capturas`:
- `planoDeCapturas('1.18')` tem **51** itens:
  - 36 de página inteira: 9 telas (`painel /`, `linhagem /linhagem`, `pendencias /pendencias`, `tarefa /tarefa/1.18`, `retrabalho /tarefa/RETRABALHO`, `importar /importar`, `gestao /gestao`, `inexistente /tarefa/__inexistente__`, `login /login`) × larguras `1526` e `390` × temas `claro` e `escuro`;
  - 2 de impressão (`pendencias`, `tarefa`) em `794`/claro;
  - 10 roladas (`painel`, `linhagem`, `pendencias`, `tarefa`, `retrabalho` × 1526 e 390, claro);
  - 2 `-salvo-escuro` (`painel` 1526 e 390, sistema claro, `ascent.tema=escuro`);
  - 1 `-barra-recolhida` (`painel` 1526, `ascent.barra-recolhida=1`).
- Todo item de `login` tem `logado: false`; todos os outros, `logado: true`.
- `arquivo` segue `${nome}-${largura}-${tema}${sufixo}.png` (sufixos `-impressao`, `-rolado`, `-salvo-escuro`, `-barra-recolhida`) e não se repete.
- `planoDeCapturas('1/2')` gera o caminho `/tarefa/1%2F2` (`encodeURIComponent`).

- [ ] **Step 3: Rodar e ver falhar**

Run: `npx vitest run tests/plano-capturas.test.ts`
Expected: FAIL (`Cannot find module '../scripts/plano-capturas'`)

- [ ] **Step 4: Implementar `planoDeCapturas` em `scripts/plano-capturas.ts`**

Módulo puro, sem efeitos colaterais.

- [ ] **Step 5: Rodar e ver passar**

Run: `npx vitest run tests/plano-capturas.test.ts`
Expected: PASS

- [ ] **Step 6: Implementar `scripts/edge-cdp.ts` e `scripts/capturar-telas.ts`**

`capturarPng`, nesta ordem:
1. `Network.enable`, `Page.enable`, `Runtime.enable`, `Log.enable`; acumular em `erros` o texto de `Runtime.exceptionThrown`, `Runtime.consoleAPICalled` do tipo `error` e `Log.entryAdded` de nível `error`.
2. `Network.clearBrowserCookies`; se houver `cookie`, `Network.setCookie({ name, value, domain: 'localhost', path: '/' })`.
3. `Emulation.setDeviceMetricsOverride({ width: largura, height: 900, deviceScaleFactor: 1, mobile: largura < 600 })` e `Emulation.setEmulatedMedia({ media: impressao ? 'print' : '', features: [{ name: 'prefers-color-scheme', value: tema === 'escuro' ? 'dark' : 'light' }] })`.
4. `Page.navigate`, esperar `Page.loadEventFired` e mais 1500 ms (fontes e hidratação).
5. `rolagemLateral` = `Runtime.evaluate('document.documentElement.scrollWidth > innerWidth')`.
6. Altura total por `Page.getLayoutMetrics().cssContentSize.height` (teto de 8000), aplicar no `setDeviceMetricsOverride` e `Page.captureScreenshot({ format: 'png' })`.

`capturar-telas.ts` (CLI `npm run capturas -- <etapa>`):
- exige o servidor de desenvolvimento em `http://localhost:3000` e aborta se o `name` de `/manifest.webmanifest` não contiver `Saldo` ou `Ascent`;
- assina o cookie com `criarSessao(segredo, Date.now() - (DURACAO_S - 3600) * 1000)` (vence em 1 hora) e `COOKIE` de `src/lib/sessao.ts`, sem nunca imprimir o valor;
- pega o primeiro `codTarefa` (por `ordem`) da carga ativa com um `PrismaClient` próprio, só leitura (o `db.ts` usa o `cache()` do React, que não existe fora do Next);
- confere se o `<head>` de `/login` e de `/` contém `ascent.tema`;
- grava os PNGs em `design/ascent-verificacao/<etapa>/`;
- imprime uma tabela `arquivo | erros | abaixo do AA | rolagem lateral`, com os detalhes logo abaixo.

Scripts no `package.json`: `"capturas": "tsx --env-file=.env scripts/capturar-telas.ts"` e `"icones": "tsx scripts/gerar-icones.ts"` (o arquivo vem na Tarefa 2).

- [ ] **Step 7: Linha de base**

Run: `npm run dev` (em segundo plano) e depois `npm run capturas -- 00-antes`
Expected: 51 PNGs em `design/ascent-verificacao/00-antes/` e a tabela impressa. Abra `painel-1526-claro.png` e `gestao-390-claro.png` para confirmar que são as telas atuais com dados. Anote, para comparar depois, quais telas já têm rolagem lateral ou erro de console antes de qualquer mudança.

- [ ] **Step 8: Verificação completa e commit**

Run: `npm test && npm run build && npm run lint`
Expected: 4 arquivos de teste antigos + `plano-capturas` passam; build e lint sem erro.

```bash
git add scripts/edge-cdp.ts scripts/plano-capturas.ts scripts/capturar-telas.ts tests/plano-capturas.test.ts package.json docs/superpowers/specs/2026-11-16-ascent-padrao-visto-design.md docs/superpowers/plans/2026-11-16-ascent-padrao-visto.md
git commit -m "chore: ferramenta de capturas no Edge e design do Ascent"
```

---

### Task 1: Fundação Tailwind, tokens do Visto, fontes e CSS antigo isolado

**Files:**
- Modify: `package.json`, `package-lock.json` (dependências da seção Global Constraints)
- Create: `tailwind.config.js` (cópia do Visto), `postcss.config.mjs`
- Create: `src/app/legado.css` (todo o `globals.css` de hoje, dentro de `.legado { … }`)
- Modify: `src/app/globals.css` (passa a ser o `src/index.css` do Visto)
- Modify: `src/app/layout.tsx`

**Interfaces:**
- Produces: classes Tailwind do Visto disponíveis em todo `src/**/*.{ts,tsx}`; classe `.legado`, que reproduz o visual antigo só dentro dela.

- [ ] **Step 1: Instalar as dependências**

Run: `npm install -D tailwindcss@^3.4.19 postcss@^8.5 autoprefixer@^10.5` e `npm install clsx@^2.1.1 lucide-react@^1.24.0 @fontsource/barlow@^5.3.0 @fontsource/jetbrains-mono@^5.3.0`
Expected: instalação sem erro.

- [ ] **Step 2: Configs**

- `tailwind.config.js`: copiado do Visto, com `content: ['./src/**/*.{ts,tsx}']`. Sem as cores `tinta`, `mesa` e `marca-fundo`. As `keyframes`/`animation` ficam (o `Carregando` e o `Button` não as usam, mas a regra é cópia; a Tarefa 12 tira o que sobrar sem uso). Cabeçalho de origem com os desvios.
- `postcss.config.mjs`: `{ plugins: { 'tailwindcss/nesting': {}, tailwindcss: {}, autoprefixer: {} } }`. O `nesting` é temporário, só para o `legado.css`, e sai na Tarefa 12.

- [ ] **Step 3: CSS**

- `src/app/globals.css` = `src/index.css` do Visto, sem os tokens excluídos, mais duas regras do Ascent no fim (usadas pela marca na Tarefa 2):
  ```css
  :root[data-tema='escuro'] .so-tema-claro { display: none; }
  :root:not([data-tema='escuro']) .so-tema-escuro { display: none; }
  ```
- `src/app/legado.css`:
  - os blocos `:root{…}` (as variáveis `--delp-*`) e `@keyframes gira` ficam **fora** do `.legado`;
  - as regras de `body` viram regras do próprio `.legado`; `html,body{margin:0}` sai (o preflight já faz);
  - todo o resto entra dentro de `.legado { … }`, inclusive os `@media`;
  - acrescenta o que o preflight do Tailwind apaga e as telas antigas usam: `.passos{list-style:decimal}` e `.erro ul{list-style:disc}`.

- [ ] **Step 4: `layout.tsx`**

- Importa os pesos do `@fontsource` (`400/500/600/700` da Barlow e `400/500/600` da JetBrains Mono), depois `./globals.css` e `./legado.css`. Sai o `next/font/google` e a classe `barlow.variable`.
- Envolve `children` em `<div className="legado">` no `body`. É provisório: a Tarefa 4 leva o invólucro para dentro de cada tela.
- No `legado.css`, troca `var(--font-barlow)` por `"Barlow"` na pilha de fontes.

- [ ] **Step 5: Verificação**

Run: `npm test && npm run build && npm run lint`, depois `npm run capturas -- 01-fundacao`
Expected: tudo verde. As **9 telas** em 1526 e 390 claro iguais às de `00-antes`, comparadas lado a lado (inclusive Atualizar, com os passos numerados, Login e 404). A fonte continua Barlow, sem diferença de layout. Nenhum erro de console novo e nenhum texto novo abaixo do AA.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tailwind.config.js postcss.config.mjs src/app/globals.css src/app/legado.css src/app/layout.tsx
git commit -m "feat: base Tailwind e tokens do Visto, com o CSS antigo isolado"
```

---

### Task 2: Marca Ascent, ícones, nome e acesso às artes sem sessão

**Files:**
- Create: `public/images/ascent-logo.svg`, `public/images/ascent-logo-negativo.svg` (cópias exatas de Downloads)
- Create: `public/icons/ascent-icone.svg` (cópia exata), `public/images/ascent-simbolo.svg`, `public/images/ascent-simbolo-negativo.svg`
- Create: `public/icons/fonte/ascent-icone-maskable.svg`, `public/icons/fonte/ascent-icone-quadrado.svg` (fontes dos PNGs)
- Create: `scripts/gerar-icones.ts`; regenerar `public/icons/icone-192.png`, `icone-512.png`, `apple-touch-icon.png`; criar `public/icons/icone-maskable-512.png`
- Create: `src/components/marca/LogoAscent.tsx`
- Modify: `src/app/layout.tsx` (metadata, viewport), `src/app/manifest.ts`, `src/middleware.ts`
- Test: `tests/manifest.test.ts`

**Interfaces:**
- Consumes: `renderizarSvg`, `abrirEdge` (Tarefa 0); `.so-tema-claro`/`.so-tema-escuro` (Tarefa 1)
- Produces: `LogoAscent({ tom?: 'claro' | 'escuro'; className?: string })` (padrão `escuro`: arte para fundo claro que vira negativa no tema escuro; `claro`: sempre a negativa, para fundo escuro) e `SimboloAscent({ className?: string })`, com a mesma troca por tema. As duas renderizam **as duas** `<img>` com `.so-tema-claro`/`.so-tema-escuro`. Assim não há troca de `src` na hidratação. `alt="Ascent"` só na visível ao leitor de tela; a outra leva `alt=""` e `aria-hidden`.

- [ ] **Step 1: Teste do manifest**

`tests/manifest.test.ts`: `manifest()` de `src/app/manifest.ts` tem `name === 'Ascent'`, `short_name === 'Ascent'`, `start_url === '/gestao'`, `background_color === '#F5F5F5'`, `theme_color === '#FFFFFF'`, e `icons` contém `{ src: '/icons/icone-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }` e os de 192 e 512 sem `purpose`. Também confere que `config.matcher[0]` de `src/middleware.ts` contém `images/`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/manifest.test.ts`
Expected: FAIL (`name` é `Saldo PCP · Delp`)

- [ ] **Step 3: Artes derivadas (valores fixos)**

Os paths dos triângulos e da base saem iguais do `ascent-logo.svg` (os três `<path>` e o `<rect x="-20" y="-20" width="1080" height="40" rx="20">`), sem o texto e sem os metadados.
- `ascent-simbolo.svg`: `viewBox="-42 -914 1124 954" width="1124" height="954"`, base `#000000`.
- `ascent-simbolo-negativo.svg`: igual, base `#FFFFFF`.
- `ascent-icone-maskable.svg`: `viewBox="-370 -1327 1780 1780"`, fundo `<rect x="-370" y="-1327" width="1780" height="1780" fill="#EAE5DF"/>` sem `rx`, base `#000000`. O desenho cabe no círculo de 40% da zona segura.
- `ascent-icone-quadrado.svg`: o `ascent-icone.svg` com o `rect` de fundo sem `rx` (o iOS arredonda sozinho).

- [ ] **Step 4: `scripts/gerar-icones.ts` e geração**

`ascent-icone.svg` → `icone-192.png` (192) e `icone-512.png` (512); `fonte/ascent-icone-maskable.svg` → `icone-maskable-512.png` (512); `fonte/ascent-icone-quadrado.svg` → `apple-touch-icon.png` (180).

Run: `npm run icones`
Expected: 4 PNGs reescritos ou criados. Abra o `icone-512.png` e o `icone-maskable-512.png` para conferir a arte.

- [ ] **Step 5: Nome e metadados**

- `layout.tsx`: `title: { default: 'Ascent', template: '%s · Ascent' }`, `description: 'Acompanhamento da subida de saldo para o PCP'`, `appleWebApp.title: 'Ascent'`, `icons: { icon: '/icons/ascent-icone.svg', apple: '/icons/apple-touch-icon.png' }`. No viewport, `themeColor` passa a `[{ media: '(prefers-color-scheme: dark)', color: '#1E1E1E' }, { media: '(prefers-color-scheme: light)', color: '#FFFFFF' }]`.
- `manifest.ts`: os valores do teste, mais `description: 'Acompanhamento gerencial da subida de saldo'`.
- `middleware.ts`: acrescenta `images/` à lista de exceções do `matcher`.
- `LogoAscent.tsx`: as duas funções da seção Interfaces, com cabeçalho de origem (`marca/LogoVisto.tsx`) e o desvio "duas imagens trocadas por CSS em vez de `useTemaEfetivo`, por causa da renderização no servidor".

- [ ] **Step 6: Rodar o teste**

Run: `npx vitest run tests/manifest.test.ts`
Expected: PASS

- [ ] **Step 7: Verificação**

Run: `npm test && npm run build && npm run lint`, depois `npm run capturas -- 02-marca`
Expected: verde. A aba mostra "Ascent" (confira o `<title>` na captura do Login ou por `Runtime.evaluate('document.title')`). Nenhum erro de console de recurso 404 nas capturas.

- [ ] **Step 8: Commit**

```bash
git add public/images public/icons scripts/gerar-icones.ts src/components/marca/LogoAscent.tsx src/app/layout.tsx src/app/manifest.ts src/middleware.ts tests/manifest.test.ts
git commit -m "feat: marca Ascent, ícones do app e nome do sistema"
```

---

### Task 3: Peças de interface do Visto e catálogo de cores

**Files:**
- Create (cópias com cabeçalho): `src/components/ui/{Button,Badge,Card,Campo,Segmentado,TileIndicador}.tsx`, `src/components/layout/{Painel,EstadoVazio,Carregando}.tsx`, `src/components/layout/folha.ts`, `src/lib/indicador-tendencia.ts`, `src/lib/use-largura-elemento.ts`, `src/lib/use-prefere-menos-movimento.ts`
- Create: `tests/indicador-tendencia.test.ts` (cópia do Visto, só com o import ajustado)
- Create: `src/lib/cores.ts`, `tests/cores.test.ts`
- Create: `docs/visto-desvios.md`

**Interfaces:**
- Produces:
  - Peças com a API do Visto, mais as extensões aditivas:
    - `Painel`: `acao?: { rotulo: string; onClick?: () => void; href?: string }` (com `href`, `next/link`) e `apoio?: ReactNode`;
    - `TileIndicador`: `children?: ReactNode` (entre a linha do valor e o `detalhe`) e `variacaoTexto?: { texto: string; sentido: -1 | 0 | 1; subirEhBom?: boolean }`. Quando presente, substitui a variação calculada, com a mesma seta e a mesma regra de cor.
  - Desvios de 44px: botões do `Segmentado` com `min-h-11`, `CLASSE_CAMPO` com `min-h-11`, link de `acao` do `Painel` com `min-h-11`.
  - Desvio de renderização no servidor: o `usePrefereMenosMovimento` do Visto lê `window` no estado inicial, o que quebra a página no servidor. No Ascent ele começa em `false` e lê o valor num efeito. Só é copiado se algum componente usar.
  - `"use client"` no `folha.ts` (o `createContext` não roda em componente de servidor) e em toda peça que usa `useNaFolha`, hook ou evento: `Card`, `Painel`, `TileIndicador`, `Segmentado` e os dois hooks. Como peças de cliente, recebem `children`/`ReactNode` vindos das páginas de servidor normalmente.
  - `src/lib/cores.ts`:
    - `ESCALA_VERMELHOS: Record<1|2|3|4|5|6, string>` (`'rgb(var(--vermelho-N))'`);
    - `DEGRAU = { avanco: 4, saldo: 5, fabricacao: 3, concluida: 2, andamento: 4, semAvanco: 6, linhaEvolucao: 4, pontoAtual: 6 } as const`;
    - `COR_ASCENT: Record<keyof typeof DEGRAU, string>` (via `ESCALA_VERMELHOS`) mais `grade: 'rgb(var(--grade))'`;
    - `COM_LEGENDA_ESCRITA: ReadonlySet<keyof typeof DEGRAU>` (os degraus 1–2 permitidos porque o rótulo vai escrito ao lado: `concluida`);
    - `SELO_TOM = { danger: 'text-delp-red', success: 'text-success-forte', warning: 'text-warning-forte', neutro: 'text-txt-muted' } as const`;
    - `TOM_DA_CLASSE: Record<'ok' | 'parcial' | 'pend' | 'neutro', BadgeTone>` = `ok→success`, `parcial→warning`, `pend→danger`, `neutro→neutral`.

- [ ] **Step 1: Testes de cores**

`tests/cores.test.ts`:
- `Math.abs(DEGRAU.saldo - DEGRAU.fabricacao) >= 2` (degraus vizinhos não entram no mesmo gráfico);
- todo `DEGRAU` fora de `COM_LEGENDA_ESCRITA` é `>= 3`;
- `COR_ASCENT.saldo === 'rgb(var(--vermelho-5))'` e `COR_ASCENT.fabricacao === 'rgb(var(--vermelho-3))'`;
- `TOM_DA_CLASSE[rotuloMaterial(0, 1).classe] === 'success'`, `[rotuloMaterial(1, 1).classe] === 'danger'` e `[rotuloMaterial(1, 2).classe] === 'warning'` (`rotuloMaterial` de `src/lib/regras.ts`).

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/cores.test.ts tests/indicador-tendencia.test.ts`
Expected: FAIL (módulos inexistentes)

- [ ] **Step 3: Copiar as peças e escrever `cores.ts`**

Cópias do Visto com cabeçalho, extensões e desvios da seção Interfaces. `docs/visto-desvios.md` lista cada desvio: arquivo, o que mudou e por quê.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/cores.test.ts tests/indicador-tendencia.test.ts`
Expected: PASS

- [ ] **Step 5: Verificação e commit**

Run: `npm test && npm run build && npm run lint`
Expected: verde. Ainda não há uso nas telas, então as capturas não mudam e não são refeitas.

```bash
git add src/components/ui src/components/layout src/lib/cores.ts src/lib/indicador-tendencia.ts src/lib/use-largura-elemento.ts src/lib/use-prefere-menos-movimento.ts tests/cores.test.ts tests/indicador-tendencia.test.ts docs/visto-desvios.md
git commit -m "feat: peças de interface do Visto e catálogo de cores do Ascent"
```

---

### Task 4: Moldura (barra lateral, topo, tema) e grupo de rotas

**Files:**
- Create (cópias com cabeçalho): `src/lib/tema.ts`, `src/lib/barra-recolhida.ts`, `src/components/layout/{AppShell,Sidebar,Topbar,BotaoTema}.tsx`, `src/components/layout/barra/{MarcaBarra,ItemBarra,RotuloSecao}.tsx`
- Create: `src/lib/tema-script.ts`, `src/lib/navegacao.ts`, `src/lib/moldura.ts`, `src/components/layout/SeletorTema.tsx`, `src/components/layout/IniciarTema.tsx`
- Create: `tests/tema.test.ts` (cópia do Visto, com a chave `ascent.tema`), `tests/tema-script.test.ts`, `tests/navegacao.test.ts`
- Create: `src/app/(app)/layout.tsx`
- Move (`git mv`): `src/app/page.tsx`, `linhagem/`, `pendencias/`, `tarefa/`, `importar/`, `gestao/` → `src/app/(app)/…`
- Modify: as 6 páginas, inclusive os ramos "sem carga". Sai `Topo`/`Rodape`; `<main className="in">` vira `<div className="legado"><div className="in pagina">`; na Gestão saem o `g-topo` e o `<main className="g-main">`, que vira `div`, para não haver `main` dentro de `main`.
- Modify: `src/app/login/page.tsx` e `src/app/not-found.tsx` (envolvidos em `.legado` até a Tarefa 11), `src/app/legado.css` (`main.in` vira `.in.pagina`; `.fixo{top:4rem}`, para parar abaixo do topo de 64px), `src/components/SeletorProjeto.tsx` (visual do Visto), `src/app/layout.tsx` (script do tema, `suppressHydrationWarning`, sai o invólucro `.legado`)
- Delete: `src/components/Topo.tsx`

**Interfaces:**
- Consumes: `LogoAscent`, `SimboloAscent` (Tarefa 2); `Button`, `Badge` (Tarefa 3)
- Produces:
  - `tema.ts` com a API do Visto (`Tema`, `CHAVE_TEMA = 'ascent.tema'`, `TEMAS`, `definirTema`, `lerTema`, `iniciarTema`, `useTema`, `useTemaEfetivo`, `temaDoSistema`). Desvio: o estado inicial dos hooks é `'sistema'`/`'claro'` e o valor real entra no efeito, para a hidratação bater com o servidor.
  - `barra-recolhida.ts` com a API do Visto (`useBarraRecolhida`, `alternarBarraRecolhida`, `definirBarraRecolhida`), chave `ascent.barra-recolhida`, com o mesmo desvio de estado inicial (`false`).
  - `SCRIPT_TEMA: string` em `tema-script.ts`: o script inline do `index.html` do Visto, com `CHAVE_TEMA`.
  - `navegacao.ts`:
    - `interface ItemMenu { para: string; rotulo: string; icone: LucideIcon; fim?: boolean; filhos?: string[] }`;
    - `GRUPOS_MENU: { titulo: string; itens: ItemMenu[] }[]`: Acompanhamento = Painel `/` (`fim`, `filhos: ['/tarefa']`), Linhagem `/linhagem`, Pendências `/pendencias`, Gestão `/gestao`; Dados = Atualizar `/importar`;
    - `estaAtivo(item: ItemMenu, pathname: string): boolean`;
    - `trilhaDaRota(pathname: string): { rotulo: string; para?: string }[]`.
  - `moldura.ts` (só servidor): `dadosDaMoldura(): Promise<{ projetos: ProjetoOpcao[]; pendentes: number; arquivo: string | null }>`, com a mesma consulta que o `Topo` fazia.
  - `AppShell({ projetos, selos, arquivo, children })`, com `selos: Partial<Record<string, number>>` indexado por `para`: `{ '/pendencias': pendentes > 0 ? pendentes : undefined }`, porque o `ItemBarra` mostraria "0".
  - Defasagem aceita: o layout `(app)` não se refaz na navegação por `<Link>`, então o seletor ("atualizado <data>") e o selo só se atualizam ao recarregar a página ou depois de gravar uma carga (`router.refresh()`, Tarefa 9). Rodapé no fim do `main`: `Delp · Divulgação interna · Fonte: <arquivo>` (ou `Fonte: planilha de saldo`), `text-xs text-txt-muted`.
  - `Sidebar({ open, onClose, selos })`, `Topbar({ onOpenMenu, menuButtonRef, projetos })`, `SeletorTema({ recolhida })`, `BotaoTema()`.

- [ ] **Step 1: Testes**

`tests/navegacao.test.ts`:
- `trilhaDaRota('/')` → `[{ rotulo: 'Painel' }]`; `('/linhagem')` → `[{ rotulo: 'Linhagem' }]`; `('/importar')` → `[{ rotulo: 'Atualizar' }]`;
- `('/tarefa/1.18')` → `[{ rotulo: 'Painel', para: '/' }, { rotulo: 'Tarefa 1.18' }]`; `('/tarefa/1%2F2')` → último `{ rotulo: 'Tarefa 1/2' }`;
- `('/qualquer')` → `[]`;
- `estaAtivo(painel, '/')` e `estaAtivo(painel, '/tarefa/1.18')` são `true`; `estaAtivo(painel, '/linhagem')` é `false`; `estaAtivo(linhagem, '/linhagem')` é `true`.

`tests/tema-script.test.ts` (executa `new Function(SCRIPT_TEMA)` com `localStorage`, `matchMedia` e `document.documentElement.setAttribute` falsos):
- salvo `escuro` → `data-tema="escuro"`;
- nada salvo e sistema escuro → `escuro`;
- nada salvo e sistema claro → `claro`;
- `localStorage.getItem` lança erro → `claro`;
- o texto contém `'ascent.tema'`.

`tests/tema.test.ts`: o do Visto, com o import e a chave ajustados.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run tests/navegacao.test.ts tests/tema-script.test.ts tests/tema.test.ts`
Expected: FAIL (módulos inexistentes)

- [ ] **Step 3: Libs**

Implementar `navegacao.ts`, `tema-script.ts`, `moldura.ts` e as cópias `tema.ts` e `barra-recolhida.ts`. Os ícones de cada item são escolha do construtor (`lucide-react`).

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run tests/navegacao.test.ts tests/tema-script.test.ts tests/tema.test.ts`
Expected: PASS

- [ ] **Step 5: Moldura e rotas**

- Peças copiadas do Visto, com `NavLink`/`useLocation` trocados por `next/link` + `usePathname`. O `Sidebar` lê `GRUPOS_MENU`, a `MarcaBarra` mostra `LogoAscent` com o subtítulo `Subida de saldo`, e o símbolo aparece com a barra recolhida.
- `SeletorTema` no pé da barra: rótulo "Tema" e o grupo `role="radiogroup"` do menu da conta do Visto, com as três opções de `TEMAS` e cada botão com `min-h-11`; escondido com a barra recolhida no desktop.
  - A opção ativa usa `bg-grad-delp text-white`, e não `bg-delp-red`: no escuro o `--delp-red` clareia e o branco por cima cai para ~3:1. Desvio anotado.
- `LogoAscent`/`SimboloAscent`: `alt="Ascent"` nas **duas** imagens; a que está com `display:none` já sai da árvore de acessibilidade.
- `Topbar`: casinha com o texto `Ascent` levando a `/` e a trilha de `trilhaDaRota`; à direita, `SeletorProjeto`, `BotaoTema` e o `Sair` (`form` POST `/api/sair`, `Button` ghost).
- `print:hidden` no topo e na barra; `print:!pl-0` no conteúdo, porque o `shell:pl-[264px]` ganharia de um `print:pl-0` sem `!`.
- `(app)/layout.tsx` chama `dadosDaMoldura()` e monta o `AppShell`. `layout.tsx` raiz: `<html lang="pt-BR" suppressHydrationWarning>`, `<script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />` no `<head>`, e `<IniciarTema />` no `body`. É um componente cliente mínimo (`src/components/layout/IniciarTema.tsx`) que chama `iniciarTema()` num efeito, como o `main.tsx` do Visto, e vale também para o Login e a 404.
- Cada página: sai `Topo`/`Rodape`, e o conteúdo vai para `<div className="legado …">`. A Gestão perde o próprio cabeçalho (`g-topo`), porque a moldura já tem o caminho para o Painel e o Sair.

- [ ] **Step 6: Verificação**

Run: `npm test && npm run build && npm run lint`, depois `npm run capturas -- 04-moldura`
Expected:
- verde;
- em todas as capturas logadas: a barra lateral com a logo Ascent, a trilha certa, o seletor de projeto, o botão de tema e o Sair; o conteúdo antigo dentro, com a mesma aparência de `00-antes` (largura, margens e espaço entre seções intactos);
- `login-*` e `inexistente-*` iguais a `00-antes`;
- nas `-rolado`, os blocos parados de hoje (`.fixo`) aparecem **logo abaixo** do topo, sem ficar escondidos debaixo dele;
- **zero** erros de console com `Hydration` ou `did not match`, inclusive em `-salvo-escuro` e `-barra-recolhida`;
- "Script do tema no `<head>`: /login sim · / sim"; `painel-*-claro-salvo-escuro` com a moldura escura; `painel-1526-claro-barra-recolhida` com a barra de 72px;
- nenhum texto da moldura abaixo do AA nos dois temas (o seletor de tema e o item ativo incluídos);
- em 390px, a moldura sem rolagem lateral (o conteúdo antigo pode ter, se já tinha em `00-antes`);
- à mão, no navegador em 390px: a gaveta abre, fecha no Esc e devolve o foco ao botão.

- [ ] **Step 7: Commit**

```bash
git add -A src tests
git commit -m "feat: moldura do Visto com barra lateral, trilha e tema claro e escuro"
```

---

### Task 5: Painel e etiquetas de situação

**Files:**
- Modify: `src/app/(app)/page.tsx`, `src/components/ListaTarefas.tsx`, `src/components/Etiquetas.tsx`

**Interfaces:**
- Consumes: `TileIndicador` (com `children`), `Painel` (`apoio` como `ReactNode`, `acao.href`), `Badge`, `Segmentado`, `CLASSE_CAMPO`, `EstadoVazio`, `TOM_DA_CLASSE`, `SELO_TOM`, `COR_ASCENT`
- Produces: `Etiquetas.tsx` com as mesmas exportações e props de hoje (`EtiquetaSituacao`, `EtiquetaSaldo`, `EtiquetaMaterial`, `TextoRitmo`, `Comparacao`, `Avanco`), agora em `Badge`, com as barras em `COR_ASCENT` (`avanco`, `saldo`, `fabricacao`) por `style` e o ritmo em `SELO_TOM`. As telas antigas que usam essas peças (Tarefa, Linhagem, Gestão, `Arvore`, `BuscaGestao`) passam a mostrá-las já no visual novo.
  - As classes `avanco`, `avanco-cmp`, `cmp` e `cmp-c` **continuam no markup como ganchos**, sem estilo novo, até a Tarefa 12. As regras de contexto do `legado.css` (`.lin-cod .avanco`, `.lin-filha .avanco`, `.exec-linha span`…) dependem delas para posicionar a barra nas telas antigas.

- [ ] **Step 1: Migrar**

- Sai o invólucro `.legado`. Faixa `.grade-indicadores` com 4 `TileIndicador`:
  - avanço do saldo: `pct`, com a `Comparacao` em `children` quando houver fabricação, senão a barra simples; `detalhe` "X de Y previsto";
  - códigos de tarefa: N sem avanço, com o resumo no `detalhe`;
  - execuções pendentes;
  - pendentes de baixa, com o link "ver lista" em `children`.
- `ListaTarefas` dentro de um `Painel` ("Códigos de tarefa"): busca com `CLASSE_CAMPO`, alternadores com `Segmentado`, cabeçalho de coluna na régua do Visto, códigos e números em `font-mono`, linha clicável com `min-h-11`.
- **Parados ao rolar** (pedido de 15/11): a faixa com busca e alternadores fica em `sticky top-16`, com fundo `bg-bg-2` e `z-10` (abaixo do `z-20` do topo). O cabeçalho de coluna para logo abaixo dela, com a mesma medição de hoje (`--fixo-h` do `ListaTarefas`, agora somada aos 4rem do topo).
- A nota de Retrabalho vai no `apoio` do `Painel`, com o link. O atalho "Está no celular?" passa a `shell:hidden` (aparece junto com a gaveta, abaixo de 900px; desvio anotado, porque 700px não é ponto de quebra do Visto). O vazio usa `EstadoVazio` com o link para Atualizar. Um `h1` `sr-only` com `Saldo <projeto>`.

- [ ] **Step 2: Verificação**

Run: `npm test && npm run build && npm run lint`, depois `npm run capturas -- 05-painel`
Expected: verde. Em `painel-*`: os mesmos números de `00-antes`, conferidos um a um nos 4 indicadores e nas 3 primeiras linhas; selos com texto e ponto; barras em vermelho; `painel-*-rolado` com a busca e o cabeçalho parados abaixo do topo; zero rolagem lateral em 390px; zero erros de console e zero texto abaixo do AA nos dois temas. Nas telas ainda antigas que usam as `Etiquetas` (tarefa, retrabalho, linhagem, gestão), **nada pior que `04-moldura`**: mesma rolagem lateral, mesmos erros e mesma contagem de AA.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/page.tsx" src/components/ListaTarefas.tsx src/components/Etiquetas.tsx
git commit -m "feat: Painel e etiquetas de situação no padrão do Visto"
```

---

### Task 6: Tarefa (ficha, origens, execuções e árvore)

**Files:**
- Modify: `src/app/(app)/tarefa/[cod]/page.tsx`, `src/components/{Arvore,Acoes,ControlesTarefa}.tsx`

**Interfaces:**
- Consumes: `TileIndicador` (`children` para o detalhe de RA), `Painel`, `Badge`, `Button`, `CLASSE_CAMPO`, `Etiquetas`

- [ ] **Step 1: Migrar**

- Ficha no lugar, com a volta no topo. Troca de código e ações (`ControlesTarefa`) na faixa de cima, com `print:hidden`. Título do item (`h1`) com o código em mono.
- **Parado ao rolar** (como hoje no `.fixo`): o cabeçalho da ficha (título, situação e %) fica em `sticky top-16`, com fundo `bg-bg-2` e `z-10`. A lista de execuções para logo abaixo dele, em `top: calc(4rem + var(--cab-ficha))`, com a altura do cabeçalho medida por `ResizeObserver` (o mesmo jeito do `--fixo-h` do `ListaTarefas`).
- Faixa de indicadores; "De onde vem o saldo" num `Painel`.
- "Estruturas por execução" em duas colunas a partir de `duascol`, com um fio entre elas: a lista de execuções à esquerda, `sticky` (no `top` do item acima), com altura máxima de `100dvh` menos o topo e o cabeçalho e rolagem própria; a árvore à direita, **rolando com a página**. Abaixo de `duascol`, empilha. Na impressão, a lista perde o `sticky` e a altura máxima.
- O plano de corte (etiqueta preta de hoje) vira `Badge` neutro com o número em mono e o tipo no `title`. Tocar para copiar (`Acoes`) segue igual no comportamento, com o visual de botão de linha e `min-h-11`.

- [ ] **Step 2: Verificação**

Run: `npm test && npm run build && npm run lint`, depois `npm run capturas -- 06-tarefa`
Expected: verde. Em `tarefa-*` e `retrabalho-*`: os mesmos números de `00-antes`; em `retrabalho-1526-claro-rolado` o cabeçalho da ficha e a lista de execuções parados, sem cobrir a árvore; `tarefa-794-claro-impressao.png` sem a barra, sem o topo, sem a troca de código e sem a calha de 264px; zero rolagem lateral em 390px; zero erros de console e zero texto abaixo do AA.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/tarefa" src/components/Arvore.tsx src/components/Acoes.tsx src/components/ControlesTarefa.tsx
git commit -m "feat: tela da Tarefa no padrão do Visto, com a lista de execuções parada"
```

---

### Task 7: Linhagem

**Files:**
- Modify: `src/app/(app)/linhagem/page.tsx`, `src/components/Linhagem.tsx`

- [ ] **Step 1: Migrar**

Um `Painel` por projeto. Árvore com os fios de hoje desenhados em `border-med` e as caixas em `border-subtle`. Os botões "abrir" viram `Button` ghost compacto com `min-h-11` e `aria-expanded` como hoje. Códigos e percentuais em mono; avanço com as `Etiquetas` da Tarefa 5. A busca/os controles do topo, parados hoje (`.fixo`), ficam em `sticky top-16`, com `bg-bg-2` e `z-10`.

- [ ] **Step 2: Verificação**

Run: `npm test && npm run build && npm run lint`, depois `npm run capturas -- 07-linhagem`
Expected: verde; mesma estrutura e números de `00-antes`; zero rolagem lateral em 390px; zero erros de console.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/linhagem" src/components/Linhagem.tsx
git commit -m "feat: Linhagem no padrão do Visto"
```

---

### Task 8: Pendências

**Files:**
- Modify: `src/app/(app)/pendencias/page.tsx`, `src/components/FiltrosPendencias.tsx`

- [ ] **Step 1: Migrar**

- Barra de filtros com `CLASSE_CAMPO` e `Segmentado`, e os filtros ativos como pílulas removíveis (`rounded-pill`, `min-h-11`). Filtros e filtros ativos **parados ao rolar**, como hoje: `sticky top-16`, `bg-bg-2`, `z-10`.
- Tabela num `Painel`, com o cabeçalho de coluna na régua do Visto e a ordenação com `aria-sort` igual à de hoje. Cabeçalho de grupo em `bg-bg-2`. Números em mono.
- Paginação com botões ghost; a página atual em destaque.
- `print:hidden` em filtros, filtros ativos e paginação.

- [ ] **Step 2: Verificação**

Run: `npm test && npm run build && npm run lint`, depois `npm run capturas -- 08-pendencias`
Expected: verde; mesma contagem e primeiras linhas de `00-antes`; `pendencias-*-rolado` com os filtros parados abaixo do topo; `pendencias-794-claro-impressao.png` só com a tabela; zero rolagem lateral em 390px (a tabela rola dentro do próprio bloco, não a página); zero erros de console.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/pendencias" src/components/FiltrosPendencias.tsx
git commit -m "feat: Pendências no padrão do Visto"
```

---

### Task 9: Atualizar

**Files:**
- Modify: `src/app/(app)/importar/page.tsx`, `src/components/Importador.tsx`

- [ ] **Step 1: Migrar**

Sem mudar o fluxo do worker nem a chamada a `/api/importar`:
- `Painel` com as três etapas (a atual com o fio vermelho embaixo, a feita com ponto `success`);
- área de soltar o arquivo com borda tracejada `border-med`, que fica vermelha no foco e no hover;
- resumo da carga em `Campo`s mono;
- `Button` primary "Gravar";
- erros e avisos com texto e borda nos tokens `danger`/`warning`;
- última carga e arquivo atual no apoio do bloco;
- depois de gravar com sucesso, `router.refresh()` (`next/navigation`), para a moldura (seletor de projeto e selo de Pendências) mostrar a carga nova. É a única mudança de comportamento, e existe porque a moldura agora vive no layout.

- [ ] **Step 2: Verificação**

Run: `npm test && npm run build && npm run lint`, depois `npm run capturas -- 09-atualizar`
Expected: verde; a tela mostra a última carga como em `00-antes`; zero erros de console. **Não gravar carga** na conferência: o banco é o do `.env`.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/importar" src/components/Importador.tsx
git commit -m "feat: tela Atualizar no padrão do Visto"
```

---

### Task 10: Gestão

**Files:**
- Modify: `src/app/(app)/gestao/page.tsx`, `src/components/BuscaGestao.tsx`, `src/components/GraficoEvolucao.tsx`

**Interfaces:**
- Consumes: `TileIndicador` (`variacaoTexto` para "desde ontem" / "em 7 dias", `children` para a barra), `Painel`, `CLASSE_CAMPO`, `COR_ASCENT`, `useLarguraElemento`

- [ ] **Step 1: Migrar**

- Anatomia do Dashboard do Visto: faixa `.grade-indicadores.fluida` com o avanço e os 4 indicadores; depois, a partir de `duascol`, grade de 12 colunas mais o trilho de 340px; no celular, coluna única.
- Os blocos de hoje viram `Painel`s: busca, evolução, maior atraso, situação dos códigos, por grupo. Qual vai no trilho é escolha do construtor, seguindo a regra do Visto de que bloco curto não fica sozinho numa linha.
- Gráfico de evolução: largura medida (`useLarguraElemento`, `viewBox` com a largura medida e `height` fixo igual ao de hoje); linha `COR_ASCENT.linhaEvolucao`, ponto atual `COR_ASCENT.pontoAtual`, grade `COR_ASCENT.grade`, tudo por `style`; balão com `bg-txt text-bg` (inverte nos dois temas).
- Barras de situação em `concluida`/`andamento`/`semAvanco`, sempre com o rótulo e o % escritos.
- A Gestão continua sendo o `start_url` do app instalado.

- [ ] **Step 2: Verificação**

Run: `npm test && npm run build && npm run lint`, depois `npm run capturas -- 10-gestao`
Expected: verde; os mesmos números e variações de `00-antes`; o gráfico com a mesma altura em 1526 e 390; zero rolagem lateral em 390px; zero erros de console nos dois temas.

- [ ] **Step 3: Commit**

```bash
git add "src/app/(app)/gestao" src/components/BuscaGestao.tsx src/components/GraficoEvolucao.tsx
git commit -m "feat: Gestão com a anatomia do Dashboard do Visto"
```

---

### Task 11: Login e 404

**Files:**
- Modify: `src/app/login/page.tsx`, `src/app/not-found.tsx`

**Interfaces:**
- Consumes: `LogoAscent tom="claro"`, `Button`, `CLASSE_CAMPO`, `EstadoVazio`

- [ ] **Step 1: Migrar o Login**

A anatomia do `LoginPage` do Visto, sem carrossel:
- **Lado escuro** (só desktop; o Login copia o `lg:` do Visto): fundo radial `#1E1E1E`→`#050505` com a grade sutil das cenas e os três triângulos da logo como marca d'água em `delp-red` a 5,5%, no padrão do `FaixaDaMarca`; `LogoAscent tom="claro"` com cerca de 300px no `h1`; a frase fixa; o endosso "Uma plataforma" + `delp-logo.png` invertido.
- **Painel de 480px**: filete `bg-delp-red` de 4px no topo; "Entrar"; o campo "Senha da equipe" com `CLASSE_CAMPO`; as mensagens de erro de hoje (sem configuração, senha incorreta) com `role="alert"`; `Button` primary.
- Fora do desktop: só o painel, com `h1` `sr-only` e o endosso no rodapé.
- O formulário continua `POST /api/login`, com o campo oculto `volta`.

- [ ] **Step 2: 404**

Duas, com o mesmo conteúdo: `EstadoVazio` com `SimboloAscent`, título "Não encontrado", o texto de hoje e `Button` "Voltar ao painel" (`next/link`, com o `buttonVariants.primary`).
- `src/app/(app)/not-found.tsx`: **dentro da moldura**, para o `notFound()` da Tarefa (código que não existe na carga). Cria-se este arquivo.
- `src/app/not-found.tsx`: centralizado, fora da moldura, para URL desconhecida.

O design diz "fora da moldura" no §6.1 e "dentro da moldura vazia" no §6.4; as duas valem, cada uma no seu caso.

- [ ] **Step 3: Verificação**

Run: `npm test && npm run build && npm run lint`, depois `npm run capturas -- 11-login`
Expected: verde. `login-1526-*` com a logo e as artes carregadas, sem sessão; `login-390-*` só com o painel; `inexistente-*` com a 404 nova; zero erros de console (nenhum 404 de recurso).

- [ ] **Step 4: Commit**

```bash
git add src/app/login/page.tsx src/app/not-found.tsx "src/app/(app)/not-found.tsx"
git commit -m "feat: Login e página 404 do Ascent"
```

---

### Task 12: Limpeza, guardas e documentação

**Files:**
- Delete: `src/app/legado.css`; o import dele no `layout.tsx`; o plugin `tailwindcss/nesting` do `postcss.config.mjs`
- Delete: toda peça copiada, token ou animação sem uso (conferido por busca), e `public/delp-logo.png` só se nada mais o usar (o Login usa)
- Modify: `CLAUDE.md` (título e "Padrão visual" apontando para o padrão do Visto: Tailwind, tokens, réguas, moldura, `cores.ts`, desvios), `README.md` (nome), `docs/visto-desvios.md` (completo)

- [ ] **Step 1: Guardas por busca**

Run, cada um com saída vazia esperada:
- `grep -rn "legado" src`
- `grep -rnE "(^|[^a-z-])(lg|xl|max-\[[^]]*\]|min-\[[^]]*\]):" src --include=*.ts --include=*.tsx | grep -v "src/app/login/"` (pega também `clsx(...)` e template literals)
- `grep -rnE "#[0-9A-Fa-f]{3,6}\b" src --include=*.ts --include=*.tsx`, com saída esperada **só** nas exceções declaradas em `docs/visto-desvios.md`: o `themeColor` e o `manifest` (metadados, não estilo) e a arte do Login.
- `grep -rn "Subida de Saldo ·\|Saldo PCP" src`
- `grep -rnE "\b(avanco|avanco-cmp|cmp|cmp-c)\b" src --include=*.tsx`: os ganchos da Tarefa 5 saem aqui, junto com o `legado.css`.

- [ ] **Step 2: Verificação final completa**

Run: `npm test && npm run build && npm run lint`, depois `npm run capturas -- 12-final` (com `00-antes` tirada antes, da `main`, num worktree com o próprio `.env` e `node_modules`, na porta 3000 e com o servidor da branch parado)
Expected: verde, e as 51 capturas com:
- zero rolagem lateral em todas as de 390px;
- zero erros de console e **zero texto abaixo do AA** em todas;
- "Script do tema no `<head>`: /login sim · / sim";
- cada tela comparada com `00-antes` sem perda de informação;
- as `-rolado` com os blocos parados abaixo do topo;
- as duas de impressão limpas;
- **todos** os critérios visuais das Tarefas 1 a 11 conferidos aqui, porque a conferência por tarefa foi adiada (decisão de 16/11).

- [ ] **Step 3: Commit**

```bash
git add -A src CLAUDE.md README.md docs/visto-desvios.md postcss.config.mjs tailwind.config.js public
git commit -m "chore: remove o CSS antigo e documenta o padrão do Visto no Ascent"
```

- [ ] **Step 4: Entregar**

Relatar ao responsável: a branch, os commits, o resumo das capturas (pasta local) e a lista de desvios. **Não** abrir PR, fazer push ou deploy sem pedido.
