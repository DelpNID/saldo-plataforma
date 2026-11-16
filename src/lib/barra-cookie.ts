// O cookie da barra lateral recolhida. Sem hooks de propósito: o layout de SERVIDOR
// (src/app/(app)/layout.tsx) lê daqui, e não pode importar o barra-recolhida.ts (que tem hooks).

/** O nome do cookie (o mesmo da chave do localStorage). */
export const COOKIE_BARRA = "ascent.barra-recolhida";

/** O valor do cookie vira o estado inicial da barra no servidor. */
export function recolhidaPeloCookie(valor: string | undefined): boolean {
  return valor === "1";
}

/** A linha `document.cookie` que guarda a escolha para o servidor. */
export function cookieDaBarra(recolhida: boolean): string {
  return `${COOKIE_BARRA}=${recolhida ? "1" : "0"}; path=/; max-age=31536000; samesite=lax`;
}
