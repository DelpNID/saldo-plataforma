// Carga diária: lê a planilha, confere os totais e troca os dados da plataforma.
// Uso: npm run carga -- "C:\caminho\Saldo Raia 7896 - Modelo.xlsx" [--projeto "Raia 7896"] [--forcar]
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { PrismaClient } from "@prisma/client";
import { prepararCarga, type PlanilhaJson } from "../src/lib/carga";

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

function lerPlanilha(arquivo: string): PlanilhaJson {
  const saida = path.join(tmpdir(), `saldo-carga-${process.pid}.json`);
  const leitor = path.join(__dirname, "ler_planilha.py");
  for (const py of ["python", "py"]) {
    const r = spawnSync(py, ["-X", "utf8", leitor, arquivo, saida], { stdio: "inherit" });
    if (r.error && (r.error as NodeJS.ErrnoException).code === "ENOENT") continue;
    if (r.status !== 0) sair("a leitura da planilha falhou (mensagem acima).");
    const json = JSON.parse(readFileSync(saida, "utf-8")) as PlanilhaJson;
    rmSync(saida, { force: true });
    return json;
  }
  sair("Python não encontrado nesta máquina. Ele é usado para ler a planilha.");
}

async function emLotes<T>(linhas: T[], tamanho: number, gravar: (lote: T[]) => Promise<unknown>) {
  for (let i = 0; i < linhas.length; i += tamanho) await gravar(linhas.slice(i, i + tamanho));
}

async function main() {
  const { arquivo, projeto, forcar } = argumentos();
  const inicio = Date.now();
  console.log(`Lendo ${path.basename(arquivo)}...`);
  const c = prepararCarga(lerPlanilha(arquivo), projeto);

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
    const carga = await prisma.carga.create({
      data: {
        arquivo: path.basename(arquivo),
        projeto: c.projeto,
        centroCusto: c.centroCusto,
        totalPrevisto: c.totais.previsto,
        totalRealizado: c.totais.realizado,
        totalExecucoes: c.totais.execucoes,
        totalExecPend: c.totais.execPend,
      },
    });
    const cargaId = carga.id;
    try {
      await emLotes(c.tarefas, 1000, (l) => prisma.tarefa.createMany({ data: l.map((t) => ({ ...t, cargaId })) }));
      await emLotes(c.componentes, 2500, (l) => prisma.componente.createMany({ data: l.map((x) => ({ ...x, cargaId })) }));
      await emLotes(c.ordens, 3000, (l) => prisma.ordem.createMany({ data: l.map((o) => ({ ...o, cargaId })) }));
    } catch (e) {
      await prisma.carga.delete({ where: { id: cargaId } }).catch(() => undefined);
      throw e;
    }

    // Troca a carga ativa de uma vez e guarda só a anterior como reserva
    await prisma.$transaction([
      prisma.carga.updateMany({ where: { ativa: true }, data: { ativa: false } }),
      prisma.carga.update({ where: { id: cargaId }, data: { ativa: true } }),
    ]);
    const antigas = await prisma.carga.findMany({ where: { ativa: false }, orderBy: { id: "desc" }, skip: 1, select: { id: true } });
    if (antigas.length) await prisma.carga.deleteMany({ where: { id: { in: antigas.map((a) => a.id) } } });

    const pend = c.componentes.filter((x) => x.apontado <= 0).length;
    const avanco = c.totais.previsto > 0 ? (c.totais.realizado / c.totais.previsto) * 100 : 0;
    console.log(`\nCarga ${cargaId} ativa · projeto ${c.projeto} (${c.centroCusto})`);
    console.log(`  ${c.tarefas.length} códigos de tarefa · ${c.componentes.length} componentes · ${c.ordens.length} OPs`);
    console.log(`  Avanço do saldo: ${avanco.toFixed(1)}% · pendentes de baixa: ${pend}`);
    console.log(`  Concluída em ${((Date.now() - inicio) / 1000).toFixed(0)} s`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e: unknown) => sair(e instanceof Error ? e.message : String(e)));
