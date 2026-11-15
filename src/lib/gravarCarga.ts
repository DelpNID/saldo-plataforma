// Grava a carga preparada e troca a carga ativa de uma vez.
// Usado pelo comando `npm run carga` e pela tela Atualizar dados (rota /api/importar).
import type { PrismaClient } from "@prisma/client";
import type { CargaPreparada } from "./carga";

async function emLotes<T>(linhas: T[], tamanho: number, gravar: (lote: T[]) => Promise<unknown>) {
  for (let i = 0; i < linhas.length; i += tamanho) await gravar(linhas.slice(i, i + tamanho));
}

export interface ResultadoCarga {
  cargaId: number;
  projeto: string;
  tarefas: number;
  componentes: number;
  ordens: number;
  planos: number;
  pendentes: number;
  avanco: number; // 0 a 1
}

export async function gravarCarga(prisma: PrismaClient, c: CargaPreparada, arquivo: string): Promise<ResultadoCarga> {
  const carga = await prisma.carga.create({
    data: {
      arquivo,
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
    await emLotes(c.planos, 3000, (l) => prisma.planoCorte.createMany({ data: l.map((p) => ({ ...p, cargaId })) }));
  } catch (e) {
    // Carga pela metade nunca fica ativa: apaga e devolve o erro
    await prisma.carga.delete({ where: { id: cargaId } }).catch((erro: unknown) => {
      console.error(`[carga] não consegui apagar a carga incompleta ${cargaId}`, erro);
    });
    throw e;
  }

  // Troca a carga ativa de uma vez e guarda só a anterior como reserva
  await prisma.$transaction([
    prisma.carga.updateMany({ where: { ativa: true }, data: { ativa: false } }),
    prisma.carga.update({ where: { id: cargaId }, data: { ativa: true } }),
  ]);
  const antigas = await prisma.carga.findMany({ where: { ativa: false }, orderBy: { id: "desc" }, skip: 1, select: { id: true } });
  if (antigas.length) await prisma.carga.deleteMany({ where: { id: { in: antigas.map((a) => a.id) } } });

  return {
    cargaId,
    projeto: c.projeto,
    tarefas: c.tarefas.length,
    componentes: c.componentes.length,
    ordens: c.ordens.length,
    planos: c.planos.length,
    pendentes: c.componentes.filter((x) => x.apontado <= 0).length,
    avanco: c.totais.previsto > 0 ? c.totais.realizado / c.totais.previsto : 0,
  };
}
