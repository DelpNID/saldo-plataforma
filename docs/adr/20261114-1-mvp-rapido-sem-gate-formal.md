# ADR 20261114-1 — MVP em via rápida, sem gate formal

**Status:** aceito · **Data:** 14/11/2026 · **Decisor:** Luiz Castro (responsável pelo projeto)

## Contexto
A Diretoria pediu a subida de saldo funcionando até o fim do ano. O responsável pediu a plataforma em
"jogo rápido, depois melhoramos", para o PCP já conseguir ver o saldo online.

## Decisão
Construir o MVP direto após o `/nid:init`, sem passar por `/nid:plan` e `/nid:gate`.
Override dos princípios 6 e 7 da Constituição NID, amparado no princípio 10 (direção do usuário).

## O que foi mantido
- Spec curta em `docs/superpowers/specs/2026-11-14-mvp-plataforma-saldo.md`.
- Decisões de local do código, forma de login e criação do banco confirmadas pelo responsável antes de executar.
- Testes das regras de negócio e conferência de totais da carga contra a planilha.
- Login obrigatório e nenhum dado de cliente no repositório.

## O que ficou para depois (volta ao ciclo completo)
- Red-team formal (`/nid:gate`) antes da próxima evolução.
- Avaliação de Governança e Compliance, com TI, antes de ampliar o acesso além do piloto.
- Login Microsoft no lugar da senha única.
- Testes de tela (Playwright).

## Consequência
Entrega mais cedo, com risco assumido de retrabalho de layout e de regra depois do primeiro uso real.
