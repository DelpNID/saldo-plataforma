// CSV para abrir no Excel em pt-BR: separador ";", decimal com vírgula e BOM no começo
// (sem o BOM o Excel lê os acentos errado). Usado pelo botão Exportar e pelas rotas de exportação.
export type Celula = string | number | null | undefined;

export function celulaCsv(v: Celula): string {
  if (v === null || v === undefined) return "";
  const t = typeof v === "number" ? v.toLocaleString("pt-BR", { useGrouping: false, maximumFractionDigits: 3 }) : v;
  return /[";\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

export const BOM = "﻿";

export function montarCsv(cabecalho: string[], linhas: Celula[][]): string {
  return [cabecalho, ...linhas].map((r) => r.map(celulaCsv).join(";")).join("\r\n");
}
