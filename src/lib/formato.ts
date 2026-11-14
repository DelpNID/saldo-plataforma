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
