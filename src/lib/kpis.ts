// KPIs gerenciais de uma carga e a série diária para a tela Gestão.
// Os números saem das mesmas regras das outras telas (regras.ts); aqui só se soma.
import type { PrismaClient } from "@prisma/client";
import { situacaoTarefa, statusCorte, statusSaldo } from "./regras";

export interface Kpis {
  previsto: number;
  realizado: number;
  esperado: number | null; // saldo que já deveria ter subido pela fabricação
  execucoes: number;
  execPend: number;
  tarefas: number;
  concluidas: number;
  andamento: number;
  semAvanco: number;
  componentes: number;
  pendentes: number;
  ops: number;
  opsComSaldo: number;
  planos: number;
  cortesApontados: number;
}

export interface EntradaKpis {
  totais: { previsto: number; realizado: number; esperado: number | null; execucoes: number; execPend: number };
  tarefas: { avanco: number }[];
  componentes: { codOrdem: string; previsto: number; apontado2: number; apontado: number }[];
  planos: { qtdPrev: number; qtdApont: number }[];
}

/** Soma os KPIs. O saldo da OP é o mesmo em todas as linhas dela (QTDE PLANEJADA / EFETIVADA). */
export function calcularKpis(e: EntradaKpis): Kpis {
  const situacoes = e.tarefas.map((t) => situacaoTarefa(t.avanco));
  const ops = new Map<string, { previsto: number; apontado2: number }>();
  for (const c of e.componentes) if (!ops.has(c.codOrdem)) ops.set(c.codOrdem, c);
  return {
    ...e.totais,
    tarefas: e.tarefas.length,
    concluidas: situacoes.filter((s) => s === "concluida").length,
    andamento: situacoes.filter((s) => s === "andamento").length,
    semAvanco: situacoes.filter((s) => s === "sem-avanco").length,
    componentes: e.componentes.length,
    pendentes: e.componentes.filter((c) => c.apontado <= 0).length,
    ops: ops.size,
    opsComSaldo: [...ops.values()].filter((o) => statusSaldo(o.previsto, o.apontado2) === "ok").length,
    planos: e.planos.length,
    cortesApontados: e.planos.filter((p) => statusCorte(p.qtdPrev, p.qtdApont) === "apontado").length,
  };
}

const diaSP = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" });

/** Data do dia no fuso de São Paulo, "AAAA-MM-DD" (um ponto por dia no gráfico). */
export function dataRef(d: Date): string {
  return diaSP.format(d);
}

export interface Ponto {
  dataRef: string;
  criadoEm: Date;
  previsto: number;
  realizado: number;
  pendentes: number;
  cargaId: number;
}

/** Série do gráfico: fica a última carga de cada dia, em ordem de data. */
export function serieDiaria<T extends Ponto>(pontos: T[]): T[] {
  const porDia = new Map<string, T>();
  for (const p of [...pontos].sort((a, b) => a.criadoEm.getTime() - b.criadoEm.getTime())) porDia.set(p.dataRef, p);
  return [...porDia.values()].sort((a, b) => a.dataRef.localeCompare(b.dataRef));
}

export const avancoDe = (p: { previsto: number; realizado: number }) => (p.previsto > 0 ? p.realizado / p.previsto : 0);

// ---------- Saldo × Fabricação ----------
// % AVANÇO FABRIC (planilha) = guias do código com 100%. Vezes o previsto, dá o saldo que já deveria ter subido.
// No grupo e no projeto: soma do esperado ÷ soma do previsto (mesma conta do avanço do saldo).

/** Avanço da fabricação de um conjunto: esperado ÷ previsto. */
export const fabricDe = (p: { previsto: number; esperado: number }) => (p.previsto > 0 ? p.esperado / p.previsto : 0);

export type Ritmo = "atraso" | "em-dia" | "a-frente";
const TOLERANCIA_PP = 0.5; // até meio ponto percentual de diferença conta como "acompanha"

/** Compara o avanço do saldo com o da fabricação. pp = diferença em pontos percentuais (sempre positiva). */
export function ritmoSaldo(saldo: number, fabric: number): { ritmo: Ritmo; pp: number } {
  const pp = (fabric - saldo) * 100;
  return { ritmo: pp > TOLERANCIA_PP ? "atraso" : pp < -TOLERANCIA_PP ? "a-frente" : "em-dia", pp: Math.abs(pp) };
}

/** Quantidade que falta subir para o saldo alcançar a fabricação (0 quando já alcançou). */
export const atrasoQtd = (p: { realizado: number; esperado: number }) => Math.max(0, p.esperado - p.realizado);

/** Lê a carga do banco e calcula os KPIs. */
export async function kpisDoBanco(prisma: PrismaClient, cargaId: number): Promise<Kpis> {
  const [carga, tarefas, componentes, planos] = await Promise.all([
    prisma.carga.findUniqueOrThrow({ where: { id: cargaId } }),
    prisma.tarefa.findMany({ where: { cargaId }, select: { avanco: true } }),
    prisma.componente.findMany({ where: { cargaId }, select: { codOrdem: true, previsto: true, apontado2: true, apontado: true } }),
    prisma.planoCorte.findMany({ where: { cargaId }, select: { qtdPrev: true, qtdApont: true } }),
  ]);
  return calcularKpis({
    totais: {
      previsto: carga.totalPrevisto,
      realizado: carga.totalRealizado,
      esperado: carga.comFabric ? carga.totalEsperado : null,
      execucoes: carga.totalExecucoes,
      execPend: carga.totalExecPend,
    },
    tarefas,
    componentes,
    planos,
  });
}

/**
 * Garante o resumo da carga no histórico (uma linha por carga).
 * Chamado no fim da importação e, se faltar, na primeira abertura da tela Gestão.
 */
export async function garantirHistorico(prisma: PrismaClient, cargaId: number) {
  const existente = await prisma.historico.findUnique({ where: { cargaId } });
  if (existente) return existente;
  const carga = await prisma.carga.findUniqueOrThrow({ where: { id: cargaId } });
  const k = await kpisDoBanco(prisma, cargaId);
  return prisma.historico.upsert({
    where: { cargaId },
    update: {},
    create: {
      cargaId,
      criadoEm: carga.criadaEm,
      dataRef: dataRef(carga.criadaEm),
      projeto: carga.projeto,
      centroCusto: carga.centroCusto,
      arquivo: carga.arquivo,
      ...k,
    },
  });
}

// ---------- Busca da Gestão: desenho, código de tarefa ou descrição do equipamento ----------

export interface CodigoBusca {
  cod: string;
  descricao: string;
  desenho: string;
  tags?: string; // TAGs das OPs do código (aba Dados), para achar pelo equipamento
  previsto: number;
  realizado: number;
  avanco: number;
  pendentes: number;
  componentes: number;
  execucoes: number;
  execPend: number;
  fabric: number; // 0 a 1
}

const semAcento = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Todas as palavras digitadas precisam aparecer no código, na descrição ou no desenho (sem diferenciar acento e maiúscula). */
export function buscarCodigos<T extends { cod: string; descricao: string; desenho: string; tags?: string }>(lista: T[], q: string): T[] {
  const termos = semAcento(q).split(/\s+/).filter(Boolean);
  if (termos.length === 0) return [];
  return lista.filter((t) => {
    const alvo = semAcento(`${t.cod} ${t.descricao} ${t.desenho} ${t.tags ?? ""}`);
    return termos.every((x) => alvo.includes(x));
  });
}

/** Soma do recorte: o avanço é realizado ÷ previsto, a mesma conta do projeto inteiro. */
export function resumirSelecao(lista: CodigoBusca[]) {
  const s = lista.reduce(
    (a, t) => ({
      previsto: a.previsto + t.previsto,
      realizado: a.realizado + t.realizado,
      pendentes: a.pendentes + t.pendentes,
      componentes: a.componentes + t.componentes,
      execucoes: a.execucoes + t.execucoes,
      execPend: a.execPend + t.execPend,
      esperado: a.esperado + t.fabric * t.previsto,
    }),
    { previsto: 0, realizado: 0, pendentes: 0, componentes: 0, execucoes: 0, execPend: 0, esperado: 0 },
  );
  return { ...s, codigos: lista.length, desenhos: new Set(lista.map((t) => t.desenho)).size, avanco: avancoDe(s), fabric: fabricDe(s) };
}
