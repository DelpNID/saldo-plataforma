import { describe, expect, it } from "vitest";
import { avancoDe, buscarCodigos, calcularKpis, dataRef, resumirSelecao, serieDiaria } from "@/lib/kpis";
import { montarArvore, type CompBase } from "@/lib/regras";

describe("KPIs da Gestão", () => {
  it("soma situação dos códigos, pendentes, OPs com saldo e cortes com as regras das outras telas", () => {
    const k = calcularKpis({
      totais: { previsto: 10, realizado: 4, execucoes: 3, execPend: 1.5 },
      tarefas: [{ avanco: 0 }, { avanco: 0.4 }, { avanco: 1 }, { avanco: 0 }],
      componentes: [
        { codOrdem: "1/26", previsto: 1, apontado2: 1, apontado: 0 }, // OP com saldo
        { codOrdem: "1/26", previsto: 1, apontado2: 1, apontado: 2 },
        { codOrdem: "2/26", previsto: 2, apontado2: 1, apontado: 0 }, // saldo parcial
        { codOrdem: "3/26", previsto: 0, apontado2: 0, apontado: 1 }, // OP sem dado
      ],
      planos: [
        { qtdPrev: 1, qtdApont: 1 },
        { qtdPrev: 2, qtdApont: 1 },
        { qtdPrev: 1, qtdApont: 0 },
      ],
    });
    expect(k).toMatchObject({
      previsto: 10,
      realizado: 4,
      tarefas: 4,
      semAvanco: 2,
      andamento: 1,
      concluidas: 1,
      componentes: 4,
      pendentes: 2,
      ops: 3,
      opsComSaldo: 1,
      planos: 3,
      cortesApontados: 1,
    });
    expect(avancoDe(k)).toBeCloseTo(0.4);
  });

  it("data do dia no fuso de São Paulo", () => {
    expect(dataRef(new Date("2026-11-16T02:30:00Z"))).toBe("2026-11-15"); // 23h30 do dia 15 em São Paulo
    expect(dataRef(new Date("2026-11-16T10:09:49Z"))).toBe("2026-11-16");
  });

  it("série do gráfico fica com a última carga de cada dia, em ordem", () => {
    const p = (cargaId: number, iso: string, realizado: number) => ({
      cargaId,
      criadoEm: new Date(iso),
      dataRef: dataRef(new Date(iso)),
      previsto: 100,
      realizado,
      pendentes: 0,
    });
    const serie = serieDiaria([p(7, "2026-11-16T10:00:00Z", 20), p(5, "2026-11-15T19:00:00Z", 18), p(6, "2026-11-15T23:34:00Z", 19)]);
    expect(serie.map((s) => [s.dataRef, s.cargaId])).toEqual([
      ["2026-11-15", 6],
      ["2026-11-16", 7],
    ]);
  });
});

describe("avanço por execução", () => {
  const comp = (p: Partial<CompBase>): CompBase => ({
    codOrdem: "1/26",
    codEstrutura: "E",
    codigoPrd: "X",
    nome: "X",
    unidade: "KG",
    qtdUsada: 1,
    apontado: 0,
    tarPai: "1.01",
    exec: "1",
    tarFilho: "0",
    grupo: "01",
    previsto: 1,
    apontado2: 0,
    ...p,
  });
  it("soma PREVISTO e APONTADO2 dos componentes de cada execução", () => {
    const ex = montarArvore([
      comp({ exec: "1", previsto: 2, apontado2: 1 }),
      comp({ exec: "1", codigoPrd: "Y", previsto: 1, apontado2: 1 }),
      comp({ exec: "2", previsto: 4, apontado2: 0 }),
    ]);
    expect(ex.map((e) => [e.exec, e.previsto, e.realizado])).toEqual([
      ["1", 3, 2],
      ["2", 4, 0],
    ]);
    expect(avancoDe(ex[0])).toBeCloseTo(2 / 3);
  });
});

describe("busca da Gestão", () => {
  const c = (cod: string, descricao: string, desenho: string, previsto: number, realizado: number, pendentes = 0) => ({
    cod,
    descricao,
    desenho,
    previsto,
    realizado,
    avanco: previsto > 0 ? realizado / previsto : 0,
    pendentes,
    componentes: 10,
    execucoes: 2,
    execPend: 1,
  });
  const lista = [
    c("1.46", "PIN PILE BUCKET 26IN LOCKING BAR", "090012-35-DA-0300", 100, 0, 30),
    c("1.52", "PIN PILE BUCKET AXIS PIN", "090012-35-DA-0300", 50, 25, 10),
    c("1.18", "BUOYANCY PADEYE TYPE BP-2", "090012-35-DA-0229", 110, 3, 109),
    c("2.10", "PEÇA DE FIXAÇÃO", "FMC-07896-DP-0001", 10, 10),
  ];

  it("acha por desenho, código ou descrição, sem ligar para acento e maiúscula", () => {
    expect(buscarCodigos(lista, "090012-35-DA-0300").map((t) => t.cod)).toEqual(["1.46", "1.52"]);
    expect(buscarCodigos(lista, "1.18").map((t) => t.cod)).toEqual(["1.18"]);
    expect(buscarCodigos(lista, "pin pile axis").map((t) => t.cod)).toEqual(["1.52"]);
    expect(buscarCodigos(lista, "fixacao").map((t) => t.cod)).toEqual(["2.10"]);
    expect(buscarCodigos(lista, "   ")).toEqual([]);
  });

  it("soma o recorte com realizado ÷ previsto", () => {
    const r = resumirSelecao(buscarCodigos(lista, "pin pile"));
    expect(r).toMatchObject({ codigos: 2, desenhos: 1, previsto: 150, realizado: 25, pendentes: 40, execPend: 2 });
    expect(r.avanco).toBeCloseTo(25 / 150);
  });
});
