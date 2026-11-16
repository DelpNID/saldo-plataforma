// O Ascent tem só o tema claro (pedido do responsável, 16/11/2026): sem modo noturno, sem botão
// para trocar e sem script de tema. Esta guarda falha se alguma peça de troca de tema voltar.
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const RAIZ = path.resolve(__dirname, "..");
const ler = (arquivo: string) => readFileSync(path.join(RAIZ, arquivo), "utf8");

function arquivosDe(pasta: string): string[] {
  return readdirSync(path.join(RAIZ, pasta)).flatMap((nome) => {
    const rel = path.join(pasta, nome);
    return statSync(path.join(RAIZ, rel)).isDirectory() ? arquivosDe(rel) : /\.(tsx?|css)$/.test(nome) ? [rel] : [];
  });
}

describe("tema único (claro)", () => {
  it("o CSS só define os tokens claros", () => {
    const css = ler("src/app/globals.css");
    expect(css).not.toMatch(/data-tema/);
    expect(css).not.toMatch(/color-scheme:\s*dark/);
    expect(css).toMatch(/color-scheme:\s*light/);
  });

  it("o navegador recebe só a cor clara da barra (sem variação para o escuro)", () => {
    expect(ler("src/app/layout.tsx")).not.toMatch(/prefers-color-scheme/);
  });

  it("nenhum arquivo de src troca de tema", () => {
    const pecas = /data-tema|ascent\.tema|so-tema-|BotaoTema|SeletorTema|IniciarTema|SCRIPT_TEMA|useTema/;
    const comTema = arquivosDe("src").filter((f) => pecas.test(readFileSync(path.join(RAIZ, f), "utf8")));
    expect(comTema).toEqual([]);
  });
});
