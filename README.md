# Plataforma de Saldo

Painel online da subida de saldo. O PCP vê, de qualquer lugar, como está o saldo de cada código de tarefa
e consegue abrir as camadas até o componente pendente de baixa.

**Stack:** Next.js 14 · TypeScript · Prisma · PostgreSQL (Neon) · Vercel · GitHub

## Rodar na máquina

```bash
npm install
```

```bash
npm run dev
```

Abra http://localhost:3000 e entre com a senha da equipe (`ACESSO_SENHA` no arquivo `.env`).

## Atualizar os dados (todo dia)

```bash
npm run carga -- "C:\caminho\Saldo Raia 7896 - Modelo.xlsx"
```

A carga lê as abas Resumo Geral, Componentes e Dados, confere os totais com a planilha e só então troca os dados da tela.
Salve a planilha no Excel antes de rodar, para os valores das fórmulas estarem atualizados.

## Variáveis de ambiente

Copie `.env.example` para `.env` e preencha. Publicação na Vercel e rotina diária: [docs/publicacao.md](docs/publicacao.md).

## Telas

| Tela | Para quem | O que mostra |
|------|-----------|--------------|
| Painel | Gestão | Avanço geral e a lista de códigos de tarefa |
| Código de tarefa | Quem sobe saldo | Tarefas filhas, estruturas e componentes, com o que falta apontar |
| Pendências | Quem sobe saldo | Todos os componentes sem apontamento, com filtro |

## Testes

```bash
npm test
```
