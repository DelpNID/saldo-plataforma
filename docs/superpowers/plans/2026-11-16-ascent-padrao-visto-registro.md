# Registro de execução — Ascent no padrão do Visto

Ledger da execução do plano `2026-11-16-ascent-padrao-visto.md` (16/11/2026): o que cada tarefa entregou, as decisões tomadas no caminho (`Ruling:`, com o custo se estiverem erradas), o gate NID, a revisão final e os itens menores deixados para depois (`minor (deferred)`).

```text
# SDD ledger — plan: C:/dev/saldo-plataforma/docs/superpowers/plans/2026-11-16-ascent-padrao-visto.md
Spec: docs/superpowers/specs/2026-11-16-ascent-padrao-visto-design.md
Setup: Ruling: sem worktree; branch feat/ascent-padrao-visto no próprio repositório (Task 0 Step 1) — o .env, o node_modules e o servidor de dev (porta 3000) vivem nesta árvore e o usuário pediu execução "por aqui mesmo" — se errado, custa só a separação de pastas; a main não é tocada.
Setup: Ruling: Task 0 começa antes do resultado do red-team (gate NID); achados do gate são aplicados ao plano antes da Task 1 — pedido do usuário ("pode começar a execução") e a Task 0 não toca no app — se errado, retrabalho só na ferramenta de capturas.
Pre-flight:
- T0→T2: abrirEdge/renderizarSvg(edge, svg, tamanho) — T2 consome com a mesma assinatura. OK.
- T1→T2: .so-tema-claro/.so-tema-escuro definidas no globals.css — LogoAscent usa. OK.
- T2→T4/T11: LogoAscent({tom,className}), SimboloAscent({className}) — MarcaBarra, Login e 404 consomem. OK.
- T3→T4..T11: Button/buttonVariants, Badge(BadgeTone), Painel(acao.href, apoio ReactNode), TileIndicador(children, variacaoTexto), Segmentado, CLASSE_CAMPO, EstadoVazio, cores.ts (DEGRAU, COR_ASCENT, SELO_TOM, TOM_DA_CLASSE). OK.
- T4→T5..T11: páginas sob src/app/(app)/; AppShell fornece moldura e rodapé; páginas não renderizam Topo/Rodape. OK.
Task 0: Ruling: primeiraTarefa() usa PrismaClient direto (como scripts/carga.ts) em vez de cargaAtiva() — db.ts usa o cache() do React, que só existe dentro do Next — se errado, nenhum (só leitura).
Task 0: Ruling: Edge ganhou ao(evento, ouvinte) além de enviar/fechar — capturarPng precisa escutar loadEventFired e os erros de console — aditivo.
Task 0: BLOQUEIO de ambiente: `npm run capturas -- 00-antes` falhou: Prisma "Can't reach database server" na porta 5432; Test-NetConnection 5432 = False (DNS resolve). A rede da estação não alcança o Neon direto. Sem banco, a conferência visual (linha de base e etapas) não roda aqui. Aguardando decisão do usuário.
Task 0: Ruling (decisão do usuário em 16/11): conferência visual adiada para o fim — cada tarefa commita com npm test + build + lint como evidência; as capturas 00-antes (da main, em worktree/porta separada) e 12-final rodam juntas quando a estação estiver numa rede que alcance o banco — custo: regressão visual só aparece no fim.
Gate NID (red-team, 16/11): GO com correções — 12 achados aplicados ao texto do plano (proxy não contornado, cookie de 1 h, perfil apagado, modos rolado/armazenamento/A4, contraste AA no relatório, legado .in.pagina, .fixo top 4rem, ganchos avanco/cmp, 404 em dois níveis, guardas novas).
Gate: Ruling: item 10 (selo zero e layout que não se refaz) — selo só com pendentes > 0; defasagem do seletor/selo aceita, com router.refresh() depois de gravar carga (T9) — se errado, data "atualizado" velha até recarregar.
Gate: Ruling: item 11 (corte de 700px) — "Está no celular?" passa a shell:hidden (abaixo de 900px), desvio anotado — se errado, o atalho aparece também em tablet retrato.
Gate: Ruling: item 12 (404 contraditória no design) — duas 404: (app)/not-found.tsx dentro da moldura para notFound() da Tarefa; raiz fora da moldura para URL desconhecida — o design pede as duas em lugares diferentes — custo: um arquivo a mais.
Task 0: Ruling: smoke test do Edge OK (login capturado em 390, eventos de console chegam); o servidor anterior ficou órfão na porta 3000 depois do TaskStop — encerrado por PID; plano ganhou a regra de parar o dono da porta.
Task 0: complete (commits 5f757a1..026372a, tests: npm test → [2m   Duration [22m 2.35s[2m (transform 1.15s, setup 0ms, collect 2.35s, tests 340ms, environment 15ms, prepare 2.62s)[22m)
Task 1: Ruling: no legado.css, em vez de só `.passos{list-style:decimal}` e `.erro ul{list-style:disc}`, volta todo o padrão do navegador que o preflight zera e as telas antigas usavam (a: sublinhado; h1–h6: tamanho/peso; ol/ul/menu: marcador e recuo; img/svg…: display) com `revert`, antes das regras antigas — cobre os dois casos do gate e os que ninguém listou (links "ver lista", títulos sem classe) — custo: nenhum nas telas novas (escopo .legado).
Task 1: Ruling: o `:root` antigo (variáveis --delp-*, color-scheme:light e padding de área segura no html) fica fora do .legado, como o gate pediu — o color-scheme escuro do Visto ganha por especificidade; o padding de área segura no html fica até a Tarefa 12 — custo: no iPhone, margem de área segura no topo da moldura nova até a limpeza.
Task 1: Evidência sem banco: CSS compilado conferido (.legado .card, .legado main.in, print aninhado, tokens --delp-red e tema escuro, fontes Barlow/JetBrains em .next/static/media); conferência visual adiada (decisão do usuário).
Task 1: complete (commits 026372a..8e0b3e6, tests: npm test → [2m   Duration [22m 750ms[2m (transform 324ms, setup 0ms, collect 778ms, tests 67ms, environment 1ms, prepare 855ms)[22m)
Task 2: Evidência sem banco: dev em 3001 — /login 200 com <title>Entrar · Ascent</title> e rel=icon /icons/ascent-icone.svg; sem sessão: /images/ascent-logo-negativo.svg 200, /icons/* 200, /manifest.webmanifest 200, /gestao 307 (continua exigindo sessão). PNGs dos ícones conferidos à vista (comum, maskable com margem, iOS quadrado).
Task 2: ATENÇÃO: há um `next dev` deste projeto na porta 3000 que NÃO foi iniciado por mim (PID 29464, desde 11:52, caminho "C:\dev\..."). Não mexi. Meus `npm run build` podem ter quebrado o .next dele — avisar o usuário. Meus servidores sobem na 3001.
Task 2: complete (commits 8e0b3e6..ea1f399, tests: npm test → [2m   Duration [22m 838ms[2m (transform 473ms, setup 0ms, collect 1.13s, tests 98ms, environment 2ms, prepare 1.15s)[22m)
Task 3: Ruling: use-prefere-menos-movimento NÃO copiado — nenhuma peça copiada o usa (regra "peça sem uso não fica"); o desvio de SSR fica anotado em docs/visto-desvios.md para quando vier — custo: nenhum.
Task 3: Ruling: corVariacao do TileIndicador usa text-success-forte em vez de text-success — o --success puro dá ~3:1 em 12px (anti-objetivo de AA do design) — custo: variação positiva um verde mais escuro que no Visto.
Task 3: Ruling: Button, Badge, Campo, EstadoVazio e Carregando sem "use client" (sem hook/contexto), para servirem a páginas de servidor; Card, Painel, TileIndicador, Segmentado e folha.ts com — custo: nenhum.
Task 3: complete (commits ea1f399..edd706b, tests: npm test → [2m   Duration [22m 1.95s[2m (transform 1.37s, setup 0ms, collect 3.44s, tests 329ms, environment 12ms, prepare 3.57s)[22m)
Task 4: Ruling: CHAVE_TEMA mora em tema-script.ts e o tema.ts a importa de lá (o plano punha o contrário) — o layout raiz é componente de servidor e o build recusou importar um módulo com hooks — custo: um desvio a mais no tema.ts copiado.
Task 4: Ruling: Sidebar, Topbar e AppShell reescritos com o markup/classes do Visto, mas sem a lógica de papéis/âncoras (o Ascent não tem papéis); SeloNumero copiado de SeloConversas com fundo bg-grad-delp (no escuro o --delp-red + branco dá ~3:1) — custo: os três arquivos divergem mais do Visto que uma cópia literal.
Task 4: Ruling: rodapé em text-txt-2, não txt-muted — o muted do Visto dá ~4,2:1 sobre o bg-2 (abaixo do AA) — custo: nenhum.
Task 4: Ruling: MarcaBarra com o lockup em 132px (Visto: 104px) — a arte do Ascent é 4:1, mais baixa que a do Visto; mesma altura de letra — custo: verificar na conferência visual final.
Task 4: Ruling: src/app/tarefa travada pelo Windows (provável editor ou o dev da porta 3000 que não é meu); movido só o page.tsx, a pasta vazia saiu depois — custo: nenhum.
Task 4: Evidência sem banco: npm test 149, build e lint verdes (rotas iguais); /login com o script do tema no <head>; Login no Edge com tema escuro do sistema e salvo: 0 erros de console (sem hidratação), 0 abaixo do AA. As telas logadas dependem do banco (layout chama dadosDaMoldura): conferência visual da moldura adiada para o fim.
Task 4: complete (commits edd706b..7fdc79a, tests: npm test → [2m   Duration [22m 3.19s[2m (transform 1.66s, setup 0ms, collect 5.98s, tests 638ms, environment 5ms, prepare 2.90s)[22m)
Task 5: Ruling: na ListaTarefas, a ordenação sai do aria-sort no botão (inválido em <ul>; o lint acusou) para texto sr-only ("em ordem crescente") — custo: nenhum para quem vê; leitor de tela ouve a ordem pelo nome do botão.
Task 5: Ruling: a faixa parada ao rolar inclui título + apoio + filtros (como o .fixo de hoje), dentro do próprio cartão da lista; o cabeçalho de coluna para em calc(4rem + --fixo-h) — custo: verificar na conferência visual final (-rolado).
Task 5: Ruling: o centro de custo (antes no sobretítulo da página) foi para o detalhe do indicador de avanço, já que não há cabeçalho de página — custo: um pouco menos visível.
Task 5: Ruling: Etiquetas ganhou `Barra` exportada (trilha + preenchimento na cor de gráfico) para o indicador sem fabricação; as classes antigas ficam como ganchos (inclui cmp-l/cmp-n/cmp-v/barra/ritmo, além das do plano) — custo: limpeza na Tarefa 12.
Task 5: docs/visto-desvios.md recebeu os desvios das Tarefas 4 e 5 (faltavam no commit da 4).
Task 5: complete (commits 7fdc79a..4d0ca54, tests: npm test → [2m   Duration [22m 4.06s[2m (transform 3.61s, setup 0ms, collect 8.40s, tests 767ms, environment 6ms, prepare 5.88s)[22m)
Task 6: Ruling: cabeçalho da ficha parado num componente cliente próprio (FichaParada) que publica --cab-ficha no pai; a lista de execuções para em calc(4rem + --cab-ficha + .75rem) a partir de duascol, com altura máxima de 100dvh menos isso; abaixo de duascol fica com max-h 420px (como hoje) — custo: verificar em retrabalho-*-rolado na conferência final.
Task 6: Ruling: "Expandir/Recolher tudo" acha os nós por details[data-no] (antes .arvore details.no) — a classe some com o legado — custo: nenhum.
Task 6: Ruling: alternador "Árvore da execução / Pendências do código" é o desenho do Segmentado, mas com links (a visão é endereço, com aria-current) — custo: não é o componente Segmentado em si.
Task 6: Ruling: Acoes (Copiar, Exportar, Imprimir) restilizado com as classes antigas como ganchos (copia, aviso-copia, btn sec), porque Pendências ainda está no .legado — custo: limpeza na Tarefa 12.
Task 6: complete (commits 4d0ca54..baee346, tests: npm test → [2m   Duration [22m 12.84s[2m (transform 9.88s, setup 0ms, collect 23.10s, tests 2.01s, environment 13ms, prepare 20.18s)[22m)
Task 7: Ruling: os fios da linhagem viraram pseudo-elementos before:/after: do Tailwind com a mesma geometria do CSS antigo (vertical do grupo, horizontal até o desenho, ramo de cada código e de cada filha) — custo: conferir alinhamento na captura final (linhagem-*-rolado).
Task 7: Ruling: o botão "N filhas" aberto fica em bg-txt/text-bg (o preto do antigo, que inverte no escuro) — o mesmo gesto do alternador ligado — custo: nenhum.
Task 7: Ruling: o sobretítulo "Projeto › desenho › código de tarefa › tarefas filhas" virou uma linha de apoio acima da busca (sem cabeçalho de página, regra do Visto) — custo: nenhum.
Task 7: complete (commits baee346..1d3e0f0, tests: npm test → [2m   Duration [22m 2.09s[2m (transform 1.15s, setup 0ms, collect 3.79s, tests 433ms, environment 4ms, prepare 2.63s)[22m)
Task 8: Ruling: o resumo "N componentes sem apontamento · de M pendentes" (antes no cabeçalho de página) virou linha de apoio no topo; o sobretítulo "Coluna APONTADO = 0" foi para a mesma linha — sem cabeçalho de página (regra do Visto) — custo: nenhum.
Task 8: Ruling: filtro ativo em pílula escura (bg-txt/text-bg) que fica vermelho-escuro no hover, com ícone X — o mesmo gesto do .filtro-ativo antigo, nos tokens — custo: nenhum.
Task 8: complete (commits 1d3e0f0..00e940f, tests: npm test → [2m   Duration [22m 4.01s[2m (transform 2.04s, setup 0ms, collect 6.70s, tests 602ms, environment 6ms, prepare 3.90s)[22m)
Task 9: Ruling: além do router.refresh() do plano, o botão "Atualizar a plataforma" virou o Button primary do Visto com loading (spinner próprio) — mesmo travamento de antes (travado || enviando) — custo: nenhum.
Task 9: Ruling: o fluxo (worker, conferência, /api/importar, mensagens) ficou idêntico; só o JSX e as classes mudaram — conferência sem gravar carga (banco de produção).
Task 9: complete (commits 00e940f..f555bef, tests: npm test → [2m   Duration [22m 3.32s[2m (transform 2.91s, setup 0ms, collect 7.08s, tests 754ms, environment 5ms, prepare 4.58s)[22m)
Task 10: Ruling (pedido do usuário de acompanhar pelo navegador): a partir daqui a evidência por tarefa é `npx tsc --noEmit` + `npm run lint` + `npm test`, SEM `next build` — o build apaga o .next do `next dev` do usuário na porta 3000 (tela branca: "Cannot find module './682.js'"); o `npm run build` completo roda uma vez na Tarefa 12, com aviso — custo: erro que só o build pega (CSS/Tailwind, rotas) aparece no fim ou no dev do usuário.
Task 10: Ruling: o gráfico passou a medir a largura com useLarguraElemento (o Visto) em vez do ResizeObserver próprio; antes da primeira medida usa 340px (como antes); altura fixa 200px; cores de COR_ASCENT por style — custo: nenhum.
Task 10: Ruling: Gestão com faixa .grade-indicadores.fluida de 5 TileIndicador variante "painel" e corpo [evolução, grupos] + trilho 340px [atraso, situação, maior saldo, mais pendentes] a partir de duascol — custo: conferir na captura final se algum bloco curto ficou sozinho.
Task 10: INCIDENTE: dois `next dev` na mesma pasta (o do usuário na 3000, o meu na 3001) misturaram o .next — o do usuário acusou "Could not find the module c:\...IniciarTema.tsx in the React Client Manifest" (meu servidor grava c:\ minúsculo, o dele lê C:\). Desliguei o meu (TaskStop + PID 40788, meu); pedi ao usuário Ctrl+C, apagar .next e `npm run dev`. Regra daqui em diante: nenhum servidor nem build meu enquanto o dele estiver no ar.
Task 10: complete (commits f555bef..ffcd4a7, tests: npm test → [2m   Duration [22m 10.43s[2m (transform 4.50s, setup 0ms, collect 17.28s, tests 1.14s, environment 6ms, prepare 5.72s)[22m)
Task 11: Ruling: o segundo parágrafo do Login ("O Ascent acompanha a subida de saldo de cada projeto para o PCP e a gestão: o que já subiu, o que falta e qual componente está pendente de baixa") saiu da descrição do próprio CLAUDE.md do projeto, não foi inventado; o rodapé do painel diz "Acesso só com a senha da equipe" (fato do middleware) — custo: o responsável pode querer outra redação.
Task 11: Ruling: a cena do Login usa cores fixas (#1E1E1E/#050505, grade #FFF a 3,5%) por ser arte sempre escura — exceção a declarar no visto-desvios.md na Tarefa 12.
Task 11: Ruling: as duas 404 compartilham src/components/NaoEncontrado.tsx (símbolo + aviso + Button primary) — o EstadoVazio não aceita o símbolo da marca (só ícone lucide) — custo: nenhum.
Task 11: Evidência extra: o servidor do usuário (3000) serve /login 200 com "Entrar · Ascent" e o endosso novo.
Task 11: complete (commits ffcd4a7..73ea79d, tests: npm test → [2m   Duration [22m 4.71s[2m (transform 3.57s, setup 0ms, collect 8.33s, tests 714ms, environment 5ms, prepare 6.93s)[22m)
Task 11 (ajuste a pedido do usuário, com o print do Login do Visto): painel com logo no topo, saudação pelo relógio de Brasília (saudacaoDaHora copiada do Visto + teste), "Entrar no sistema" (o Visto usa isso quando não há usuário lembrado; o Ascent não tem usuário), campo de senha com ícone e mostrar/ocultar (CampoSenha, cliente), botão Entrar do Visto (retangular, ícone), rodapé em duas linhas (sem "tentativas registradas" nem aviso de privacidade, que o Ascent não tem), cena em public/images/cena-ascent.svg (arte, cores fixas no SVG e não no TSX) e o endosso com a logo completa da Delp copiada do Visto (public/images/delp-logo.png), branca no escuro.
Task 11: Ruling: public/delp-logo.png (só o símbolo, 828x694) saiu — nada mais o usava; a exceção dele saiu do matcher do middleware — custo: nenhum.
Task 11: Diagnóstico "não consigo entrar": /api/login com a ACESSO_SENHA do .env → 303 para / com cookie; pelo formulário no Edge também entra. A senha digitada pelo usuário não é a do .env local. Depois de entrar, / dá 500 no servidor dele (banco inacessível desta rede + .next sem os estáticos: main-app.js 404).
Task 12: Ruling: animações do Visto removidas do tailwind.config (sem uso), mas os tokens de cor sem uso ficam (não geram CSS sozinhos e mantêm o mesmo conjunto do Visto) — custo: alguns tokens mortos no globals.css.
Task 12: Ruling: o build final roda num worktree temporário em vez da pasta do projeto — o `npm run dev` do usuário está no ar na 3000 e o build apagaria o .next dele — custo: nenhum (mesmo commit, mesmo node_modules por junção).
Task 12: Guardas: legado vazio; lg:/xl:/min-[/max-[ só no Login; hex só nos metadados (layout.tsx, manifest.ts) e em comentários do Badge copiado; nome antigo vazio; ganchos vazios.
Task 12: Evidência: next build completo verde num worktree temporário no commit 2941a65 (mesmas rotas; CSS final sem .legado nem animações do Visto); worktree e junção removidos, node_modules intacto. Capturas 12-final pendentes (rede sem banco).
Task 12: complete (commits 73ea79d..2941a65, tests: npm test → [2m   Duration [22m 119.92s[2m (transform 2.74s, setup 0ms, collect 89.17s, tests 524ms, environment 3ms, prepare 15.42s)[22m)
Final: revisão independente (opus) — 0 críticos, 6 importantes, 12 menores. Correções (uma rodada):
Final: fixed Important 5 (barra recolhida saltava 192px ao carregar) — tests/barra-recolhida.test.ts RED→GREEN (recolhidaPeloCookie/cookieDaBarra), suite 153/153; cookie lido no (app)/layout via src/lib/barra-cookie.ts (sem hooks).
Final: fixed Important 1 (grades em shell: quebravam entre 900 e ~1120px com a barra aberta) — ListaTarefas, Linhagem e origens da Tarefa passam a duascol:; sem harness de componente (regra do projeto), verificado por tsc/lint/suite 153/153 e leitura; conferir na captura 12-final (incluir 1100px).
Final: fixed Important 2 (Saldo × Fabricação esmagado na faixa fluida da Gestão) — indicador principal em linha própria, os 4 outros na faixa; suite 153/153.
Final: fixed Important 3 (AA) — botão Entrar em bg-grad-delp (branco sobre #CC0F10 = 5,8:1 nos dois temas); rótulos da busca da Gestão em text-txt-2; suite 153/153.
Final: fixed Important 4 (área segura do iPhone) — viewportFit "cover" removido do layout; suite 153/153.
Final: fixed Important 6 (Gestão no celular sem a data da carga) — "Atualizado em <data>" no indicador principal; suite 153/153.
Final: Ruling: correções de layout sem teste RED→GREEN — componentes React não têm harness de teste no projeto (só src/lib); verificadas por tsc, lint, suite e build — custo: regressão visual só aparece nas capturas 12-final.
Final: minor (deferred): cabeçalho da lista do Painel com gap-3 e linhas com gap-x-3.5 (colunas desalinhadas 2–6px).
Final: minor (deferred): lista do seletor de projeto começa ~15px fora da tela em 390px.
Final: minor (deferred): trilha no celular mostra "⌂ › › Tarefa" (o li do "Painel" fica, só o link some).
Final: minor (deferred): 404 da raiz diz "Esse código não existe na planilha" para endereço desconhecido.
Final: minor (deferred): selo de Pendências sempre "9+" com milhares de pendentes (cópia literal do Visto).
Final: minor (deferred): Gestão repete "Fonte: …" (página + rodapé da moldura); no celular "Maior atraso" veio depois de "por grupo".
Final: minor (deferred): hover:text-white em pendencias/page.tsx e text-white no SeletorTema (classe fixa em código do Ascent).
Final: minor (deferred): indicador-tendencia.ts (copiado com o TileIndicador) e acao.href do Painel sem uso real.
Final: minor (deferred): botão Sair só com ícone tem ~42px de largura abaixo de 640px.
Final: minor (deferred): Ctrl+C no meio das capturas deixa o perfil temporário do Edge (cookie de 1 h) no %TEMP%.
Final: Ruling (declined-to-judge do revisor): todos aceitos como fora do escopo — cinzas do Visto (decisão do usuário), seletor/selo só atualizam ao recarregar (gate item 10), altura dos blocos parados no celular no Painel/Pendências (telas de computador), themeColor segue o sistema, storage bloqueado (cópia do Visto), C2PA nas artes (design manda manter), @fontsource sem preload (design §5), visual do Login (só com render) — custo: nenhum previsto.
Final review: revisor independente (opus); 6 importantes corrigidos em eb7dd81; next build verde em worktree.
```

## Depois da revisão final (16/11, antes do Pull Request)

- Ruling: o Login fica sempre no tema claro (`data-tema="claro"` na raiz), a pedido do responsável — no Visto o painel segue o tema — custo se errado: reverter o atributo na raiz do Login.
- Ruling: a `main` recebeu dois ajustes depois que a branch saiu (3797179: "volta os blocos de antes e só acrescenta a barra da fabricação"; 745318c: "no celular o avanço desce para baixo do código"). A intenção foi levada para o novo visual em vez de descartada no merge: `Comparacao` sai; entram `BarrasSaldo`, `LinhaFabric` e `faltaFabric` (`tests/etiquetas.test.ts`); títulos voltam a "Avanço do saldo"; a coluna do avanço na Linhagem volta a 132px. O avanço abaixo do código já valia na branch abaixo de 1280px (`duascol:`), o que cobre o celular — custo se errado: no intervalo de 700 a 1279px o avanço fica embaixo do código, e não ao lado como na `main`.
