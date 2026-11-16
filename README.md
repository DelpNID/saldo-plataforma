# Ascent

Painel online da subida de saldo (antes "Plataforma de Saldo"). O PCP vê, de qualquer lugar, como está o saldo
de cada código de tarefa e consegue abrir as camadas até o componente pendente de baixa.

**Stack:** Next.js 14 · TypeScript · Tailwind CSS 3.4 · Prisma · PostgreSQL (Neon) · Vercel · GitHub

**Visual:** o mesmo padrão do Visto (tokens, componentes e moldura copiados de `delp-visto@f66a6c3`), só no tema
claro. O que mudou em relação ao Visto está em [`docs/visto-desvios.md`](docs/visto-desvios.md).

## Rodar na máquina

```bash
npm install
```

```bash
npm run dev
```

Abra http://localhost:3000 e entre com a senha da equipe (`ACESSO_SENHA` no arquivo `.env`).

## Atualizar os dados (todo dia)

Pelo site: menu **Atualizar**, escolha o `.xlsx`, confira o resumo e digite a senha de importação (`IMPORTACAO_SENHA`).

Pelo terminal:

```bash
npm run carga -- "C:\caminho\Saldo Raia 7896 - Modelo.xlsx"
```

Os dois caminhos leem as abas Resumo Geral, Componentes, Dados e CNC_PCQ, conferem os totais com a planilha e só então trocam os dados da tela.
Salve a planilha no Excel antes, para os valores das fórmulas estarem atualizados.

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha. Publicação na Vercel e rotina diária: [docs/publicacao.md](docs/publicacao.md).

## Telas

| Tela | Para quem | O que mostra |
|------|-----------|--------------|
| Painel | Gestão | Avanço geral e a lista de códigos de tarefa |
| Código de tarefa | Quem sobe saldo | Tarefas filhas, estruturas e componentes, com o que falta apontar e o plano de corte (CNC/PA-PC) de cada material |
| Pendências | Quem sobe saldo | Todos os componentes sem apontamento, com filtro por tarefa, grupo e plano de corte |
| Atualizar | Quem atualiza a planilha | Importa o .xlsx do dia, com resumo para conferir antes de trocar os dados |

## Testes

```bash
npm test
```
