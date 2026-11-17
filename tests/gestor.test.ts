import { describe, expect, it } from "vitest";
import {
  SEM_TAG,
  etapasDeOps,
  faltaParaFabricacao,
  filtrarOps,
  lerFiltroOps,
  linhaExportOp,
  nomeMes,
  ordenarOps,
  pendenciasPorRa,
  rankingTags,
  seriePorMes,
  type OpSemSaldo,
  type SaldoTag,
} from "@/lib/gestor";
import { BOM, montarCsv } from "@/lib/csv";
import { compararCodigo } from "@/lib/regras";

const tag = (t: string, previsto: number, realizado: number, esperado: number): SaldoTag => ({ tag: t, previsto, realizado, esperado, pendentes: 0, ops: 1 });

describe("painel do gestor", () => {
  it("cada OP numa etapa: soma das etapas é o total; etapa desconhecida é ignorada", () => {
    const e = etapasDeOps([
      { etapa: "com-saldo", n: 2782 },
      { etapa: "fabricada-sem-saldo", n: 3378 },
      { etapa: "em-fabricacao", n: 4670 },
      { etapa: "nao-iniciada", n: 5019 },
      { etapa: "sem-atividade", n: 594 },
      { etapa: "outra", n: 9 },
    ]);
    expect(e).toEqual({ total: 16443, comSaldo: 2782, fabricadasSemSaldo: 3378, emFabricacao: 4670, naoIniciadas: 5019, semAtividade: 594 });
  });

  it("pendências por RA na ordem da tela, com a situação vazia no fim", () => {
    const l = pendenciasPorRa([
      { situacao: "Subconjunto (sem RA)", pendentes: 14164, total: 15236 },
      { situacao: "", pendentes: 3, total: 3 },
      { situacao: "RA Pendente", pendentes: 11627, total: 14234 },
      { situacao: "RA gerada", pendentes: 50, total: 7149 },
    ]);
    expect(l.map((x) => x.situacao)).toEqual(["RA Pendente", "RA gerada", "Subconjunto (sem RA)", ""]);
  });

  it("ranking de TAG pelo que falta para acompanhar a fabricação; sem TAG fica à parte", () => {
    const r = rankingTags([tag("A", 100, 90, 95), tag("", 500, 0, 300), tag("B", 100, 0, 80), tag("C", 50, 50, 10)], 2);
    expect(r.top.map((t) => t.tag)).toEqual(["B", "A"]);
    expect(r.semTag?.previsto).toBe(500);
    expect(r).toMatchObject({ comTag: 3, atrasadas: 2 });
    expect(faltaParaFabricacao({ realizado: 50, esperado: 10 })).toBe(0);
  });

  it("um ponto por mês: a última carga do mês", () => {
    const p = (dataRef: string, hora: number, realizado: number) => ({
      dataRef,
      criadoEm: new Date(`${dataRef}T${String(hora).padStart(2, "0")}:00:00Z`),
      previsto: 100,
      realizado,
      esperado: null,
    });
    const s = seriePorMes([p("2026-12-01", 10, 30), p("2026-11-15", 10, 10), p("2026-11-30", 9, 20), p("2026-11-30", 8, 19)]);
    expect(s.map((m) => [m.mes, m.realizado])).toEqual([
      ["2026-11", 20],
      ["2026-12", 30],
    ]);
  });

  it("nome do mês", () => {
    expect(nomeMes("2026-01")).toEqual({ curto: "jan/26", longo: "janeiro de 2026" });
    expect(nomeMes("2026-11").curto).toBe("nov/26");
  });
});

describe("lista das OPs fabricadas sem saldo", () => {
  const op = (cod: string, n: string, tag: string, descricao: string): OpSemSaldo => ({
    cod,
    op: n,
    tag,
    descricao,
    desenho: "090012-35-DA-0229",
    planejada: 1,
    efetivada: 0,
    atividades: 3,
    horasPrevistas: 5.5,
    horasApontadas: 4.4,
    componentes: 2,
    pendentes: 2,
  });
  const lista = [
    op("1.18", "140732/25", "B. PADEYE BP-2", "CH - 01"),
    op("1.10", "99/26", "", "POS. 01 - USINADA"),
    op("1.10", "140592/25", "BUCKET", "CONJUNTO 01"),
    op("1.9", "5/25", "BUCKET", "CALANDRADA"),
  ];

  it("filtra por código, TAG (inclusive sem TAG) e busca sem acento", () => {
    expect(filtrarOps(lista, { codigo: "1.10" }).map((o) => o.op)).toEqual(["99/26", "140592/25"]);
    expect(filtrarOps(lista, { tag: "BUCKET" })).toHaveLength(2);
    expect(filtrarOps(lista, { tag: SEM_TAG }).map((o) => o.op)).toEqual(["99/26"]);
    expect(filtrarOps(lista, { q: "usinada 99" }).map((o) => o.op)).toEqual(["99/26"]);
    expect(filtrarOps(lista, { q: "padeye" })).toHaveLength(1);
  });

  it("ordena pelo código na ordem natural e, dentro dele, pela OP (ano e número)", () => {
    expect(ordenarOps(lista, compararCodigo).map((o) => `${o.cod} ${o.op}`)).toEqual(["1.9 5/25", "1.10 140592/25", "1.10 99/26", "1.18 140732/25"]);
  });

  it("lê os filtros do endereço com limite de tamanho", () => {
    expect(lerFiltroOps({ q: "  bucket ", codigo: "", tag: undefined })).toEqual({ q: "bucket", codigo: undefined, tag: undefined });
    expect(lerFiltroOps({ q: "x".repeat(200) }).q).toHaveLength(80);
  });

  it("exporta em CSV para o Excel (separador ;, vírgula decimal e BOM)", () => {
    const csv = montarCsv(["OP", "Horas"], [linhaExportOp(lista[0]).slice(1, 2).concat([4.4]), ["a;b", null]]);
    expect(csv).toBe(["OP;Horas", "140732/25;4,4", '"a;b";'].join("\r\n"));
    expect(BOM.codePointAt(0)).toBe(0xfeff);
  });
});
