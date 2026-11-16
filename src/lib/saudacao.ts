// Origem: delp-visto@f66a6c3 src/lib/formato.ts (saudacaoDaHora)
/** "Bom dia", "Boa tarde" ou "Boa noite" pelo relógio de Brasília — nunca pelo da máquina (a Vercel roda em UTC). */
export function saudacaoDaHora(data: Date = new Date()): string {
  const hora = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "America/Sao_Paulo",
      hour: "2-digit",
      hourCycle: "h23",
    }).format(data),
  );
  if (hora < 12) return "Bom dia";
  if (hora < 18) return "Boa tarde";
  return "Boa noite";
}
