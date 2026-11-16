import { describe, expect, it } from "vitest";
import { SCRIPT_TEMA } from "../src/lib/tema-script";

/** Roda o script inline do <head> num ambiente falso e devolve o data-tema aplicado. */
function rodar({ salvo, sistemaEscuro = false, storageQuebrado = false }: { salvo?: string; sistemaEscuro?: boolean; storageQuebrado?: boolean }) {
  const atributos = new Map<string, string>();
  const ambiente = {
    localStorage: {
      getItem: (chave: string) => {
        if (storageQuebrado) throw new Error("bloqueado");
        return chave === "ascent.tema" ? (salvo ?? null) : null;
      },
    },
    matchMedia: (consulta: string) => ({ matches: consulta.includes("dark") && sistemaEscuro }),
    document: { documentElement: { setAttribute: (nome: string, valor: string) => atributos.set(nome, valor) } },
  };
  new Function("localStorage", "matchMedia", "document", SCRIPT_TEMA)(ambiente.localStorage, ambiente.matchMedia, ambiente.document);
  return atributos.get("data-tema");
}

describe("script do tema antes da primeira pintura", () => {
  it("usa o tema salvo", () => {
    expect(rodar({ salvo: "escuro" })).toBe("escuro");
    expect(rodar({ salvo: "claro", sistemaEscuro: true })).toBe("claro");
  });

  it("sem escolha salva, segue o sistema", () => {
    expect(rodar({ sistemaEscuro: true })).toBe("escuro");
    expect(rodar({ sistemaEscuro: false })).toBe("claro");
    expect(rodar({ salvo: "sistema", sistemaEscuro: true })).toBe("escuro");
  });

  it("com o armazenamento bloqueado, cai no claro sem quebrar", () => {
    expect(rodar({ storageQuebrado: true, sistemaEscuro: true })).toBe("claro");
  });

  it("lê a chave do Ascent", () => {
    expect(SCRIPT_TEMA).toContain("'ascent.tema'");
  });
});
