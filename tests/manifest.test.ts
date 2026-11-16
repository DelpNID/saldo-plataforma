import { describe, expect, it } from "vitest";
import manifest from "../src/app/manifest";
import { config } from "../src/middleware";

describe("manifest do app instalado", () => {
  const m = manifest();

  it("chama o sistema de Ascent", () => {
    expect(m.name).toBe("Ascent");
    expect(m.short_name).toBe("Ascent");
  });

  it("abre na Gestão, com as cores do padrão do Visto", () => {
    expect(m.start_url).toBe("/gestao");
    expect(m.background_color).toBe("#F5F5F5");
    expect(m.theme_color).toBe("#FFFFFF");
  });

  it("tem ícone comum de 192 e 512 e um maskable próprio", () => {
    expect(m.icons).toContainEqual({ src: "/icons/icone-192.png", sizes: "192x192", type: "image/png" });
    expect(m.icons).toContainEqual({ src: "/icons/icone-512.png", sizes: "512x512", type: "image/png" });
    expect(m.icons).toContainEqual({ src: "/icons/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" });
  });
});

describe("o que abre sem sessão (matcher do middleware)", () => {
  // O matcher lista o que EXIGE sessão: casou, passa pelo middleware.
  const exigeSessao = (caminho: string) => new RegExp(`^${config.matcher[0]}$`).test(caminho);

  it("deixa as artes e os ícones do Login abrirem sem sessão", () => {
    expect(exigeSessao("/images/ascent-logo-negativo.svg")).toBe(false);
    expect(exigeSessao("/icons/ascent-icone.svg")).toBe(false);
    expect(exigeSessao("/login")).toBe(false);
  });

  it("continua exigindo sessão nas telas e em caminhos parecidos", () => {
    expect(exigeSessao("/")).toBe(true);
    expect(exigeSessao("/gestao")).toBe(true);
    expect(exigeSessao("/imagesx")).toBe(true);
    expect(exigeSessao("/api/importar")).toBe(true);
  });
});
