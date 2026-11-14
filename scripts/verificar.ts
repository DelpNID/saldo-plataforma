// Verificação rápida de uma instalação: proteção por login, login e páginas principais.
// Uso: npm run verificar -- http://localhost:3000   (ou o endereço da Vercel)
// A senha vem de ACESSO_SENHA (arquivo .env ou variável de ambiente). Nada sensível é impresso.
import { existsSync } from "node:fs";

if (existsSync(".env") && !process.env.ACESSO_SENHA) process.loadEnvFile(".env");

const base = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const senha = process.env.ACESSO_SENHA ?? "";

async function pedir(caminho: string, init: RequestInit = {}) {
  const t0 = Date.now();
  const r = await fetch(base + caminho, { redirect: "manual", ...init });
  const corpo = await r.text();
  return { status: r.status, local: r.headers.get("location") ?? "", ms: Date.now() - t0, kb: Math.round(corpo.length / 1024), corpo, r };
}

async function main() {
  const falhas: string[] = [];
  const linhas: (string | number)[][] = [];
  const conferir = (nome: string, ok: boolean, detalhe: string) => {
    linhas.push([ok ? "ok" : "FALHOU", nome, detalhe]);
    if (!ok) falhas.push(nome);
  };

  const semLogin = await pedir("/");
  conferir("Sem login vai para /login", semLogin.status === 307 && semLogin.local.includes("/login"), `${semLogin.status}`);

  const errada = await pedir("/api/login", { method: "POST", body: new URLSearchParams({ senha: "senha-errada" }) });
  conferir("Senha errada é recusada", errada.status === 303 && errada.local.includes("erro=1"), `${errada.status}`);

  const certa = await pedir("/api/login", { method: "POST", body: new URLSearchParams({ senha, volta: "//fora.com" }) });
  const cookie = (certa.r.headers.get("set-cookie") ?? "").split(";")[0];
  conferir("Senha certa abre sessão", certa.status === 303 && cookie.startsWith("saldo_sessao="), `${certa.status}`);
  conferir("Não redireciona para fora", new URL(certa.local, base).origin === new URL(base).origin, certa.local);

  const H = { headers: { cookie } };
  for (const [caminho, esperado] of [
    ["/", "Códigos de tarefa"],
    ["/tarefa/1.01", "De onde vem o saldo"],
    ["/tarefa/1.46", "Estruturas por execução"],
    ["/pendencias", "Componentes sem apontamento"],
  ]) {
    const p = await pedir(caminho, H);
    conferir(`Página ${caminho}`, p.status === 200 && p.corpo.includes(esperado), `${p.status} · ${p.ms} ms · ${p.kb} KB`);
  }
  const inexistente = await pedir("/tarefa/0.00", H);
  conferir("Código inexistente dá 404", inexistente.status === 404, `${inexistente.status}`);

  console.table(linhas);
  if (falhas.length) {
    console.error(`\n${falhas.length} verificação(ões) falharam.`);
    process.exit(1);
  }
  console.log("\nTudo certo.");
}

main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
