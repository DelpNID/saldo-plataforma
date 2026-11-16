# Ascent — Contexto Claude Code

**Ascent** (antes "Plataforma de Saldo"): painel online para o PCP e a gestão acompanharem a subida de saldo por projeto:
o que já subiu, o que falta e qual componente está pendente de baixa. O endereço (`saldopcpdelp.vercel.app`), o projeto
na Vercel (`subidadesaldo`) e o repositório (`saldo-plataforma`) mantiveram os nomes antigos de propósito.

## Stack
Next.js 14 (App Router) + TypeScript + Tailwind CSS 3.4 + Prisma + PostgreSQL (Neon) · deploy na Vercel · código no GitHub.

## Modo NID: Formal, com override registrado
Ciclo padrão: /nid:specify → /nid:plan → /nid:gate → /nid:implement.
O MVP foi construído em via rápida a pedido do responsável (ADR `docs/adr/20261114-1-mvp-rapido-sem-gate-formal.md`).
A partir da primeira versão publicada, toda evolução volta ao ciclo completo.

## Verificação obrigatória
Forma: vitest-playwright
- `npm test` — regras de negócio (status de apontamento, árvore de estruturas, leitura da planilha, plano de corte).
- `npm run carga -- "<arquivo.xlsx>"` — a carga confere os totais com a aba Resumo Geral e aborta se divergir.

## Como a planilha entra
- Tela **Atualizar** (`/importar`): o navegador lê o .xlsx com SheetJS num worker (`src/lib/leitor.worker.ts`),
  manda o JSON compactado para `/api/importar` (sessão + `IMPORTACAO_SENHA`), que confere e grava.
- Terminal: `npm run carga`. Os dois usam o mesmo código: `src/lib/planilha.ts` (leitura), `src/lib/carga.ts`
  (preparo e conferência), `src/lib/gravarCarga.ts` (gravação e troca da carga ativa).
- A Vercel aceita até 4,5 MB por envio: por isso o .xlsx (≈12 MB) é lido no navegador e só o JSON compactado (≈1,2 MB) sobe.

## De onde vem o dado
Excel "Saldo <Projeto> - Modelo.xlsx", atualizado todo dia pelo responsável. Abas lidas:
- **Resumo Geral**: um código de tarefa por linha, com execuções, previsto, realizado e % de avanço do saldo.
- **Componentes**: cada componente de cada OP. `APONTADO` = quantidade de material já apontada (0 = pendente de baixa).
  `Cod.Tar Pai` = tarefa dona da OP; `Cod.Tar Filho` = tarefa que fabrica aquele componente (vazio = material direto).
  `ALHO` na planilha é o final de "RETRABALHO"; a carga grava `RETRABALHO`.
- **Arvore**: tabela dinâmica de Componentes (pai → filho). Não é lida: a plataforma recalcula a partir de Componentes.
- **Dados**: atividades das OPs (extração do RM). A carga resume por OP.
- **CNC_PCQ**: controle de CNC — cada OP em cada plano de corte (CNC = chapa; PA = tubo/perfil/barra).
  Liga com a coluna `CNC` de Componentes pelo par OP + plano. A coluna pode trazer vários planos separados por vírgula.

A planilha é a fonte da verdade. A carga lê os valores já calculados pelo Excel; não refaz as fórmulas.

## Camadas na tela
Projeto → código de tarefa → tarefas filhas → estruturas (OPs) → componentes.

## Padrão visual: o do Visto, copiado ao pé da letra
Decisão de 16/11/2026 (design `docs/superpowers/specs/2026-11-16-ascent-padrao-visto-design.md`): o Ascent segue o mesmo padrão
das aplicações do NID copiando o **código** da camada de design do Visto (`C:\dev\gg-digital\delp-visto`, commit `f66a6c3`).
- **Cópias**: `tailwind.config.js`, tokens de `src/app/globals.css` (= `src/index.css` do Visto), `src/components/ui/`,
  `src/components/layout/` (moldura: `AppShell`, `Sidebar`, `Topbar`, `barra/*`), `barra-recolhida.ts`,
  `indicador-tendencia.ts`, `use-largura-elemento.ts`. Cada arquivo copiado abre com `Origem: delp-visto@f66a6c3 <caminho>`;
  **todo desvio vai para `docs/visto-desvios.md`**. Para atualizar uma peça, compare com o Visto e mantenha os desvios.
- **Tokens, nunca hex solto nem classe fixa** (`bg-white`, `text-green-700`): cores são triplas RGB em `:root`.
  Exceções declaradas: metadados (`layout.tsx`, `manifest.ts`) e a arte do Login.
- **Só o tema claro** (decisão de 16/11/2026): sem modo noturno, sem botão de tema e sem script de tema no `<head>`.
  `tests/tema-unico.test.ts` falha se alguma peça de troca de tema voltar. A logo negativa (`LogoAscent tom="claro"`)
  só aparece sobre a cena escura do Login.
- **Cor de gráfico** só de `src/lib/cores.ts` (`ESCALA_VERMELHOS`, `COR_ASCENT`), por `style`: uma escala de vermelhos,
  degraus vizinhos nunca no mesmo gráfico, degraus 1–2 só com rótulo escrito. Situação = `Badge` (texto + ponto), ritmo = `SELO_TOM`.
- **Réguas**: bloco `Painel`; faixa de indicadores `.grade-indicadores` com `TileIndicador`; rótulo e cabeçalho de tabela em
  micro-caps cinza (nunca vermelho); todo número, data e código em `font-mono`; Delp Red só em destaque e ação.
- **Moldura**: telas logadas no grupo `src/app/(app)/` (layout com `dadosDaMoldura()`); Login e a 404 da raiz fora dela.
  Sem cabeçalho de página: a trilha do topo nomeia a tela (`src/lib/navegacao.ts`) e cada tela tem um `h1` `sr-only`.
  O layout não se refaz ao navegar: o seletor de projeto e o número de Pendências se atualizam ao recarregar ou com
  `router.refresh()` (o Importador já faz depois de gravar).
- **Pontos de quebra**: só `sm:`, `md:` (padding do `main`), `shell:` (900px) e `duascol:` (1280px); `lg:`/`xl:` só no Login copiado.
- Alvo de toque ≥ 44px (`min-h-11`); blocos que ficavam parados ao rolar continuam parados **abaixo** do topo de 64px (`top-16`).
- Os neutros são os cinzas do Visto (não o `#EAE5DF` corporativo), por decisão do responsável; o bege segue no ícone da marca.

Filtros do "Mostrar" na árvore são só de exibição (`filtrarArvore`, `pendenciasDoCodigo` em `regras.ts`): não mudam cálculo.
Seletor de projeto mostra só o projeto ativo: vários projetos exigem mudar a regra da importação (uma carga ativa por vez).

## Conferência visual
`npm run capturas -- <etapa>` fotografa as telas no Edge da estação (`scripts/capturar-telas.ts`) e relata erro de console,
texto abaixo do AA e rolagem lateral. Precisa do `npm run dev` na porta 3000 **e** do banco: na rede da Delp a porta 5432 do
Neon é bloqueada. As fotos vão para `design/ascent-verificacao/` (fora do git: têm dado de cliente).
Não rode `npm run build` com o `npm run dev` ligado (o build apaga o `.next` do dev) nem dois `npm run dev` na mesma pasta.

## NUNCA faça
- Commitar `.env`, planilha ou qualquer dado de projeto de cliente.
- Publicar sem login ativo (`ACESSO_SENHA` e `SESSAO_SEGREDO` definidos).
- Liberar a importação sem senha própria: `/api/importar` exige sessão **e** `IMPORTACAO_SENHA`.
- SQL raw: banco só via Prisma.
- Commitar sem evidência de verificação.
