import { describe, expect, it } from "vitest";
import { criarSessao, destinoSeguro, sessaoValida } from "@/lib/sessao";
import { prepararCarga, projetoDoArquivo, type PlanilhaJson } from "@/lib/carga";

describe("sessão", () => {
  it("aceita a sessão assinada com o mesmo segredo", async () => {
    const s = await criarSessao("segredo-a");
    expect(await sessaoValida(s, "segredo-a")).toBe(true);
  });
  it("recusa segredo diferente, sessão adulterada, vencida ou ausente", async () => {
    const s = await criarSessao("segredo-a");
    expect(await sessaoValida(s, "segredo-b")).toBe(false);
    expect(await sessaoValida(s.replace(/^\d+/, "9999999999"), "segredo-a")).toBe(false);
    expect(await sessaoValida(s, "segredo-a", Date.now() + 8 * 24 * 3600 * 1000)).toBe(false);
    expect(await sessaoValida(undefined, "segredo-a")).toBe(false);
    expect(await sessaoValida(s, undefined)).toBe(false);
  });
  it("só redireciona para caminho interno", () => {
    expect(destinoSeguro("/tarefa/1.01")).toBe("/tarefa/1.01");
    expect(destinoSeguro("//site.com")).toBe("/");
    expect(destinoSeguro("https://site.com")).toBe("/");
    expect(destinoSeguro(null)).toBe("/");
  });
});

describe("carga", () => {
  const json: PlanilhaJson = {
    arquivo: "Saldo Raia 7896 - Modelo.xlsx",
    centroCusto: "3.07896.32.001",
    totais: { execucoes: 2, execPend: 1, qtdPrevisto: 3, qtdRealizada: 1 },
    tarefas: [{ codTarefa: "1.01", desenho: "D", descricao: "X", execucoes: 2, execPend: 1, qtdPrevisto: 3, qtdRealizada: 1, avanco: 1 / 3 }],
    componentes: [
      { codOrdem: "1/26", codEstrutura: "R", codigoPrd: "01.018.1", tarPai: "1.01", tarFilho: 0, exec: "1", previsto: 2, apontado2: 1, apontado: 0, qtdUsada: 5 },
      { codOrdem: "2/26", codEstrutura: "S", codigoPrd: "03.023.2", tarPai: "1.01", tarFilho: "ALHO", exec: "1", previsto: 1, apontado2: 0, apontado: 1, qtdUsada: 1 },
      { codOrdem: "3/26", codEstrutura: "T", codigoPrd: "01.053.3", tarPai: "ALHO", tarFilho: 0, exec: null, previsto: 1, apontado2: 1, apontado: 0, qtdUsada: 1 },
    ],
    ordens: [],
  };

  it("tira o nome do projeto do arquivo", () => {
    expect(projetoDoArquivo("Saldo Raia 7896 - Modelo.xlsx")).toBe("Raia 7896");
  });

  it("normaliza códigos, calcula pendências e não acusa divergência quando os totais batem", () => {
    const c = prepararCarga(json);
    expect(c.divergencias).toEqual([]);
    expect(c.componentes.map((x) => x.tarFilho)).toEqual(["0", "RETRABALHO", "0"]);
    expect(c.componentes[2].tarPai).toBe("RETRABALHO");
    expect(c.componentes[0].grupo).toBe("01.018");
    expect(c.tarefas[0]).toMatchObject({ totalComp: 2, pendMaterial: 1, opsTotal: 2, opsComSaldo: 0 });
  });

  it("acusa divergência quando a planilha não foi recalculada", () => {
    const c = prepararCarga({ ...json, tarefas: [{ ...json.tarefas[0], qtdPrevisto: 10 }] });
    expect(c.divergencias.map((d) => `${d.codTarefa}:${d.campo}`)).toContain("1.01:QTD PREVISTO");
  });
});
