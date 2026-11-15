# Publicação e rotina diária

## Onde está cada coisa

| O quê | Onde |
|------|------|
| Endereço | https://saldo-plataforma.vercel.app |
| Código | GitHub `DelpNID/saldo-plataforma` (privado), conta do Núcleo de Inovação |
| Site | Vercel, time **NID - Núcleo de Inovação e Desenvolvimento**, projeto `saldo-plataforma`, região São Paulo (`gru1`) |
| Banco | Neon, projeto `saldo-plataforma` (São Paulo) |

A proteção da Vercel vale só para as prévias. A produção fica aberta na internet, mas toda tela exige a senha da equipe.

## Primeira publicação (uma vez)

1. **Senhas na Vercel** — projeto `saldo-plataforma` › Settings › Environment Variables, ambiente *Production*:
   - `ACESSO_SENHA`: a senha que o PCP vai usar (a do `.env` local ou uma nova).
   - `SESSAO_SEGREDO`: um valor aleatório novo, diferente do `.env`. Para gerar:

     ```bash
     node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
     ```

   - `IMPORTACAO_SENHA`: senha de quem atualiza os dados pela tela Atualizar (diferente da senha da equipe).

   `DATABASE_URL` e `DIRECT_URL` já estão cadastradas.
2. **Ligar ao GitHub** — Settings › Git › Connect Git Repository › `DelpNID/saldo-plataforma`.
   Para enviar código desta máquina, entre no GitHub com a conta **DelpNID** (o remoto já usa esse usuário).
3. A partir daí, cada `git push` na `main` publica sozinho.
   Os commits deste repositório saem com a identidade **DelpNID** (configurada só aqui, em `git config --local`).
   Se o autor for outra conta, a Vercel marca a publicação como *Blocked*, porque o autor não é membro do time.
4. Conferir:

   ```bash
   npm run verificar -- https://ENDERECO-DA-VERCEL
   ```

## Rotina diária (pelo site)

1. Atualize a planilha no Excel e **salve** (os valores das fórmulas precisam estar recalculados).
2. Entre na plataforma e abra **Atualizar** (menu do topo).
3. Escolha o arquivo `.xlsx`. O navegador lê a planilha (até 1 minuto) e mostra um resumo: avanço, códigos, componentes, pendentes e planos de corte.
4. Confira, digite a **senha de importação** e clique em **Atualizar a plataforma**.
   A tela troca para os dados novos só no fim, de uma vez. Se algo falhar, a carga anterior continua.
5. Se aparecer que a soma não bate com o Resumo Geral, abra a planilha, salve de novo e escolha outra vez.

O que é enviado: só os dados das abas Resumo Geral, Componentes, Dados e CNC_PCQ, compactados (cerca de 1,2 MB).
A aba Arvore não é lida: a plataforma recalcula a árvore a partir de Componentes.

### Senha de importação

Variável `IMPORTACAO_SENHA` na Vercel (Production). É diferente da senha da equipe: quem só consulta não consegue trocar os dados.
Sem ela cadastrada, a tela Atualizar avisa que a importação está desligada.

### Pelo terminal (alternativa)

```bash
npm run carga -- "C:\caminho\Saldo Raia 7896 - Modelo.xlsx"
```

Usa o mesmo leitor e a mesma conferência da tela. Para carregar mesmo com divergência, acrescente `--forcar`.

O site não precisa ser publicado de novo para a carga aparecer: ele lê o banco a cada acesso.

## Planos de corte (CNC e PA/PC)

- Coluna **CNC** da aba Componentes: plano de corte da OP. `CNC...` = corte CNC (chapa); `PA...` = tubo, perfil e barra.
  Quando a OP entra em mais de um plano, a planilha junta os códigos com vírgula.
- Aba **CNC_PCQ** (tabela do "Controle de CNC"): uma linha por OP em cada plano, com QTDPREV, QTDAPONT, STATUS OP, NLOTE, QTDMPFINAL, QTDSUCATA e DATACRIACAO.
- Na árvore, cada material com plano mostra: código do plano, se o corte foi apontado (QTDAPONT ≥ QTDPREV), status da OP,
  quantas OPs do plano já foram cortadas, lote, MP da OP, sucata do plano e data de criação.
  Chapa, tubo, perfil e barra sem plano aparecem como **Sem plano de corte**.

## Trocar a senha da equipe

Mude `ACESSO_SENHA` na Vercel e faça um novo deploy (Deployments › Redeploy). Para derrubar todas as sessões abertas, troque também `SESSAO_SEGREDO`.
