const cacheNum = new Map<number, Intl.NumberFormat>();

/** Número no padrão brasileiro, até `casas` decimais. */
export function num(n: number, casas = 0): string {
  let f = cacheNum.get(casas);
  if (!f) {
    f = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: casas, minimumFractionDigits: 0 });
    cacheNum.set(casas, f);
  }
  return f.format(n);
}

/** 0,1811 vira "18,1%". */
export function pct(fracao: number): string {
  return `${num(fracao * 100, 1)}%`;
}

const dataHora = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function quando(d: Date): string {
  return dataHora.format(d).replace(",", " às");
}

/** "2025-09-15" vira "15/09/2025" (sem fuso: a data vem da planilha). */
export function dataCurta(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}
