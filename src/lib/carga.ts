// Transforma o JSON lido da planilha nas linhas do banco e confere os totais.
import { normalizarCodTarefa, numero, statusMaterial, statusSaldo, texto } from "./regras";

export interface PlanilhaJson {
  arquivo: string;
  centroCusto: string;
  totais: { execucoes: unknown; execPend: unknown; qtdPrevisto: unknown; qtdRealizada: unknown };
  tarefas: Record<string, unknown>[];
  componentes: Record<string, unknown>[];
  ordens: Record<string, unknown>[];
}

export interface LinhaTarefa {
  ordem: number;
  codTarefa: string;
  desenho: string;
  descricao: string;
  execucoes: number;
  execPend: number;
  qtdPrevisto: number;
  qtdRealizada: number;
  avanco: number;
  prioridade: string | null;
  totalComp: number;
  pendMaterial: number;
  opsTotal: number;
  opsComSaldo: number;
}

export interface LinhaComponente {
  codOrdem: string;
  codEstrutura: string;
  idAtvOrdem: number | null;
  codigoPrd: string;
  nome: string;
  unidade: string;
  qtdUsada: number;
  apontado: number;
  tarPai: string;
  exec: string;
  tarFilho: string;
  grupo: string;
  previsto: number;
  apontado2: number;
  lote: string | null;
}

export interface LinhaOrdem {
  op: string;
  descricao: string;
  desenho: string;
  tag: string;
  qtdPlanejada: number;
  qtdEfetivada: number;
  horasPrevistas: number;
  horasApontadas: number;
  atividades: number;
  ativApontadas: number;
  ativParciais: number;
}

export interface Divergencia {
  codTarefa: string;
  campo: "QTD PREVISTO" | "QTD REALIZADA";
  planilha: number;
  calculado: number;
}

export interface CargaPreparada {
  projeto: string;
  centroCusto: string;
  totais: { execucoes: number; execPend: number; previsto: number; realizado: number };
  tarefas: LinhaTarefa[];
  componentes: LinhaComponente[];
  ordens: LinhaOrdem[];
  divergencias: Divergencia[];
}

/** "Saldo Raia 7896 - Modelo.xlsx" vira "Raia 7896". */
export function projetoDoArquivo(arquivo: string): string {
  return texto(arquivo)
    .replace(/\.xls[xm]?$/i, "")
    .replace(/^saldo\s+/i, "")
    .replace(/\s*-\s*modelo$/i, "")
    .trim();
}

const TOLERANCIA = 0.001;

export function prepararCarga(json: PlanilhaJson, projeto?: string): CargaPreparada {
  const componentes: LinhaComponente[] = json.componentes.map((c) => {
    const codigoPrd = texto(c.codigoPrd);
    const lote = texto(c.lote);
    const idAtv = numero(c.idAtvOrdem);
    return {
      codOrdem: texto(c.codOrdem),
      codEstrutura: texto(c.codEstrutura),
      idAtvOrdem: c.idAtvOrdem === null || c.idAtvOrdem === undefined ? null : Math.trunc(idAtv),
      codigoPrd,
      nome: texto(c.nome),
      unidade: texto(c.unidade),
      qtdUsada: numero(c.qtdUsada),
      apontado: numero(c.apontado),
      tarPai: normalizarCodTarefa(c.tarPai),
      exec: texto(c.exec),
      tarFilho: normalizarCodTarefa(c.tarFilho),
      grupo: texto(c.grupo) || codigoPrd.slice(0, 6),
      previsto: numero(c.previsto),
      apontado2: numero(c.apontado2),
      lote: lote === "" ? null : lote,
    };
  });

  // Índices por tarefa pai
  const porPai = new Map<string, LinhaComponente[]>();
  for (const c of componentes) {
    const l = porPai.get(c.tarPai) ?? [];
    l.push(c);
    porPai.set(c.tarPai, l);
  }

  const divergencias: Divergencia[] = [];
  const tarefas: LinhaTarefa[] = json.tarefas.map((t, i) => {
    const codTarefa = texto(t.codTarefa);
    const comps = porPai.get(codTarefa) ?? [];
    const qtdPrevisto = numero(t.qtdPrevisto);
    const qtdRealizada = numero(t.qtdRealizada);
    const somaPrev = comps.reduce((s, c) => s + c.previsto, 0);
    const somaReal = comps.reduce((s, c) => s + c.apontado2, 0);
    if (Math.abs(somaPrev - qtdPrevisto) > TOLERANCIA) divergencias.push({ codTarefa, campo: "QTD PREVISTO", planilha: qtdPrevisto, calculado: somaPrev });
    if (Math.abs(somaReal - qtdRealizada) > TOLERANCIA) divergencias.push({ codTarefa, campo: "QTD REALIZADA", planilha: qtdRealizada, calculado: somaReal });
    const ops = new Map<string, LinhaComponente>();
    for (const c of comps) if (!ops.has(c.codOrdem)) ops.set(c.codOrdem, c);
    const prioridade = texto(t.prioridade);
    return {
      ordem: i + 1,
      codTarefa,
      desenho: texto(t.desenho),
      descricao: texto(t.descricao),
      execucoes: numero(t.execucoes),
      execPend: numero(t.execPend),
      qtdPrevisto,
      qtdRealizada,
      avanco: numero(t.avanco),
      prioridade: prioridade === "" ? null : prioridade,
      totalComp: comps.length,
      pendMaterial: comps.filter((c) => statusMaterial(c.apontado) === "pendente").length,
      opsTotal: ops.size,
      opsComSaldo: [...ops.values()].filter((c) => statusSaldo(c.previsto, c.apontado2) === "ok").length,
    };
  });

  const ordens: LinhaOrdem[] = json.ordens.map((o) => ({
    op: texto(o.op),
    descricao: texto(o.descricao),
    desenho: texto(o.desenho),
    tag: texto(o.tag),
    qtdPlanejada: numero(o.qtdPlanejada),
    qtdEfetivada: numero(o.qtdEfetivada),
    horasPrevistas: numero(o.horasPrevistas),
    horasApontadas: numero(o.horasApontadas),
    atividades: Math.trunc(numero(o.atividades)),
    ativApontadas: Math.trunc(numero(o.ativApontadas)),
    ativParciais: Math.trunc(numero(o.ativParciais)),
  }));

  const totais = {
    execucoes: numero(json.totais.execucoes),
    execPend: numero(json.totais.execPend),
    previsto: numero(json.totais.qtdPrevisto),
    realizado: numero(json.totais.qtdRealizada),
  };
  const somaPrev = tarefas.reduce((s, t) => s + t.qtdPrevisto, 0);
  const somaReal = tarefas.reduce((s, t) => s + t.qtdRealizada, 0);
  if (Math.abs(somaPrev - totais.previsto) > TOLERANCIA) divergencias.push({ codTarefa: "TOTAL", campo: "QTD PREVISTO", planilha: totais.previsto, calculado: somaPrev });
  if (Math.abs(somaReal - totais.realizado) > TOLERANCIA) divergencias.push({ codTarefa: "TOTAL", campo: "QTD REALIZADA", planilha: totais.realizado, calculado: somaReal });

  return {
    projeto: projeto?.trim() || projetoDoArquivo(json.arquivo),
    centroCusto: texto(json.centroCusto),
    totais,
    tarefas,
    componentes,
    ordens,
    divergencias,
  };
}
