import { describe, expect, it } from "vitest";
import { GRUPOS_MENU, estaAtivo, trilhaDaRota } from "../src/lib/navegacao";

const item = (para: string) => GRUPOS_MENU.flatMap((g) => g.itens).find((i) => i.para === para)!;

describe("menu lateral", () => {
  it("tem a ordem de hoje: Acompanhamento (Painel, Linhagem, Pendências, Gestão) e Dados (Atualizar)", () => {
    expect(GRUPOS_MENU.map((g) => [g.titulo, g.itens.map((i) => i.rotulo)])).toEqual([
      ["Acompanhamento", ["Painel", "Linhagem", "Pendências", "Gestão"]],
      ["Dados", ["Atualizar"]],
    ]);
  });

  it("acende o Painel na raiz e nas tarefas, e só nelas", () => {
    expect(estaAtivo(item("/"), "/")).toBe(true);
    expect(estaAtivo(item("/"), "/tarefa/1.18")).toBe(true);
    expect(estaAtivo(item("/"), "/linhagem")).toBe(false);
    expect(estaAtivo(item("/"), "/tarefas-antigas")).toBe(false);
  });

  it("acende cada item na própria tela", () => {
    expect(estaAtivo(item("/linhagem"), "/linhagem")).toBe(true);
    expect(estaAtivo(item("/pendencias"), "/pendencias")).toBe(true);
    expect(estaAtivo(item("/pendencias"), "/linhagem")).toBe(false);
  });
});

describe("trilha do topo", () => {
  it("nomeia as telas do menu", () => {
    expect(trilhaDaRota("/")).toEqual([{ rotulo: "Painel" }]);
    expect(trilhaDaRota("/linhagem")).toEqual([{ rotulo: "Linhagem" }]);
    expect(trilhaDaRota("/importar")).toEqual([{ rotulo: "Atualizar" }]);
    expect(trilhaDaRota("/gestao")).toEqual([{ rotulo: "Gestão" }]);
  });

  it("põe a tarefa debaixo do Painel, com o código decodificado", () => {
    expect(trilhaDaRota("/tarefa/1.18")).toEqual([{ rotulo: "Painel", para: "/" }, { rotulo: "Tarefa 1.18" }]);
    expect(trilhaDaRota("/tarefa/1%2F2").at(-1)).toEqual({ rotulo: "Tarefa 1/2" });
  });

  it("não inventa trilha para caminho desconhecido", () => {
    expect(trilhaDaRota("/qualquer")).toEqual([]);
  });
});
