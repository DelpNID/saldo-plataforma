// Origem: delp-visto@f66a6c3 src/lib/formato.test.ts (bloco saudacaoDaHora; só o import mudou)
import { describe, expect, it } from "vitest";
import { saudacaoDaHora } from "../src/lib/saudacao";

describe("saudacaoDaHora", () => {
  // As datas vão em UTC: São Paulo é UTC-3 o ano inteiro.
  it("vira pelo relógio de Brasília, não pelo da máquina", () => {
    expect(saudacaoDaHora(new Date("2026-09-11T12:00:00Z"))).toBe("Bom dia"); // 09h
    expect(saudacaoDaHora(new Date("2026-09-11T18:00:00Z"))).toBe("Boa tarde"); // 15h
    expect(saudacaoDaHora(new Date("2026-09-11T23:00:00Z"))).toBe("Boa noite"); // 20h
  });

  it("pega as bordas do dia", () => {
    expect(saudacaoDaHora(new Date("2026-09-11T03:00:00Z"))).toBe("Bom dia"); // 00h
    expect(saudacaoDaHora(new Date("2026-09-11T14:59:00Z"))).toBe("Bom dia"); // 11h59
    expect(saudacaoDaHora(new Date("2026-09-11T15:00:00Z"))).toBe("Boa tarde"); // 12h
    expect(saudacaoDaHora(new Date("2026-09-11T20:59:00Z"))).toBe("Boa tarde"); // 17h59
    expect(saudacaoDaHora(new Date("2026-09-11T21:00:00Z"))).toBe("Boa noite"); // 18h
  });
});
