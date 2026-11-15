import { describe, expect, it } from "vitest";
import { ErroPlanilha, dataExcel, lerPlanilha, type Linhas } from "@/lib/planilha";
import { prepararCarga } from "@/lib/carga";
import { montarArvore, normalizarPlano, planosDaColuna, statusCorte, tipoPlano, usaPlanoDeCorte } from "@/lib/regras";

// A tabela começa na coluna B, como na planilha: a leitura acha as colunas pelo nome
const resumo: Linhas = [
  [null, null, null, null, 2, 1, 3, 1, null, null], // linha de totais
  [null, "DESENHO", "CODTAREFA", "DESCRIÇÃO", "EXECUÇÕES", "EXEC. PEND", "QTD PREVISTO", "QTD REALIZADA", "% AVANÇO SALDO", "PRIORIDADE"],
  [null, "D-1", "1.01", "DOP", 2, 1, 3, 1, 1 / 3, null],
  [null, null, null, null, null, null, null, null, null, null],
];

const cabComp = ["CODORDEM", "CODESTRUTURA", "IDATVORDEM", "QTDUSADA", "APONTADO", "CODIGOPRD", "NOMEFANTASIA", "CODUNDCONTROLE", "CODCCUSTO", "RESPONSAVEL", "CNC", "Cod.Tar Pai", "EXEC", "Cod.Tar Filho", "COD2", "PREVISTO", "APONTADO2", "LOTE"];
const componentes: Linhas = [
  cabComp,
  ["10/25", "03.023.1", 1, 1, 0, "01.018.9", "CHAPA S355", "KG", "3.07896", null, "CNC0006233", "1.01", 1, 0, "01.018", 2, 1, ""],
  ["11/25", "03.023.2", 1, 1, 5, "01.053.1", "TUBO", "KG", "3.07896", null, " pa8.371", "1.01", 1, 0, "01.053", 1, 0, null],
  [null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null, null],
];

const dados: Linhas = [
  ["OP", "TAG", "DESCRIÇÃOOP", "DESENHO", "STATUS", "HORAS PREVISTA", "HORAS APONTADAS", "QTDE PLANEJADA", "QTDE EFETIVADA"],
  ["10/25", "T", "CH - 1", "D-1", "APONTADA", 2, 2, 2, 1],
  ["10/25", "T", "CH - 1", "D-1", "PARCIALMENTE APONTADA", 1, 0.5, 2, 1],
];

const cnc: Linhas = [
  [],
  ["Controle de CNC "],
  [],
  ["QTDPREV", "NPLANO", "ID", "OP", "OS", "QTDAPONT", "IDLOTE", "DATACRIACAO", "QTDSUCATA", "NLOTE", "DESCRICAOOP", "STATUS", "QTDEMP", "QTDMPFINAL", "STATUS OP", "POS", null, "OP", "CNCs"],
  [1, "CNC0006233", 1, "10/25", "3.07896", 1, 99, 45915.881, 288.7, "231018", "CH - 1", 5, 5152, 429.3, "Apontada", "2 ", null, "10/25", "CNC0006233"],
  [2, "CNC0006233", 1, "12/25", "3.07896", 0, 99, 45915.881, 288.7, "231018", "CH - 3", 2, 5152, 100, null, "3 ", null, null, null],
];

describe("leitura da planilha", () => {
  it("monta tarefas, totais, componentes, OPs e planos de corte", () => {
    const j = lerPlanilha({ "Resumo Geral": resumo, Componentes: componentes, Dados: dados, CNC_PCQ: cnc }, "C:\\pasta\\Saldo Raia 7896 - Modelo.xlsx");
    expect(j.arquivo).toBe("Saldo Raia 7896 - Modelo.xlsx");
    expect(j.totais).toEqual({ execucoes: 2, execPend: 1, qtdPrevisto: 3, qtdRealizada: 1 });
    expect(j.tarefas).toHaveLength(1);
    expect(j.tarefas[0]).toMatchObject({ codTarefa: "1.01", desenho: "D-1", qtdPrevisto: 3 });
    expect(j.componentes).toHaveLength(2);
    expect(j.componentes[0]).toMatchObject({ codOrdem: "10/25", cnc: "CNC0006233" });
    expect(j.centroCusto).toBe("3.07896");
    expect(j.ordens).toEqual([
      expect.objectContaining({ op: "10/25", atividades: 2, ativApontadas: 1, ativParciais: 1, horasPrevistas: 3, horasApontadas: 2.5 }),
    ]);
    expect(j.planos).toHaveLength(2);
    expect(j.planos?.[0]).toMatchObject({ plano: "CNC0006233", op: "10/25", qtdPrev: 1, qtdApont: 1, criadoEm: "2025-09-15", statusOp: "Apontada", lote: "231018" });
    // STATUS OP vazio: usa a legenda da coluna STATUS
    expect(j.planos?.[1]).toMatchObject({ statusOp: "Programada" });
  });

  it("aceita a planilha antiga, sem a aba CNC_PCQ e sem a coluna CNC", () => {
    const semCnc = componentes.map((r) => r.filter((_, i) => i !== 10));
    const j = lerPlanilha({ "Resumo Geral": resumo, Componentes: semCnc, Dados: dados }, "x.xlsx");
    expect(j.planos).toEqual([]);
    expect(j.componentes[0].cnc).toBeUndefined();
  });

  it("explica o que falta quando a planilha não é a de saldo", () => {
    expect(() => lerPlanilha({ Componentes: componentes, Dados: dados }, "x.xlsx")).toThrow(ErroPlanilha);
    expect(() => lerPlanilha({ "Resumo Geral": resumo, Componentes: componentes, Dados: dados }, "x.xlsx")).not.toThrow();
    const semApontado = componentes.map((r, i) => (i === 0 ? r.map((c) => (c === "APONTADO" ? "OUTRA" : c)) : r));
    expect(() => lerPlanilha({ "Resumo Geral": resumo, Componentes: semApontado, Dados: dados }, "x.xlsx")).toThrow(/APONTADO/);
  });

  it("converte a data do Excel sem depender do fuso", () => {
    expect(dataExcel(45915.881)).toBe("2025-09-15");
    expect(dataExcel("2025-09-15T21:09:32")).toBe("2025-09-15");
    expect(dataExcel(null)).toBeNull();
    expect(dataExcel("ontem")).toBeNull();
  });
});

describe("plano de corte", () => {
  it("normaliza o código da coluna CNC", () => {
    expect(normalizarPlano(" cnc0006233 ")).toBe("CNC0006233");
    expect(normalizarPlano(0)).toBeNull();
    expect(normalizarPlano("0")).toBeNull();
    expect(normalizarPlano(null)).toBeNull();
    // OP em mais de um plano: a planilha junta os códigos com vírgula
    expect(planosDaColuna("CNC0007581, cnc0007585,CNC0007581")).toEqual(["CNC0007581", "CNC0007585"]);
    expect(normalizarPlano("CNC0007581, PA10.081")).toBe("CNC0007581,PA10.081");
    expect(usaPlanoDeCorte("CHAPA S355 J2N 101,6")).toBe(true);
    expect(usaPlanoDeCorte("PARAFUSO M20")).toBe(false);
    expect(tipoPlano("CNC0006233")).toBe("CNC");
    expect(tipoPlano("PA8.371")).toBe("PA/PC");
    expect(tipoPlano("787")).toBe("Outro");
  });

  it("diz se o corte da OP foi apontado", () => {
    expect(statusCorte(1, 1)).toBe("apontado");
    expect(statusCorte(2, 1)).toBe("parcial");
    expect(statusCorte(2, 0)).toBe("pendente");
    expect(statusCorte(0, 1)).toBe("apontado");
  });

  it("liga o componente à linha da aba CNC_PCQ e conta os que ficam de fora", () => {
    const j = lerPlanilha({ "Resumo Geral": resumo, Componentes: componentes, Dados: dados, CNC_PCQ: cnc }, "x.xlsx");
    const c = prepararCarga(j);
    expect(c.componentes.map((x) => x.cnc)).toEqual(["CNC0006233", "PA8.371"]);
    expect(c.planos.map((p) => p.tipo)).toEqual(["CNC", "CNC"]);
    expect(c.cncSemControle).toBe(1); // PA8.371 da OP 11/25 não está na aba
  });

  it("guarda o plano de cada OP no item da árvore", () => {
    const base = { codEstrutura: "E", nome: "CHAPA", unidade: "KG", qtdUsada: 1, apontado: 0, tarPai: "1.01", exec: "1", tarFilho: "0", grupo: "01.018", previsto: 1, apontado2: 0, codigoPrd: "01.018.9" };
    const [exec] = montarArvore([
      { ...base, codOrdem: "10/25", cnc: "CNC1" },
      { ...base, codOrdem: "11/25", cnc: "CNC2" },
      { ...base, codOrdem: "11/25", cnc: "CNC2" },
      { ...base, codOrdem: "12/25", cnc: null },
      { ...base, codOrdem: "13/25", cnc: "CNC3,PA4" },
    ]);
    expect(exec.raizes[0].itens[0].planos).toEqual([
      { op: "10/25", plano: "CNC1" },
      { op: "11/25", plano: "CNC2" },
      { op: "13/25", plano: "CNC3" },
      { op: "13/25", plano: "PA4" },
    ]);
  });
});
