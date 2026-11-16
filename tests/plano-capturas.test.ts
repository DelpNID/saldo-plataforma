import { describe, expect, it } from "vitest";
import { planoDeCapturas } from "../scripts/plano-capturas";

const TELAS = ["gestao", "importar", "inexistente", "linhagem", "login", "painel", "pendencias", "retrabalho", "tarefa"];

describe("planoDeCapturas", () => {
  const plano = planoDeCapturas("1.18");
  const base = plano.filter((c) => c.modo === "pagina" && !c.impressao && !c.armazenamento);

  it("fotografa as 9 telas inteiras em 1526 e 390, nos dois temas", () => {
    expect(base).toHaveLength(36);
    expect([...new Set(base.map((c) => c.nome))].sort()).toEqual([...TELAS].sort());
  });

  it("soma 51 capturas com as variantes de impressão, rolagem, tema salvo e barra recolhida", () => {
    expect(plano).toHaveLength(51);
  });

  it("aponta cada tela para o caminho certo", () => {
    const caminho = (nome: string) => plano.find((c) => c.nome === nome)?.caminho;
    expect(caminho("painel")).toBe("/");
    expect(caminho("linhagem")).toBe("/linhagem");
    expect(caminho("pendencias")).toBe("/pendencias");
    expect(caminho("tarefa")).toBe("/tarefa/1.18");
    expect(caminho("retrabalho")).toBe("/tarefa/RETRABALHO");
    expect(caminho("importar")).toBe("/importar");
    expect(caminho("gestao")).toBe("/gestao");
    expect(caminho("inexistente")).toBe("/tarefa/__inexistente__");
    expect(caminho("login")).toBe("/login");
  });

  it("captura o Login sem sessão e o resto com sessão", () => {
    for (const c of plano) expect(c.logado).toBe(c.nome !== "login");
  });

  it("imprime pendências e tarefa na largura de uma folha A4, no tema claro", () => {
    const impressao = plano.filter((c) => c.impressao);
    expect(impressao.map((c) => c.nome).sort()).toEqual(["pendencias", "tarefa"]);
    for (const c of impressao) {
      expect(c.largura).toBe(794);
      expect(c.tema).toBe("claro");
    }
  });

  it("rola as telas com blocos parados, em 1526 e 390", () => {
    const roladas = plano.filter((c) => c.modo === "rolado");
    expect(roladas).toHaveLength(10);
    expect([...new Set(roladas.map((c) => c.nome))].sort()).toEqual(["linhagem", "painel", "pendencias", "retrabalho", "tarefa"]);
  });

  it("testa o tema escuro salvo com o sistema claro, e a barra recolhida", () => {
    const salvo = plano.filter((c) => c.armazenamento?.["ascent.tema"] === "escuro");
    expect(salvo).toHaveLength(2);
    for (const c of salvo) expect(c.tema).toBe("claro");
    const recolhida = plano.filter((c) => c.armazenamento?.["ascent.barra-recolhida"] === "1");
    expect(recolhida.map((c) => [c.nome, c.largura])).toEqual([["painel", 1526]]);
  });

  it("nomeia os arquivos sem repetir", () => {
    const arquivos = plano.map((c) => c.arquivo);
    expect(arquivos).toContain("gestao-390-escuro.png");
    expect(arquivos).toContain("tarefa-794-claro-impressao.png");
    expect(arquivos).toContain("painel-390-claro-rolado.png");
    expect(arquivos).toContain("painel-1526-claro-salvo-escuro.png");
    expect(arquivos).toContain("painel-1526-claro-barra-recolhida.png");
    expect(new Set(arquivos).size).toBe(plano.length);
  });

  it("codifica o código de tarefa no caminho", () => {
    expect(planoDeCapturas("1/2").find((c) => c.nome === "tarefa")?.caminho).toBe("/tarefa/1%2F2");
  });
});
