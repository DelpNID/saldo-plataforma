// Abre o arquivo .xlsx com o SheetJS e devolve as linhas das abas que a carga usa.
// Usado no navegador (worker da tela Atualizar dados) e no comando `npm run carga`.
import * as XLSX from "xlsx";
import { ABAS_OBRIGATORIAS, ABA_CNC, ErroPlanilha, type Linhas } from "./planilha";

export function abasDoArquivo(dados: ArrayBuffer | Uint8Array): Record<string, Linhas> {
  let wb: XLSX.WorkBook;
  try {
    wb = XLSX.read(dados, {
      type: dados instanceof ArrayBuffer ? "array" : "buffer",
      dense: true,
      cellDates: false, // datas chegam como número de série; a conversão é feita em planilha.ts
      cellFormula: false,
      cellHTML: false,
      cellText: false,
      cellStyles: false,
      sheets: [...ABAS_OBRIGATORIAS, ABA_CNC], // a aba Arvore não é lida: a plataforma recalcula a árvore
    });
  } catch {
    throw new ErroPlanilha("Não consegui abrir o arquivo. Confira se é um .xlsx salvo pelo Excel.");
  }
  const abas: Record<string, Linhas> = {};
  for (const nome of wb.SheetNames) {
    const ws = wb.Sheets[nome];
    if (!ws) continue;
    // Valor guardado pelo Excel (resultado da fórmula). Célula com erro (#N/D) vem vazia.
    abas[nome.trim()] = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, raw: true, defval: null, blankrows: true });
  }
  return abas;
}
