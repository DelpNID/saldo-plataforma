// Lê as abas da planilha de saldo (linhas já extraídas pelo SheetJS) e monta o JSON da carga.
// Roda igual no navegador (tela Atualizar dados) e no comando `npm run carga`.
// Funções puras: não dependem do SheetJS, só das linhas de cada aba.
import type { PlanilhaJson } from "./carga";

export type Linhas = unknown[][];

export const ABAS_OBRIGATORIAS = ["Resumo Geral", "Componentes", "Dados"] as const;
export const ABA_CNC = "CNC_PCQ";

/** Erro com mensagem para quem atualiza a planilha (aparece na tela e no terminal). */
export class ErroPlanilha extends Error {}

type Mapa = Record<string, string>;

const COLS_RESUMO: Mapa = {
  DESENHO: "desenho",
  CODTAREFA: "codTarefa",
  DESCRIÇÃO: "descricao",
  EXECUÇÕES: "execucoes",
  "EXEC. PEND": "execPend",
  "QTD PREVISTO": "qtdPrevisto",
  "QTD REALIZADA": "qtdRealizada",
  "% AVANÇO SALDO": "avanco",
};
// % AVANÇO FABRIC: guias do código com 100% (pela quantidade prevista). Planilha antiga não tem.
// PRIORIDADE saiu na revisão de 16/11: continua lida quando existir.
const COLS_RESUMO_OPCIONAIS: Mapa = { "% AVANÇO FABRIC": "avancoFabric", "% AVANÇO FABRICAÇÃO": "avancoFabric", PRIORIDADE: "prioridade" };

const COLS_COMP: Mapa = {
  CODORDEM: "codOrdem",
  CODESTRUTURA: "codEstrutura",
  IDATVORDEM: "idAtvOrdem",
  QTDUSADA: "qtdUsada",
  APONTADO: "apontado",
  CODIGOPRD: "codigoPrd",
  NOMEFANTASIA: "nome",
  CODUNDCONTROLE: "unidade",
  CODCCUSTO: "centroCusto",
  RESPONSAVEL: "responsavel",
  "Cod.Tar Pai": "tarPai",
  EXEC: "exec",
  "Cod.Tar Filho": "tarFilho",
  COD2: "grupo",
  PREVISTO: "previsto",
  APONTADO2: "apontado2",
  LOTE: "lote",
};
// Colunas novas: a planilha antiga não tem e continua valendo
// SITUACAO_RA: Subconjunto (sem RA), RA Pendente, RA gerada, Plano sem RA. O número da RA não é lido.
const COLS_COMP_OPCIONAIS: Mapa = { CNC: "cnc", SITUACAO_RA: "situacaoRa" };

const COLS_DADOS: Mapa = {
  OP: "op",
  TAG: "tag",
  DESCRIÇÃOOP: "descricao",
  DESENHO: "desenho",
  STATUS: "status",
  "HORAS PREVISTA": "horasPrevistas",
  "HORAS APONTADAS": "horasApontadas",
  "QTDE PLANEJADA": "qtdPlanejada",
  "QTDE EFETIVADA": "qtdEfetivada",
};

const COLS_CNC: Mapa = {
  NPLANO: "plano",
  OP: "op",
  QTDPREV: "qtdPrev",
  QTDAPONT: "qtdApont",
};
const COLS_CNC_OPCIONAIS: Mapa = {
  NLOTE: "lote",
  DATACRIACAO: "criadoEm",
  QTDSUCATA: "qtdSucata",
  DESCRICAOOP: "descricaoOp",
  STATUS: "status",
  QTDEMP: "qtdEmp",
  QTDMPFINAL: "qtdMpFinal",
  "STATUS OP": "statusOp",
  POS: "pos",
};

/** Legenda da coluna STATUS da aba CNC_PCQ (status da OP no RM). */
export const LEGENDA_STATUS_OP: Record<number, string> = {
  0: "Planejada",
  2: "Programada",
  3: "Parcialmente Apontada",
  5: "Apontada",
  6: "Cancelada",
};

function nomeColuna(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Acha a linha de cabeçalho nas primeiras linhas da aba: a que tem todas as colunas obrigatórias. */
function acharCabecalho(linhas: Linhas, obrigatorias: Mapa, aba: string): number {
  const nomes = Object.keys(obrigatorias);
  let melhor = { i: -1, faltando: nomes };
  for (let i = 0; i < Math.min(linhas.length, 20); i++) {
    const presentes = new Set((linhas[i] ?? []).map(nomeColuna));
    const faltando = nomes.filter((n) => !presentes.has(n));
    if (faltando.length === 0) return i;
    if (faltando.length < melhor.faltando.length) melhor = { i, faltando };
  }
  throw new ErroPlanilha(`A aba "${aba}" está sem as colunas: ${melhor.faltando.join(", ")}.`);
}

/** Posição de cada campo. Se a coluna aparece duas vezes, vale a primeira (como na leitura anterior). */
function posicoes(cab: unknown[], obrigatorias: Mapa, opcionais: Mapa = {}): Record<string, number> {
  const todas = { ...obrigatorias, ...opcionais };
  const pos: Record<string, number> = {};
  cab.forEach((v, i) => {
    const campo = todas[nomeColuna(v)];
    if (campo && pos[campo] === undefined) pos[campo] = i;
  });
  return pos;
}

/** Valor que cabe em JSON. Datas viram texto ISO. */
function valor(v: unknown): unknown {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" || typeof v === "string" || typeof v === "boolean") return v;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString();
  return String(v);
}

function linhaParaObjeto(r: unknown[], pos: Record<string, number>): Record<string, unknown> {
  const o: Record<string, unknown> = {};
  for (const [campo, i] of Object.entries(pos)) o[campo] = valor(r[i]);
  return o;
}

function vazio(v: unknown): boolean {
  return v === null || v === undefined || (typeof v === "string" && v.trim() === "");
}

/** Número de série de data do Excel (dias desde 30/12/1899) para "AAAA-MM-DD". */
export function dataExcel(v: unknown): string | null {
  if (typeof v === "number" && Number.isFinite(v) && v > 0) {
    return new Date(Date.UTC(1899, 11, 30) + Math.round(v * 86400000)).toISOString().slice(0, 10);
  }
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString().slice(0, 10);
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  return null;
}

function lerResumo(linhas: Linhas) {
  const h = acharCabecalho(linhas, COLS_RESUMO, "Resumo Geral");
  if (h === 0) throw new ErroPlanilha('A aba "Resumo Geral" precisa da linha de totais acima do cabeçalho.');
  const pos = posicoes(linhas[h], COLS_RESUMO, COLS_RESUMO_OPCIONAIS);
  const tarefas: Record<string, unknown>[] = [];
  for (const r of linhas.slice(h + 1)) {
    if (!r || vazio(r[pos.codTarefa])) continue;
    tarefas.push(linhaParaObjeto(r, pos));
  }
  const total = linhas[h - 1] ?? [];
  const totais = {
    execucoes: valor(total[pos.execucoes]),
    execPend: valor(total[pos.execPend]),
    qtdPrevisto: valor(total[pos.qtdPrevisto]),
    qtdRealizada: valor(total[pos.qtdRealizada]),
  };
  return { tarefas, totais };
}

function lerComponentes(linhas: Linhas) {
  const h = acharCabecalho(linhas, COLS_COMP, "Componentes");
  const pos = posicoes(linhas[h], COLS_COMP, COLS_COMP_OPCIONAIS);
  const saida: Record<string, unknown>[] = [];
  for (const r of linhas.slice(h + 1)) {
    if (!r || vazio(r[pos.codOrdem])) continue;
    saida.push(linhaParaObjeto(r, pos));
  }
  return saida;
}

function lerDados(linhas: Linhas) {
  const h = acharCabecalho(linhas, COLS_DADOS, "Dados");
  const pos = posicoes(linhas[h], COLS_DADOS);
  const ops = new Map<
    string,
    Record<string, unknown> & { horasPrevistas: number; horasApontadas: number; atividades: number; ativApontadas: number; ativParciais: number }
  >();
  for (const r of linhas.slice(h + 1)) {
    if (!r || vazio(r[pos.op])) continue;
    const op = String(r[pos.op]);
    let o = ops.get(op);
    if (!o) {
      o = {
        op,
        descricao: valor(r[pos.descricao]),
        desenho: valor(r[pos.desenho]),
        tag: valor(r[pos.tag]),
        qtdPlanejada: valor(r[pos.qtdPlanejada]),
        qtdEfetivada: valor(r[pos.qtdEfetivada]),
        horasPrevistas: 0,
        horasApontadas: 0,
        atividades: 0,
        ativApontadas: 0,
        ativParciais: 0,
      };
      ops.set(op, o);
    }
    const hp = r[pos.horasPrevistas];
    const ha = r[pos.horasApontadas];
    if (typeof hp === "number") o.horasPrevistas += hp;
    if (typeof ha === "number") o.horasApontadas += ha;
    o.atividades += 1;
    const st = String(r[pos.status] ?? "")
      .trim()
      .toUpperCase();
    if (st === "APONTADA") o.ativApontadas += 1;
    else if (st === "PARCIALMENTE APONTADA") o.ativParciais += 1;
  }
  return [...ops.values()];
}

function lerPlanos(linhas: Linhas) {
  const h = acharCabecalho(linhas, COLS_CNC, ABA_CNC);
  const pos = posicoes(linhas[h], COLS_CNC, COLS_CNC_OPCIONAIS);
  const saida: Record<string, unknown>[] = [];
  for (const r of linhas.slice(h + 1)) {
    if (!r || vazio(r[pos.plano]) || vazio(r[pos.op])) continue;
    const o = linhaParaObjeto(r, pos);
    o.criadoEm = pos.criadoEm === undefined ? null : dataExcel(r[pos.criadoEm]);
    if (vazio(o.statusOp) && typeof o.status === "number") o.statusOp = LEGENDA_STATUS_OP[o.status] ?? null;
    delete o.status;
    saida.push(o);
  }
  return saida;
}

/** Monta o JSON da carga a partir das linhas de cada aba. A aba CNC_PCQ é opcional. */
export function lerPlanilha(abas: Record<string, Linhas | undefined>, arquivo: string): PlanilhaJson {
  const faltando = ABAS_OBRIGATORIAS.filter((a) => !abas[a]);
  if (faltando.length) throw new ErroPlanilha(`Abas não encontradas: ${faltando.join(", ")}. Confira se é a planilha de saldo.`);

  const { tarefas, totais } = lerResumo(abas["Resumo Geral"] as Linhas);
  const componentes = lerComponentes(abas.Componentes as Linhas);
  const ordens = lerDados(abas.Dados as Linhas);
  const cnc = abas[ABA_CNC];
  const planos = cnc ? lerPlanos(cnc) : [];

  const centros = new Map<string, number>();
  for (const c of componentes) {
    if (vazio(c.centroCusto)) continue;
    const k = String(c.centroCusto);
    centros.set(k, (centros.get(k) ?? 0) + 1);
  }
  const centroCusto = [...centros.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

  return {
    arquivo: arquivo.replace(/\\/g, "/").split("/").pop() ?? arquivo,
    centroCusto,
    totais,
    tarefas,
    componentes,
    ordens,
    planos,
  };
}
