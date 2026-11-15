// Carga pelo terminal: lê a planilha, confere os totais e troca os dados da plataforma.
// Mesmo caminho da tela Atualizar dados (leitura em src/lib/planilha.ts, gravação em src/lib/gravarCarga.ts).
// Uso: npm run carga -- "C:\caminho\Saldo Raia 7896 - Modelo.xlsx" [--projeto "Raia 7896"] [--forcar]
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { prepararCarga } from "../src/lib/carga";
import { gravarCarga } from "../src/lib/gravarCarga";
import { abasDoArquivo } from "../src/lib/lerXlsx";
import { lerPlanilha } from "../src/lib/planilha";

function sair(msg: string): never {
  console.error(`\nERRO: ${msg}\n`);
  process.exit(1);
}

function argumentos() {
  const args = process.argv.slice(2);
  let arquivo = "";
  let projeto: string | undefined;
  let forcar = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--projeto") projeto = args[++i];
    else if (args[i] === "--forcar") forcar = true;
    else if (!arquivo) arquivo = args[i];
  }
  if (!arquivo) sair('informe a planilha. Exemplo: npm run carga -- "C:\\pasta\\Saldo Raia 7896 - Modelo.xlsx"');
  if (!existsSync(arquivo)) sair(`arquivo não encontrado: ${arquivo}`);
  return { arquivo: path.resolve(arquivo), projeto, forcar };
}

function abrir(arquivo: string): Buffer {
  try {
    return readFileSync(arquivo);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "EBUSY") sair("a planilha está bloqueada. Feche o arquivo no Excel e rode de novo.");
    throw e;
  }
}

async function main() {
  const { arquivo, projeto, forcar } = argumentos();
  const inicio = Date.now();
  const nome = path.basename(arquivo);
  console.log(`Lendo ${nome}...`);
  const c = prepararCarga(lerPlanilha(abasDoArquivo(abrir(arquivo)), nome), projeto);

  if (c.divergencias.length > 0) {
    console.warn(`\nA soma dos componentes não bate com o Resumo Geral em ${c.divergencias.length} ponto(s):`);
    for (const d of c.divergencias.slice(0, 10)) {
      console.warn(`  ${d.codTarefa} · ${d.campo}: planilha ${d.planilha} · componentes ${d.calculado}`);
    }
    if (!forcar) sair("a planilha parece desatualizada. Abra no Excel, salve e rode de novo. Para carregar assim mesmo, use --forcar.");
    console.warn("Carregando assim mesmo (--forcar).");
  }

  const prisma = new PrismaClient();
  try {
    const r = await gravarCarga(prisma, c, nome);
    console.log(`\nCarga ${r.cargaId} ativa · projeto ${r.projeto} (${c.centroCusto})`);
    console.log(`  ${r.tarefas} códigos de tarefa · ${r.componentes} componentes · ${r.ordens} OPs · ${r.planos} linhas de plano de corte`);
    console.log(`  Avanço do saldo: ${(r.avanco * 100).toFixed(1)}% · pendentes de baixa: ${r.pendentes}`);
    if (c.cncSemControle > 0) console.log(`  Atenção: ${c.cncSemControle} componentes com plano na coluna CNC sem linha na aba CNC_PCQ`);
    console.log(`  Concluída em ${((Date.now() - inicio) / 1000).toFixed(0)} s`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e: unknown) => sair(e instanceof Error ? e.message : String(e)));
