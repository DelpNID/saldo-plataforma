import { describe, expect, it } from "vitest";
import { COM_LEGENDA_ESCRITA, COR_ASCENT, DEGRAU, ESCALA_VERMELHOS, SELO_TOM, TOM_DA_CLASSE } from "../src/lib/cores";
import { rotuloMaterial } from "../src/lib/regras";

describe("escala de vermelhos dos gráficos (regra do Visto)", () => {
  it("lê os seis degraus dos tokens do tema", () => {
    expect(ESCALA_VERMELHOS[1]).toBe("rgb(var(--vermelho-1))");
    expect(ESCALA_VERMELHOS[6]).toBe("rgb(var(--vermelho-6))");
  });

  it("não põe degraus vizinhos no mesmo gráfico Saldo × Fabricação", () => {
    expect(Math.abs(DEGRAU.saldo - DEGRAU.fabricacao)).toBeGreaterThanOrEqual(2);
  });

  it("só usa os degraus 1 e 2 onde o rótulo vai escrito ao lado", () => {
    for (const [nome, degrau] of Object.entries(DEGRAU)) {
      if (!COM_LEGENDA_ESCRITA.has(nome as keyof typeof DEGRAU)) expect(degrau, nome).toBeGreaterThanOrEqual(3);
    }
  });

  it("dá ao Saldo o degrau 5 e à Fabricação o 3", () => {
    expect(COR_ASCENT.saldo).toBe("rgb(var(--vermelho-5))");
    expect(COR_ASCENT.fabricacao).toBe("rgb(var(--vermelho-3))");
    expect(COR_ASCENT.grade).toBe("rgb(var(--grade))");
  });
});

describe("situação vira tom de selo", () => {
  it("cobre todas as classes do material apontado", () => {
    expect(TOM_DA_CLASSE[rotuloMaterial(0, 1).classe]).toBe("success");
    expect(TOM_DA_CLASSE[rotuloMaterial(1, 1).classe]).toBe("danger");
    expect(TOM_DA_CLASSE[rotuloMaterial(1, 2).classe]).toBe("warning");
    expect(TOM_DA_CLASSE.neutro).toBe("neutral");
  });

  it("escreve o ritmo com as cores de texto que passam AA", () => {
    expect(SELO_TOM).toEqual({ danger: "text-delp-red", success: "text-success-forte", warning: "text-warning-forte", neutro: "text-txt-muted" });
  });
});
