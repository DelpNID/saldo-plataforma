import { describe, expect, it } from "vitest";
import { COOKIE_BARRA, cookieDaBarra, recolhidaPeloCookie } from "../src/lib/barra-recolhida";

// A barra recolhida tem de sair certa já do servidor (sem o salto de 192px a cada carregamento):
// a escolha vai também num cookie, que o layout lê.
describe("barra recolhida no cookie", () => {
  it("só recolhe com o valor '1'", () => {
    expect(recolhidaPeloCookie("1")).toBe(true);
    expect(recolhidaPeloCookie("0")).toBe(false);
    expect(recolhidaPeloCookie(undefined)).toBe(false);
    expect(recolhidaPeloCookie("sim")).toBe(false);
  });

  it("grava para o site inteiro, por um ano", () => {
    expect(COOKIE_BARRA).toBe("ascent.barra-recolhida");
    expect(cookieDaBarra(true)).toBe("ascent.barra-recolhida=1; path=/; max-age=31536000; samesite=lax");
    expect(cookieDaBarra(false)).toBe("ascent.barra-recolhida=0; path=/; max-age=31536000; samesite=lax");
  });
});
