// Painel do gestor (tela Gestão): os números que dizem se o saldo está ruim, por que está
// atrasado e o que cobrar. As regras são as mesmas das outras telas:
//   - saldo de um conjunto = soma de APONTADO2 ÷ soma de PREVISTO dos componentes (QTDE
//     EFETIVADA / PLANEJADA da OP de cada linha), como o QTD PREVISTO do Resumo Geral;
//   - fabricação = % AVANÇO FABRIC do código × previsto (o que já deveria ter subido);
//   - situação do saldo da OP = statusSaldo (regras.ts): "com saldo" quando efetivada ≥ planejada.
// As consultas somam no banco (36 mil componentes); as funções puras abaixo delas são testadas.
import type { PrismaClient } from "@prisma/client";
import { SITUACOES_RA } from "./regras";

// ---------- Tipos ----------

/** Saldo de uma TAG (aba Dados) somado pelos componentes das OPs da TAG. */
export interface SaldoTag {
  tag: string; // "" = OP sem TAG na planilha (ou fora da aba Dados)
  previsto: number;
  realizado: number;
  esperado: number; // % fabricação do código × previsto, somado
  pendentes: number; // componentes com APONTADO = 0
  ops: number;
}

/** Em que etapa está cada OP dos componentes (cada OP numa etapa só). */
export interface EtapasOps {
  total: number;
  comSaldo: number; // QTDE EFETIVADA ≥ PLANEJADA
  fabricadasSemSaldo: number; // todas as atividades APONTADA e o saldo ainda não efetivado
  emFabricacao: number; // alguma atividade apontada ou parcial
  naoIniciadas: number; // nenhuma atividade apontada
  semAtividade: number; // OP fora da aba Dados
}

export interface PendenciaRa {
  situacao: string; // SITUACAO_RA ("" = vazia)
  pendentes: number; // componentes pendentes de baixa nessa situação
  total: number;
}

export interface CobrancaCodigo {
  raPendente: number; // componentes pendentes de baixa com RA Pendente
  opsFabricadasSemSaldo: number;
  tags: string; // TAGs das OPs do código, para a busca
}

export interface MesSaldo {
  mes: string; // AAAA-MM
  dataRef: string; // dia da última carga do mês
  previsto: number;
  realizado: number;
  esperado: number | null;
}

// ---------- Funções puras ----------

const ETAPA_VAZIA: EtapasOps = { total: 0, comSaldo: 0, fabricadasSemSaldo: 0, emFabricacao: 0, naoIniciadas: 0, semAtividade: 0 };
const CAMPO_DA_ETAPA: Record<string, keyof Omit<EtapasOps, "total">> = {
  "com-saldo": "comSaldo",
  "fabricada-sem-saldo": "fabricadasSemSaldo",
  "em-fabricacao": "emFabricacao",
  "nao-iniciada": "naoIniciadas",
  "sem-atividade": "semAtividade",
};

/** Junta as contagens por etapa (linhas da consulta) no objeto da tela. */
export function etapasDeOps(linhas: { etapa: string; n: number }[]): EtapasOps {
  const e = { ...ETAPA_VAZIA };
  for (const l of linhas) {
    const campo = CAMPO_DA_ETAPA[l.etapa];
    if (!campo) continue;
    e[campo] += l.n;
    e.total += l.n;
  }
  return e;
}

/** Pendentes de baixa por situação da RA, na ordem da tela; situação vazia fica no fim como "Sem situação". */
export function pendenciasPorRa(linhas: PendenciaRa[]): PendenciaRa[] {
  const ordem = (s: string) => {
    const i = (SITUACOES_RA as readonly string[]).indexOf(s);
    return i < 0 ? 99 : i;
  };
  return [...linhas].filter((l) => l.pendentes > 0 || l.total > 0).sort((a, b) => ordem(a.situacao) - ordem(b.situacao));
}

/** Atraso de um conjunto em quantidade: o que falta subir para acompanhar a fabricação. */
export const faltaParaFabricacao = (s: { realizado: number; esperado: number }) => Math.max(0, s.esperado - s.realizado);

/** TAGs ordenadas pelo maior atraso (quantidade). A "sem TAG" sai do ranking e volta à parte. */
export function rankingTags(lista: SaldoTag[], n = 10): { top: SaldoTag[]; semTag: SaldoTag | null; comTag: number; atrasadas: number } {
  const semTag = lista.find((t) => t.tag === "") ?? null;
  const comTag = lista.filter((t) => t.tag !== "");
  const ordenadas = [...comTag].sort((a, b) => faltaParaFabricacao(b) - faltaParaFabricacao(a) || b.previsto - b.realizado - (a.previsto - a.realizado));
  return { top: ordenadas.slice(0, n), semTag, comTag: comTag.length, atrasadas: comTag.filter((t) => faltaParaFabricacao(t) > 0).length };
}

/** Um ponto por mês: a última carga do mês (o histórico guarda um resumo por carga). */
export function seriePorMes<T extends { dataRef: string; criadoEm: Date; previsto: number; realizado: number; esperado: number | null }>(
  pontos: T[],
): MesSaldo[] {
  const porMes = new Map<string, T>();
  for (const p of [...pontos].sort((a, b) => a.criadoEm.getTime() - b.criadoEm.getTime())) porMes.set(p.dataRef.slice(0, 7), p);
  return [...porMes.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([mes, p]) => ({ mes, dataRef: p.dataRef, previsto: p.previsto, realizado: p.realizado, esperado: p.esperado }));
}

const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "2026-11" → { curto: "nov/26", longo: "novembro de 2026" }. */
export function nomeMes(mes: string): { curto: string; longo: string } {
  const [a, m] = mes.split("-").map(Number);
  const nome = MESES[(m || 1) - 1] ?? mes;
  return { curto: `${nome.slice(0, 3)}/${String(a).slice(-2)}`, longo: `${nome} de ${a}` };
}

// ---------- Consultas ----------

/** Igual ao statusSaldo "ok" (regras.ts), em SQL, sobre a OP de cada linha. */
const COM_SALDO = `((op.previsto <= 0 AND op.apontado2 > 0) OR (op.previsto > 0 AND op.apontado2 >= op.previsto - 1e-9))`;

export async function dadosGestor(prisma: PrismaClient, cargaId: number) {
  const [tags, ras, etapas, fabSemSaldo, raPend] = await Promise.all([
    prisma.$queryRaw<SaldoTag[]>`
      SELECT coalesce(nullif(trim(o.tag), ''), '') AS tag,
             coalesce(sum(c.previsto), 0)::float8 AS previsto,
             coalesce(sum(c.apontado2), 0)::float8 AS realizado,
             coalesce(sum(c.previsto * t."avancoFabric"), 0)::float8 AS esperado,
             (count(*) FILTER (WHERE c.apontado <= 0))::int AS pendentes,
             (count(DISTINCT c."codOrdem"))::int AS ops
      FROM "Componente" c
      JOIN "Tarefa" t ON t."cargaId" = c."cargaId" AND t."codTarefa" = c."tarPai"
      LEFT JOIN "Ordem" o ON o."cargaId" = c."cargaId" AND o.op = c."codOrdem"
      WHERE c."cargaId" = ${cargaId}
      GROUP BY 1`,
    prisma.$queryRaw<PendenciaRa[]>`
      SELECT coalesce(c."situacaoRa", '') AS situacao,
             (count(*) FILTER (WHERE c.apontado <= 0))::int AS pendentes,
             count(*)::int AS total
      FROM "Componente" c
      WHERE c."cargaId" = ${cargaId}
      GROUP BY 1`,
    prisma.$queryRawUnsafe<{ etapa: string; n: number }[]>(
      `WITH op AS (
         SELECT DISTINCT ON (c."codOrdem") c."codOrdem" AS op, c.previsto, c.apontado2
         FROM "Componente" c WHERE c."cargaId" = $1
         ORDER BY c."codOrdem", c.id
       )
       SELECT CASE WHEN ${COM_SALDO} THEN 'com-saldo'
                   WHEN o.op IS NULL THEN 'sem-atividade'
                   WHEN o.atividades > 0 AND o."ativApontadas" = o.atividades THEN 'fabricada-sem-saldo'
                   WHEN o."ativApontadas" > 0 OR o."ativParciais" > 0 THEN 'em-fabricacao'
                   ELSE 'nao-iniciada' END AS etapa,
              count(*)::int AS n
       FROM op LEFT JOIN "Ordem" o ON o."cargaId" = $1 AND o.op = op.op
       GROUP BY 1`,
      cargaId,
    ),
    prisma.$queryRawUnsafe<{ cod: string; n: number; tags: string | null }[]>(
      `WITH op AS (
         SELECT DISTINCT ON (c."tarPai", c."codOrdem") c."tarPai" AS cod, c."codOrdem" AS op, c.previsto, c.apontado2
         FROM "Componente" c WHERE c."cargaId" = $1
         ORDER BY c."tarPai", c."codOrdem", c.id
       )
       SELECT op.cod,
              (count(*) FILTER (WHERE NOT ${COM_SALDO} AND o.atividades > 0 AND o."ativApontadas" = o.atividades))::int AS n,
              string_agg(DISTINCT nullif(trim(o.tag), ''), ' · ') AS tags
       FROM op LEFT JOIN "Ordem" o ON o."cargaId" = $1 AND o.op = op.op
       GROUP BY op.cod`,
      cargaId,
    ),
    prisma.$queryRaw<{ cod: string; n: number }[]>`
      SELECT c."tarPai" AS cod, count(*)::int AS n
      FROM "Componente" c
      WHERE c."cargaId" = ${cargaId} AND c.apontado <= 0 AND c."situacaoRa" = 'RA Pendente'
      GROUP BY 1`,
  ]);

  const porCodigo = new Map<string, CobrancaCodigo>();
  for (const f of fabSemSaldo) porCodigo.set(f.cod, { raPendente: 0, opsFabricadasSemSaldo: f.n, tags: f.tags ?? "" });
  for (const r of raPend) {
    const c = porCodigo.get(r.cod) ?? { raPendente: 0, opsFabricadasSemSaldo: 0, tags: "" };
    c.raPendente = r.n;
    porCodigo.set(r.cod, c);
  }

  return {
    tags: tags.map((t) => ({ ...t, previsto: Number(t.previsto), realizado: Number(t.realizado), esperado: Number(t.esperado) })),
    pendenciasRa: pendenciasPorRa(ras),
    etapas: etapasDeOps(etapas.map((e) => ({ etapa: e.etapa, n: Number(e.n) }))),
    porCodigo,
  };
}

// ---------- Lista das OPs fabricadas sem saldo (cobrança) ----------

/** Endereço da lista (filha da Gestão: o menu acende Gestão e a trilha mostra os dois). */
export const CAMINHO_OPS = "/gestao/ops-sem-saldo";

/** Uma OP fabricada sem saldo dentro de um código de tarefa (a OP que entra em dois códigos aparece nos dois). */
export interface OpSemSaldo {
  cod: string;
  op: string;
  tag: string;
  descricao: string; // DESCRIÇÃOOP da aba Dados
  desenho: string;
  planejada: number; // QTDE PLANEJADA
  efetivada: number; // QTDE EFETIVADA
  atividades: number;
  horasPrevistas: number;
  horasApontadas: number;
  componentes: number; // componentes do código nesta OP
  pendentes: number; // … com APONTADO = 0
}

export interface FiltroOps {
  q?: string;
  codigo?: string;
  tag?: string;
}

const semAcentoOp = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Filtra pela busca (OP, descrição, TAG, desenho: todas as palavras), pelo código e pela TAG. */
export function filtrarOps(lista: OpSemSaldo[], f: FiltroOps): OpSemSaldo[] {
  const termos = semAcentoOp(f.q ?? "")
    .split(/\s+/)
    .filter(Boolean);
  return lista.filter((o) => {
    if (f.codigo && o.cod !== f.codigo) return false;
    if (f.tag !== undefined && f.tag !== null && f.tag !== "" && o.tag !== (f.tag === SEM_TAG ? "" : f.tag)) return false;
    if (termos.length === 0) return true;
    const alvo = semAcentoOp(`${o.op} ${o.descricao} ${o.tag} ${o.desenho}`);
    return termos.every((t) => alvo.includes(t));
  });
}

/** Valor do filtro de TAG para as OPs sem TAG. */
export const SEM_TAG = "(sem TAG)";

const OP_NUM = (op: string) => {
  const [n, ano] = op.split("/");
  return { ano: Number(ano) || 0, n: Number(n) || 0 };
};

/** Ordem da lista: código de tarefa (na ordem natural de `comparar`), depois a OP (ano e número). */
export function ordenarOps(lista: OpSemSaldo[], comparar: (a: string, b: string) => number): OpSemSaldo[] {
  return [...lista].sort((a, b) => {
    const c = comparar(a.cod, b.cod);
    if (c) return c;
    const x = OP_NUM(a.op);
    const y = OP_NUM(b.op);
    return x.ano - y.ano || x.n - y.n || a.op.localeCompare(b.op);
  });
}

export async function opsFabricadasSemSaldo(prisma: PrismaClient, cargaId: number): Promise<OpSemSaldo[]> {
  const linhas = await prisma.$queryRawUnsafe<OpSemSaldo[]>(
    `WITH op AS (
       SELECT c."tarPai" AS cod, c."codOrdem" AS op,
              min(c.previsto) AS previsto, min(c.apontado2) AS apontado2,
              count(*)::int AS componentes,
              (count(*) FILTER (WHERE c.apontado <= 0))::int AS pendentes
       FROM "Componente" c WHERE c."cargaId" = $1
       GROUP BY 1, 2
     )
     SELECT op.cod, op.op, coalesce(nullif(trim(o.tag), ''), '') AS tag, o.descricao, o.desenho,
            op.previsto::float8 AS planejada, op.apontado2::float8 AS efetivada,
            o.atividades, o."horasPrevistas"::float8 AS "horasPrevistas", o."horasApontadas"::float8 AS "horasApontadas",
            op.componentes, op.pendentes
     FROM op JOIN "Ordem" o ON o."cargaId" = $1 AND o.op = op.op
     WHERE NOT ${COM_SALDO} AND o.atividades > 0 AND o."ativApontadas" = o.atividades`,
    cargaId,
  );
  return linhas.map((l) => ({
    ...l,
    planejada: Number(l.planejada),
    efetivada: Number(l.efetivada),
    atividades: Number(l.atividades),
    horasPrevistas: Number(l.horasPrevistas),
    horasApontadas: Number(l.horasApontadas),
    componentes: Number(l.componentes),
    pendentes: Number(l.pendentes),
  }));
}

/** Lê os filtros da lista do endereço (com limite de tamanho, como em Pendências). */
export function lerFiltroOps(sp: { q?: string; codigo?: string; tag?: string }): FiltroOps {
  return {
    q: sp.q?.trim().slice(0, 80) || undefined,
    codigo: sp.codigo?.slice(0, 40) || undefined,
    tag: sp.tag?.slice(0, 60) || undefined,
  };
}

/** Colunas do arquivo exportado (a lista inteira, já filtrada). */
export const CABECALHO_OPS = [
  "Código de tarefa",
  "OP",
  "TAG",
  "Descrição da OP",
  "Desenho",
  "QTDE planejada",
  "QTDE efetivada",
  "Atividades (todas apontadas)",
  "Horas previstas",
  "Horas apontadas",
  "Componentes do código na OP",
  "Pendentes de baixa",
];

export const linhaExportOp = (o: OpSemSaldo): (string | number)[] => [
  o.cod,
  o.op,
  o.tag,
  o.descricao,
  o.desenho,
  o.planejada,
  o.efetivada,
  o.atividades,
  o.horasPrevistas,
  o.horasApontadas,
  o.componentes,
  o.pendentes,
];
