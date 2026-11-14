// Sessão assinada com HMAC. Roda no middleware (edge) e nas rotas (node): usa só Web Crypto.

export const COOKIE = "saldo_sessao";
export const DURACAO_S = 60 * 60 * 24 * 7; // 7 dias

const enc = new TextEncoder();

async function chave(segredo: string) {
  return crypto.subtle.importKey("raw", enc.encode(segredo), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

function paraB64url(buf: ArrayBuffer): string {
  let s = "";
  for (const b of new Uint8Array(buf)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function deB64url(s: string): Uint8Array<ArrayBuffer> {
  const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}

export async function criarSessao(segredo: string, agoraMs = Date.now()): Promise<string> {
  const exp = Math.floor(agoraMs / 1000) + DURACAO_S;
  const sig = await crypto.subtle.sign("HMAC", await chave(segredo), enc.encode(`v1.${exp}`));
  return `${exp}.${paraB64url(sig)}`;
}

export async function sessaoValida(valor: string | undefined, segredo: string | undefined, agoraMs = Date.now()): Promise<boolean> {
  if (!valor || !segredo) return false;
  const [expTxt, sig] = valor.split(".");
  const exp = Number(expTxt);
  if (!Number.isInteger(exp) || exp * 1000 < agoraMs || !sig) return false;
  try {
    return await crypto.subtle.verify("HMAC", await chave(segredo), deB64url(sig), enc.encode(`v1.${exp}`));
  } catch {
    return false;
  }
}

/** Só aceita caminho interno ("/algo"), para o login não virar redirecionamento aberto. */
export function destinoSeguro(v: string | null | undefined): string {
  if (!v || !v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return "/";
  return v;
}
