# Spec — MVP da Plataforma de Saldo

**Data:** 14/11/2026 · **Origem:** pedido do responsável + planilha "Saldo Raia 7896 - Modelo.xlsx"

## Problema
Hoje o acompanhamento do saldo vive numa planilha local. O PCP não enxerga, de onde estiver, o que falta subir
nem qual componente está travando. (Ver mapeamento do fluxo de 12/11/2026: subida manual, sem lista do que falta.)

## Quem usa
- **Gestão:** quer ver o avanço e onde está parado.
- **Quem sobe saldo (PCP):** quer abrir o código de tarefa e chegar no componente pendente de baixa.

## O que o MVP faz
1. **Login** com senha única da equipe.
2. **Painel:** avanço geral, contagem de tarefas por situação e a lista de códigos de tarefa com busca e filtro.
3. **Código de tarefa:** tarefas filhas com o avanço de cada uma; por execução, a árvore de estruturas até os componentes,
   com quantidade usada, quantidade apontada e situação (pendente, parcial, apontado). Filtro "só pendentes".
4. **Pendências:** lista de componentes sem apontamento, com filtro por tarefa, grupo e texto.
5. **Carga diária:** comando local que lê a planilha, confere os totais e troca os dados.

## Regras (da planilha)
- % avanço do saldo = quantidade realizada ÷ quantidade prevista, por código de tarefa (aba Resumo Geral).
- Execuções pendentes = execuções − execuções × % avanço.
- Componente **pendente** quando `APONTADO` = 0; **parcial** quando 0 < `APONTADO` < `QTDUSADA`; **apontado** quando `APONTADO` ≥ `QTDUSADA`.
- Tarefa filha = tarefa que fabrica a estrutura usada como componente (`Cod.Tar Filho`).

## Fora do MVP
Upload da planilha pela tela, vários projetos ao mesmo tempo, histórico em gráfico, login Microsoft,
edição de dados e integração direta com o RM.

## Critérios de aceite
- Totais da tela iguais à linha de total do Resumo Geral.
- Do Painel até um componente pendente em no máximo 3 cliques.
- Sem login, nenhuma tela de dados abre.
- Usável no celular.

## [PENDENTE]
- Nome dos grupos de material (01.018, 01.053, 01.055...): a planilha só traz o código.
- Significado do número antes do hífen em `RESPONSAVEL` (ex.: `0-2/1.46`).
