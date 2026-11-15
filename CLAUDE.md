# Plataforma de Saldo — Contexto Claude Code

Painel online para o PCP e a gestão acompanharem a subida de saldo por projeto:
o que já subiu, o que falta e qual componente está pendente de baixa.

## Stack
Next.js 14 (App Router) + TypeScript + Prisma + PostgreSQL (Neon) · deploy na Vercel · código no GitHub.

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

## Padrão visual
Layout do modelo Conecta Delp (topbar com logo, kicker, título, indicadores, cartões brancos).
Cores e fonte da instrução corporativa: Delp Red `#CC0F10`, neutros `#EAE5DF` `#B0B0B0` preto e branco, Barlow.
Status sempre com texto junto da cor. Texto de corpo ≥ 18px, alvo de toque ≥ 44px.

## NUNCA faça
- Commitar `.env`, planilha ou qualquer dado de projeto de cliente.
- Publicar sem login ativo (`ACESSO_SENHA` e `SESSAO_SEGREDO` definidos).
- Liberar a importação sem senha própria: `/api/importar` exige sessão **e** `IMPORTACAO_SENHA`.
- SQL raw: banco só via Prisma.
- Commitar sem evidência de verificação.
