// Detalhe nos cards do Painel (pedido do responsável, 16/11/2026): cada card ganha o desenho da parte
// e o número escrito, com o que o Painel já calcula — nenhuma regra nova.
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FaixaSituacao, FeitoDoTotal } from "@/components/Etiquetas";
import { Segmentado } from "@/components/ui/Segmentado";
import { num, pct } from "@/lib/formato";

const texto = (h: string) => h.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

describe("FaixaSituacao", () => {
  const h = renderToStaticMarkup(createElement(FaixaSituacao, { semAvanco: 147, andamento: 62, concluidas: 0 }));

  it("escreve cada situação com o número e a parte do total", () => {
    const t = texto(h);
    expect(t).toContain(`Sem avanço ${num(147)} ${pct(147 / 209)}`);
    expect(t).toContain(`Em andamento ${num(62)} ${pct(62 / 209)}`);
    expect(t).toContain(`Concluída ${num(0)} ${pct(0)}`);
  });

  it("desenha uma barra só, dividida pelas situações que têm código", () => {
    expect((h.match(/role="presentation"/g) ?? []).length).toBe(1);
    expect((h.match(/data-parte=/g) ?? []).length).toBe(2); // concluída com zero não ocupa espaço
  });

  it("sem nenhum código não divide por zero", () => {
    expect(texto(renderToStaticMarkup(createElement(FaixaSituacao, { semAvanco: 0, andamento: 0, concluidas: 0 })))).toContain(
      `Sem avanço ${num(0)} ${pct(0)}`,
    );
  });
});

describe("FeitoDoTotal", () => {
  it("mostra o que já foi feito e a parte do total, com a barra", () => {
    const h = renderToStaticMarkup(createElement(FeitoDoTotal, { feito: 85.2, total: 1002, rotulo: "executadas", casas: 1 }));
    expect(texto(h)).toContain(`${num(85.2, 1)} executadas · ${pct(85.2 / 1002)} do total`);
    expect((h.match(/role="presentation"/g) ?? []).length).toBe(1);
  });

  it("com total zero fica em 0%", () => {
    expect(texto(renderToStaticMarkup(createElement(FeitoDoTotal, { feito: 0, total: 0, rotulo: "já baixados" })))).toContain(
      `${num(0)} já baixados · ${pct(0)} do total`,
    );
  });
});

describe("Segmentado", () => {
  it("a opção escolhida fica em vermelho, as outras não", () => {
    const h = renderToStaticMarkup(
      createElement(Segmentado<"a" | "b">, {
        opcoes: [
          { id: "a", rotulo: "Todas" },
          { id: "b", rotulo: "Sem avanço" },
        ],
        valor: "a",
        aoTrocar: () => {},
        ariaLabel: "Situação",
      }),
    );
    const botoes = h.match(/<button[^>]*>/g) ?? [];
    expect(botoes).toHaveLength(2);
    expect(botoes[0]).toContain('aria-pressed="true"');
    expect(botoes[0]).toMatch(/bg-delp-red/);
    expect(botoes[0]).toMatch(/text-white/);
    expect(botoes[1]).not.toMatch(/bg-delp-red/);
  });
});
