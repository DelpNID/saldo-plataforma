// Saldo × Fabricação nas telas: a decisão da main (commit 3797179, 16/11) levada para o padrão do Visto.
// Cada lugar fica como era (%, "x de y" e a barra do saldo) e ganha só a barra da fabricação logo
// embaixo e a linha "■ Fabricação X% · ▼ Atraso de N p.p." (nos destaques, com quanto falta).
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Avanco, BarrasSaldo, LinhaFabric, faltaFabric } from "@/components/Etiquetas";
import { num, pct } from "@/lib/formato";

const html = (el: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(el);
const barras = (h: string) => (h.match(/role="presentation"/g) ?? []).length;
const texto = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

describe("Avanco", () => {
  it("sem fabricação: %, rótulo e uma barra só", () => {
    const h = html(createElement(Avanco, { valor: 0.55, rotulo: "55 de 100" }));
    expect(barras(h)).toBe(1);
    expect(texto(h)).toBe(`${pct(0.55)} 55 de 100`);
  });

  it("com fabricação: mantém %, rótulo e barra do saldo, e acrescenta a barra e a linha da fabricação", () => {
    const h = html(createElement(Avanco, { valor: 0.55, rotulo: "55 de 100", fabric: 0.8 }));
    expect(barras(h)).toBe(2);
    const t = texto(h);
    expect(t.startsWith(`${pct(0.55)} 55 de 100`)).toBe(true); // o bloco de antes continua na frente
    expect(t).toContain(`Fabricação ${pct(0.8)}`);
    expect(t).toContain(`▼ Atraso de ${num(25, 1)} p.p.`);
    expect(t).not.toContain("faltam"); // nas listas, a linha curta
  });
});

describe("BarrasSaldo", () => {
  it("sem fabricação desenha só a barra do saldo", () => {
    expect(barras(html(createElement(BarrasSaldo, { saldo: 0.4, fabric: null })))).toBe(1);
  });
  it("com fabricação desenha a barra do saldo e a da fabricação", () => {
    expect(barras(html(createElement(BarrasSaldo, { saldo: 0.4, fabric: 0.6 })))).toBe(2);
  });
});

describe("LinhaFabric", () => {
  it("nos destaques diz quanto falta subir para acompanhar a fabricação", () => {
    const t = texto(html(createElement(LinhaFabric, { saldo: 0.55, fabric: 0.8, falta: 25 })));
    expect(t).toContain(`Fabricação ${pct(0.8)}`);
    expect(t).toContain(`▼ Atraso de ${num(25, 1)} p.p. · faltam ${num(25, 1)} para acompanhar a fabricação`);
  });
  it("saldo à frente da fabricação fica escrito", () => {
    expect(texto(html(createElement(LinhaFabric, { saldo: 0.9, fabric: 0.7 })))).toContain(`▲ ${num(20, 1)} p.p. à frente`);
  });
});

describe("faltaFabric", () => {
  it("é o que falta subir para o realizado alcançar a fabricação", () => {
    expect(faltaFabric(0.8, 100, 55)).toBe(25);
  });
  it("é zero quando o saldo já alcançou a fabricação", () => {
    expect(faltaFabric(0.5, 100, 70)).toBe(0);
  });
});
