// Conferência visual: fotografa todas as telas em desktop e celular, nos dois temas.
// Uso: com `npm run dev` rodando, `npm run capturas -- <etapa>`.
// As fotos têm dado de projeto de cliente: vão para design/ascent-verificacao/<etapa>/,
// que fica fora do git. Só leitura no banco.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { COOKIE, DURACAO_S, criarSessao } from "../src/lib/sessao";
import { abrirEdge, capturarPng } from "./edge-cdp";
import { planoDeCapturas } from "./plano-capturas";

const SERVIDOR = process.env.ASCENT_URL || "http://localhost:3000";

function sair(msg: string): never {
  console.error(`\nERRO: ${msg}\n`);
  process.exit(1);
}

async function primeiraTarefa(): Promise<string> {
  // PrismaClient próprio: o src/lib/db.ts usa o cache() do React, que só existe dentro do Next.
  const prisma = new PrismaClient();
  try {
    const carga = await prisma.carga.findFirst({ where: { ativa: true }, orderBy: { id: "desc" } });
    if (!carga) return "1";
    const tarefa = await prisma.tarefa.findFirst({ where: { cargaId: carga.id }, orderBy: { ordem: "asc" } });
    return tarefa?.codTarefa ?? "1";
  } finally {
    await prisma.$disconnect();
  }
}

/** A porta 3000 também é a do Visto: confere que quem responde é este app. */
async function conferirServidor(): Promise<void> {
  let nome = "";
  try {
    const r = await fetch(`${SERVIDOR}/manifest.webmanifest`);
    nome = ((await r.json()) as { name?: string }).name ?? "";
  } catch {
    sair(`O servidor não respondeu em ${SERVIDOR}. Rode \`npm run dev\` antes (e pare o build, que apaga o .next do dev).`);
  }
  if (!/Saldo|Ascent/.test(nome)) sair(`${SERVIDOR} está servindo outro app ("${nome}"). Feche-o ou use ASCENT_URL.`);
}

/** O tema precisa estar no <head>, antes da primeira pintura (não se prova por foto). */
async function temaNoHead(caminho: string, cookie?: string): Promise<boolean> {
  const html = await (await fetch(`${SERVIDOR}${caminho}`, { headers: cookie ? { cookie } : {} })).text();
  const head = html.slice(0, html.indexOf("</head>") + 1 || undefined);
  return head.includes("ascent.tema");
}

async function main() {
  const etapa = process.argv[2];
  if (!etapa) sair("Informe a etapa. Ex.: npm run capturas -- 00-antes");
  const segredo = process.env.SESSAO_SEGREDO;
  if (!segredo) sair("SESSAO_SEGREDO não está no ambiente (o script lê o .env pelo --env-file).");
  await conferirServidor();

  const pasta = path.join("design", "ascent-verificacao", etapa);
  mkdirSync(pasta, { recursive: true });
  // Sessão que vence em 1 hora (o padrão é 7 dias), sem mexer em sessao.ts. O valor nunca é impresso.
  const valor = await criarSessao(segredo, Date.now() - (DURACAO_S - 3600) * 1000);
  const cookie = { nome: COOKIE, valor };
  const plano = planoDeCapturas(await primeiraTarefa());
  const head = {
    login: await temaNoHead("/login"),
    painel: await temaNoHead("/", `${COOKIE}=${valor}`),
  };

  const edge = await abrirEdge();
  const linhas: { arquivo: string; erros: string[]; rolagem: boolean; contraste: string[] }[] = [];
  try {
    for (const c of plano) {
      const r = await capturarPng(edge, {
        url: `${SERVIDOR}${c.caminho}`,
        largura: c.largura,
        tema: c.tema,
        impressao: c.impressao,
        modo: c.modo,
        armazenamento: c.armazenamento,
        cookie: c.logado ? cookie : undefined,
      });
      writeFileSync(path.join(pasta, c.arquivo), r.png);
      linhas.push({ arquivo: c.arquivo, erros: r.erros, rolagem: r.rolagemLateral, contraste: r.contraste });
      process.stdout.write(".");
    }
  } finally {
    await edge.fechar();
  }

  const larg = Math.max(...linhas.map((l) => l.arquivo.length));
  console.log(`\n\n${"arquivo".padEnd(larg)} | erros | abaixo do AA | rolagem lateral`);
  for (const l of linhas) {
    console.log(
      `${l.arquivo.padEnd(larg)} | ${String(l.erros.length).padStart(5)} | ${String(l.contraste.length).padStart(12)} | ${l.rolagem ? "SIM" : "não"}`,
    );
    for (const e of l.erros) console.log(`    ↳ erro: ${e.split("\n")[0].slice(0, 220)}`);
    for (const t of l.contraste.slice(0, 5)) console.log(`    ↳ contraste: ${t}`);
  }
  const conta = (f: (l: (typeof linhas)[number]) => boolean) => linhas.filter(f).length;
  console.log(`\nScript do tema no <head>: /login ${head.login ? "sim" : "NÃO"} · / ${head.painel ? "sim" : "NÃO"}`);
  console.log(
    `${linhas.length} capturas em ${pasta} · ${conta((l) => l.erros.length > 0)} com erro de console · ` +
      `${conta((l) => l.contraste.length > 0)} com texto abaixo do AA · ${conta((l) => l.rolagem)} com rolagem lateral`,
  );
}

main().catch((e) => sair(e instanceof Error ? e.message : String(e)));
