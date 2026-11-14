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

/** Mesmo agrupamento da aba Arvore: soma de PREVISTO e APONTADO2 por tarefa filha. */
export function resumirOrigens(pai: string, comps: CompBase[]): Origem[] {
  const mapa = new Map<string, Origem>();
  for (const c of comps) {
    let o = mapa.get(c.tarFilho);
    if (!o) {
      o = { tarFilho: c.tarFilho, tipo: tipoOrigem(pai, c.tarFilho), previsto: 0, realizado: 0, componentes: 0, pendentes: 0 };
      mapa.set(c.tarFilho, o);
    }
    o.previsto += c.previsto;
    o.realizado += c.apontado2;
    o.componentes += 1;
    if (statusMaterial(c.apontado) === "pendente") o.pendentes += 1;
  }
  const peso: Record<TipoOrigem, number> = { propria: 0, outra: 1, material: 2, retrabalho: 3 };
  return [...mapa.values()].sort((a, b) => peso[a.tipo] - peso[b.tipo] || compararCodigo(a.tarFilho, b.tarFilho));
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
          it = { codigoPrd: r.codigoPrd, nome: r.nome, unidade: r.unidade, grupo: r.grupo, tarFilho: r.tarFilho, qtdUsada: 0, apontado: 0, linhas: 0, pendentes: 0 };
          itensMap.set(r.codigoPrd, it);
        }
        it.qtdUsada += r.qtdUsada;
        it.apontado += r.apontado;
        it.linhas += 1;
        if (statusMaterial(r.apontado) === "pendente") it.pendentes += 1;
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

/** Remove da árvore o que já está resolvido (saldo subido e material apontado). */
export function soOQueFalta(no: NoArvore): NoArvore | null {
  const itens: ItemArvore[] = [];
  for (const it of no.itens) {
    const filho = it.filho ? soOQueFalta(it.filho) : undefined;
    if (filho || it.pendentes > 0) itens.push({ ...it, filho: filho ?? undefined });
  }
  if (itens.length === 0 && no.status === "ok") return null;
  return { ...no, itens };
}
