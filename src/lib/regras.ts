// Regras de negócio da subida de saldo. Funções puras, cobertas por tests/regras.test.ts.

export const RETRABALHO = "RETRABALHO";
export const MATERIAL_DIRETO = "0";

/** Converte o valor da célula em número. Vazio ou texto inválido vira 0. */
export function numero(v: unknown): number {
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "string") {
    const n = Number(v.trim().replace(",", "."));
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

export function texto(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

/**
 * Normaliza o código de tarefa vindo da planilha.
 * - "ALHO" é o final de "RETRABALHO" cortado pela fórmula RIGHT(...;4): vira RETRABALHO.
 * - 0 (número) é o retorno do XLOOKUP quando o componente não é estrutura: material direto.
 */
export function normalizarCodTarefa(v: unknown): string {
  const t = texto(v);
  if (t === "" || t === "0") return MATERIAL_DIRETO;
  if (t.toUpperCase() === "ALHO" || t.toUpperCase() === RETRABALHO) return RETRABALHO;
  return t;
}

export type StatusMaterial = "pendente" | "apontado";

/** Coluna APONTADO da aba Componentes: 0 = material ainda não apontado (pendente de baixa). */
export function statusMaterial(apontado: number): StatusMaterial {
  return apontado > 0 ? "apontado" : "pendente";
}

/** Texto do material: todas as linhas apontadas, nenhuma, ou parte delas (peça em mais de uma OP). */
export function rotuloMaterial(pendentes: number, linhas: number): { classe: "ok" | "pend" | "parcial"; texto: string } {
  if (pendentes === 0) return { classe: "ok", texto: "Apontado" };
  if (pendentes >= linhas) return { classe: "pend", texto: "Não apontado" };
  return { classe: "parcial", texto: `Falta em ${pendentes} de ${linhas} OPs` };
}

export type StatusSaldo = "ok" | "parcial" | "sem-saldo" | "sem-dado";

/** Saldo da OP: QTDE EFETIVADA comparada com QTDE PLANEJADA (aba Dados). */
export function statusSaldo(planejada: number, efetivada: number): StatusSaldo {
  if (planejada <= 0) return efetivada > 0 ? "ok" : "sem-dado";
  if (efetivada >= planejada - 1e-9) return "ok";
  if (efetivada > 0) return "parcial";
  return "sem-saldo";
}

export type SituacaoTarefa = "concluida" | "andamento" | "sem-avanco";

export function situacaoTarefa(avanco: number): SituacaoTarefa {
  if (avanco >= 0.9999) return "concluida";
  if (avanco > 0) return "andamento";
  return "sem-avanco";
}

export const ROTULO_SITUACAO: Record<SituacaoTarefa, string> = {
  concluida: "Concluída",
  andamento: "Em andamento",
  "sem-avanco": "Sem avanço",
};

export const ROTULO_SALDO: Record<StatusSaldo, string> = {
  ok: "Saldo subido",
  parcial: "Saldo parcial",
  "sem-saldo": "Sem saldo",
  "sem-dado": "OP sem dado",
};

/** Texto curto da descrição: a planilha repete "Qtd. / Cód. Tarefa / desenho" depois do nome. */
export function descricaoCurta(descricao: string): string {
  const d = texto(descricao).replace(/\s+/g, " ");
  const corte = d.search(/\s-\sQtd\.\s/i);
  return corte > 0 ? d.slice(0, corte) : d;
}

/** Grupo de tarefas pelo prefixo do código (1.xx, 2.xx...). */
export function grupoTarefa(cod: string): string {
  const m = /^(\d+)\./.exec(cod);
  return m ? `${m[1]}.xx` : "Outros";
}

/** Ordena códigos como 1.2 < 1.10 < 2.1. */
export function compararCodigo(a: string, b: string): number {
  const pa = a.split(".").map((x) => Number(x));
  const pb = b.split(".").map((x) => Number(x));
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? -1;
    const y = pb[i] ?? -1;
    if (Number.isNaN(x) || Number.isNaN(y)) return a.localeCompare(b);
    if (x !== y) return x - y;
  }
  return 0;
}

// ---------- Plano de corte (coluna CNC da aba Componentes + aba CNC_PCQ) ----------

/**
 * Planos da coluna CNC. 0 ou vazio = sem plano de corte.
 * Quando a OP entra em mais de um plano, a planilha junta os códigos com vírgula ("CNC0007581,CNC0007585").
 */
export function planosDaColuna(v: unknown): string[] {
  const vistos = new Set<string>();
  for (const parte of texto(v).toUpperCase().split(/[,;]/)) {
    const p = parte.replace(/\s+/g, "");
    if (p !== "" && p !== "0") vistos.add(p);
  }
  return [...vistos];
}

/** Valor guardado no banco: os planos da coluna CNC separados por vírgula, ou null. */
export function normalizarPlano(v: unknown): string | null {
  const planos = planosDaColuna(v);
  return planos.length ? planos.join(",") : null;
}

/** Matéria-prima que costuma passar por plano de corte (CNC ou PA/PC). */
export function usaPlanoDeCorte(nome: string): boolean {
  return /^(CHAPA|TUBO|PERFIL|BARRA)\b/i.test(texto(nome));
}

export type TipoPlano = "CNC" | "PA/PC" | "Outro";

/** CNC = corte CNC (chapa). PA = plano de corte de tubo, perfil e barra (PA/PC). */
export function tipoPlano(plano: string): TipoPlano {
  if (plano.startsWith("CNC")) return "CNC";
  if (plano.startsWith("PA")) return "PA/PC";
  return "Outro";
}

export type StatusCorte = "apontado" | "parcial" | "pendente";

/** Corte da OP no plano: QTDAPONT comparado com QTDPREV (aba CNC_PCQ). */
export function statusCorte(qtdPrev: number, qtdApont: number): StatusCorte {
  if (qtdApont <= 0) return "pendente";
  if (qtdPrev > 0 && qtdApont < qtdPrev - 1e-9) return "parcial";
  return "apontado";
}

export const ROTULO_CORTE: Record<StatusCorte, string> = {
  apontado: "Corte apontado",
  parcial: "Corte parcial",
  pendente: "Corte não apontado",
};

// ---------- Origem do saldo (tarefas filhas) ----------

export type TipoOrigem = "material" | "propria" | "outra" | "retrabalho";

export interface CompBase {
  codOrdem: string;
  codEstrutura: string;
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
  cnc?: string | null;
}

export interface Origem {
  tarFilho: string;
  tipo: TipoOrigem;
  previsto: number;
  realizado: number;
  componentes: number;
  pendentes: number;
}

export function tipoOrigem(pai: string, filho: string): TipoOrigem {
  if (filho === MATERIAL_DIRETO) return "material";
  if (filho === RETRABALHO) return "retrabalho";
  if (filho === pai) return "propria";
  return "outra";
}

/** Totais de uma tarefa filha já somados (pela tela ou por um agrupamento no banco). */
export type GrupoOrigem = Omit<Origem, "tipo">;

/** Dá o tipo a cada tarefa filha e ordena: própria, outras tarefas, material direto, retrabalho. */
export function agregarOrigens(pai: string, grupos: GrupoOrigem[]): Origem[] {
  const mapa = new Map<string, Origem>();
  for (const g of grupos) {
    let o = mapa.get(g.tarFilho);
    if (!o) {
      o = { tarFilho: g.tarFilho, tipo: tipoOrigem(pai, g.tarFilho), previsto: 0, realizado: 0, componentes: 0, pendentes: 0 };
      mapa.set(g.tarFilho, o);
    }
    o.previsto += g.previsto;
    o.realizado += g.realizado;
    o.componentes += g.componentes;
    o.pendentes += g.pendentes;
  }
  const peso: Record<TipoOrigem, number> = { propria: 0, outra: 1, material: 2, retrabalho: 3 };
  return [...mapa.values()].sort((a, b) => peso[a.tipo] - peso[b.tipo] || compararCodigo(a.tarFilho, b.tarFilho));
}

/** Mesmo agrupamento da aba Arvore: soma de PREVISTO e APONTADO2 por tarefa filha. */
export function resumirOrigens(pai: string, comps: CompBase[]): Origem[] {
  return agregarOrigens(
    pai,
    comps.map((c) => ({
      tarFilho: c.tarFilho,
      previsto: c.previsto,
      realizado: c.apontado2,
      componentes: 1,
      pendentes: statusMaterial(c.apontado) === "pendente" ? 1 : 0,
    })),
  );
}

export function tituloOrigem(o: Pick<Origem, "tipo" | "tarFilho">, pai: string): string {
  if (o.tipo === "material") return "Material direto";
  if (o.tipo === "propria") return `Fabricado nesta tarefa (${pai})`;
  if (o.tipo === "retrabalho") return "Retrabalho";
  return `Tarefa ${o.tarFilho}`;
}

export function descOrigem(o: Pick<Origem, "tipo">): string {
  if (o.tipo === "material") return "Comprados, sem estrutura própria";
  if (o.tipo === "propria") return "Subconjuntos feitos dentro deste código";
  if (o.tipo === "retrabalho") return "Peças que passaram por retrabalho";
  return "Subconjuntos que vêm de outro código de tarefa";
}

// ---------- Árvore de estruturas ----------

export interface OpSaldo {
  op: string;
  planejada: number;
  efetivada: number;
  status: StatusSaldo;
}

export interface ItemArvore {
  codigoPrd: string;
  nome: string;
  unidade: string;
  grupo: string;
  tarFilho: string;
  qtdUsada: number;
  apontado: number;
  linhas: number;
  pendentes: number; // linhas com APONTADO = 0
  planos: { op: string; plano: string }[]; // plano de corte (CNC ou PA/PC) de cada OP onde o item entra
  filho?: NoArvore; // quando o item é uma estrutura fabricada nesta execução
}

export interface NoArvore {
  codEstrutura: string;
  nome: string;
  ops: OpSaldo[];
  planejada: number;
  efetivada: number;
  status: StatusSaldo;
  itens: ItemArvore[];
  pendentesTotal: number; // na subárvore
  opsSemSaldoTotal: number; // na subárvore
}

export interface Execucao {
  exec: string;
  raizes: NoArvore[];
  estruturas: number;
  pendentes: number;
  opsSemSaldo: number;
}

/**
 * Monta a árvore de estruturas de um código de tarefa, por execução.
 * Uma estrutura cujo código aparece como componente de outra estrutura da mesma execução vira filha dela.
 * As raízes são as estruturas que ninguém consome.
 */
export function montarArvore(comps: CompBase[], nomeOp: (op: string) => string | undefined = () => undefined): Execucao[] {
  const porExec = new Map<string, CompBase[]>();
  for (const c of comps) {
    const lista = porExec.get(c.exec) ?? [];
    lista.push(c);
    porExec.set(c.exec, lista);
  }

  const execs: Execucao[] = [];
  for (const [exec, linhas] of porExec) {
    const estruturas = new Map<string, CompBase[]>();
    for (const c of linhas) {
      const l = estruturas.get(c.codEstrutura) ?? [];
      l.push(c);
      estruturas.set(c.codEstrutura, l);
    }
    const nomePorCodigo = new Map<string, string>();
    for (const c of linhas) if (!nomePorCodigo.has(c.codigoPrd)) nomePorCodigo.set(c.codigoPrd, c.nome);
    const consumidas = new Set(linhas.map((c) => c.codigoPrd).filter((p) => estruturas.has(p)));

    const montar = (cod: string, caminho: Set<string>): NoArvore => {
      const rows = estruturas.get(cod) ?? [];
      const opsMap = new Map<string, OpSaldo>();
      for (const r of rows) {
        if (!opsMap.has(r.codOrdem)) {
          opsMap.set(r.codOrdem, { op: r.codOrdem, planejada: r.previsto, efetivada: r.apontado2, status: statusSaldo(r.previsto, r.apontado2) });
        }
      }
      const ops = [...opsMap.values()];
      const planejada = ops.reduce((s, o) => s + o.planejada, 0);
      const efetivada = ops.reduce((s, o) => s + o.efetivada, 0);

      const itensMap = new Map<string, ItemArvore>();
      for (const r of rows) {
        let it = itensMap.get(r.codigoPrd);
        if (!it) {
          it = { codigoPrd: r.codigoPrd, nome: r.nome, unidade: r.unidade, grupo: r.grupo, tarFilho: r.tarFilho, qtdUsada: 0, apontado: 0, linhas: 0, pendentes: 0, planos: [] };
          itensMap.set(r.codigoPrd, it);
        }
        it.qtdUsada += r.qtdUsada;
        it.apontado += r.apontado;
        it.linhas += 1;
        if (statusMaterial(r.apontado) === "pendente") it.pendentes += 1;
        for (const plano of planosDaColuna(r.cnc)) {
          if (!it.planos.some((p) => p.op === r.codOrdem && p.plano === plano)) it.planos.push({ op: r.codOrdem, plano });
        }
      }

      const novoCaminho = new Set(caminho).add(cod);
      let pendentesTotal = 0;
      let opsSemSaldoTotal = ops.filter((o) => o.status !== "ok").length;
      const itens = [...itensMap.values()];
      for (const it of itens) {
        pendentesTotal += it.pendentes;
        if (estruturas.has(it.codigoPrd) && !novoCaminho.has(it.codigoPrd) && novoCaminho.size < 40) {
          it.filho = montar(it.codigoPrd, novoCaminho);
          pendentesTotal += it.filho.pendentesTotal;
          opsSemSaldoTotal += it.filho.opsSemSaldoTotal;
        }
      }
      // estruturas primeiro, depois material pendente, depois o resto
      itens.sort((a, b) => Number(!!b.filho) - Number(!!a.filho) || b.pendentes - a.pendentes || a.codigoPrd.localeCompare(b.codigoPrd));

      const primeiraOp = ops[0]?.op;
      const nome = (primeiraOp && nomeOp(primeiraOp)) || nomePorCodigo.get(cod) || cod;
      return { codEstrutura: cod, nome, ops, planejada, efetivada, status: statusSaldo(planejada, efetivada), itens, pendentesTotal, opsSemSaldoTotal };
    };

    let codRaizes = [...estruturas.keys()].filter((e) => !consumidas.has(e)).sort();
    if (codRaizes.length === 0 && estruturas.size > 0) codRaizes = [[...estruturas.keys()].sort()[0]];
    const raizes = codRaizes.map((c) => montar(c, new Set()));
    const opsDistintas = new Map<string, OpSaldo>();
    for (const c of linhas) opsDistintas.set(c.codOrdem, { op: c.codOrdem, planejada: c.previsto, efetivada: c.apontado2, status: statusSaldo(c.previsto, c.apontado2) });
    execs.push({
      exec,
      raizes,
      estruturas: estruturas.size,
      pendentes: linhas.filter((c) => statusMaterial(c.apontado) === "pendente").length,
      opsSemSaldo: [...opsDistintas.values()].filter((o) => o.status !== "ok").length,
    });
  }
  return execs.sort((a, b) => numero(a.exec) - numero(b.exec) || a.exec.localeCompare(b.exec));
}

// ---------- Filtros de exibição ("Mostrar") — só escolhem o que aparece, não mudam cálculo ----------

/**
 * tudo: sem filtro.
 * nao-baixado: componente "Não apontado" e estrutura com "No pai: Não apontado" (APONTADO = 0 em alguma OP).
 * sem-saldo: estrutura com "Sem saldo" ou "OP sem dado".
 */
export type FiltroMostrar = "tudo" | "nao-baixado" | "sem-saldo";

export function filtroMostrar(v: unknown): FiltroMostrar {
  return v === "nao-baixado" || v === "sem-saldo" ? v : "tudo";
}

/** Estrutura que ainda precisa subir saldo. */
export function faltaSubirSaldo(status: StatusSaldo): boolean {
  return status === "sem-saldo" || status === "sem-dado";
}

/** A estrutura passa no filtro por ela mesma? (`item` = a linha dela na estrutura de cima) */
function estruturaPassa(no: NoArvore, item: ItemArvore | undefined, filtro: FiltroMostrar): boolean {
  if (filtro === "nao-baixado") return !!item && item.pendentes > 0; // mesma contagem da etiqueta "No pai"
  if (filtro === "sem-saldo") return faltaSubirSaldo(no.status);
  return true;
}

/** Componente (sem estrutura própria) passa no filtro? Material não tem saldo de OP, então só entra em "não baixado". */
function componentePassa(it: ItemArvore, filtro: FiltroMostrar): boolean {
  if (filtro === "nao-baixado") return it.pendentes > 0;
  return filtro === "tudo";
}

/** Filtra a árvore. Os níveis acima de um item que passa continuam visíveis. */
export function filtrarArvore(no: NoArvore, filtro: FiltroMostrar, item?: ItemArvore): NoArvore | null {
  if (filtro === "tudo") return no;
  const itens: ItemArvore[] = [];
  for (const it of no.itens) {
    if (it.filho) {
      const filho = filtrarArvore(it.filho, filtro, it);
      if (filho) itens.push({ ...it, filho });
    } else if (componentePassa(it, filtro)) {
      itens.push(it);
    }
  }
  if (itens.length === 0 && !estruturaPassa(no, item, filtro)) return null;
  return { ...no, itens };
}

/** Linha da visão "Pendências do código": estrutura ou componente que tem algo pendente. */
export interface LinhaPendenciaCodigo {
  exec: string;
  tipo: "estrutura" | "componente";
  codigo: string;
  nome: string;
  ops: string[]; // OPs da estrutura (do componente: as da estrutura onde ele entra)
  status?: StatusSaldo;
  planejada?: number;
  efetivada?: number;
  pai?: { pendentes: number; linhas: number }; // situação da estrutura na de cima ("No pai")
  pendentes: number;
  linhas: number;
  qtdUsada?: number;
  apontado?: number;
  unidade?: string;
}

/**
 * Lista plana de todas as execuções do código, na ordem da árvore.
 * "tudo" aqui = todas as pendências: estrutura sem saldo ou não apontada no pai, e componente não apontado.
 */
export function pendenciasDoCodigo(execs: Execucao[], filtro: FiltroMostrar): LinhaPendenciaCodigo[] {
  const linhas: LinhaPendenciaCodigo[] = [];
  const naoBaixado = filtro !== "sem-saldo";
  const semSaldo = filtro !== "nao-baixado";
  const visitar = (exec: string, no: NoArvore, item: ItemArvore | undefined) => {
    const ops = no.ops.map((o) => o.op);
    if ((semSaldo && faltaSubirSaldo(no.status)) || (naoBaixado && !!item && item.pendentes > 0)) {
      linhas.push({
        exec,
        tipo: "estrutura",
        codigo: no.codEstrutura,
        nome: no.nome,
        ops,
        status: no.status,
        planejada: no.planejada,
        efetivada: no.efetivada,
        pai: item ? { pendentes: item.pendentes, linhas: item.linhas } : undefined,
        pendentes: item?.pendentes ?? 0,
        linhas: item?.linhas ?? 0,
      });
    }
    for (const it of no.itens) {
      if (it.filho) visitar(exec, it.filho, it);
      else if (naoBaixado && it.pendentes > 0) {
        linhas.push({
          exec,
          tipo: "componente",
          codigo: it.codigoPrd,
          nome: it.nome,
          ops,
          pendentes: it.pendentes,
          linhas: it.linhas,
          qtdUsada: it.qtdUsada,
          apontado: it.apontado,
          unidade: it.unidade,
        });
      }
    }
  };
  for (const e of execs) for (const r of e.raizes) visitar(e.exec, r, undefined);
  return linhas;
}
