import { describe, expect, it } from "vitest";
import { avancoDe, calcularKpis, dataRef, serieDiaria } from "@/lib/kpis";
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
