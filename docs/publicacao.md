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

   `DATABASE_URL` e `DIRECT_URL` já estão cadastradas.
2. **Ligar ao GitHub** — Settings › Git › Connect Git Repository › `DelpNID/saldo-plataforma`.
   Para enviar código desta máquina, entre no GitHub com a conta **DelpNID** (o remoto já usa esse usuário).
3. A partir daí, cada `git push` na `main` publica sozinho.
4. Conferir:

   ```bash
   npm run verificar -- https://ENDERECO-DA-VERCEL
   ```

## Rotina diária

1. Atualize a planilha no Excel e **salve** (os valores das fórmulas precisam estar recalculados).
2. Feche a planilha.
3. Rode:

   ```bash
   npm run carga -- "C:\caminho\Saldo Raia 7896 - Modelo.xlsx"
   ```

4. Se a carga avisar que a soma não bate com o Resumo Geral, abra a planilha, salve de novo e repita.
   A tela troca para os dados novos só no fim, de uma vez.

O site não precisa ser publicado de novo para a carga aparecer: ele lê o banco a cada acesso.

## Trocar a senha da equipe

Mude `ACESSO_SENHA` na Vercel e faça um novo deploy (Deployments › Redeploy). Para derrubar todas as sessões abertas, troque também `SESSAO_SEGREDO`.
