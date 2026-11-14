import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { COOKIE, DURACAO_S, criarSessao, destinoSeguro } from "@/lib/sessao";

export const runtime = "nodejs";

const Entrada = z.object({
  senha: z.string().min(1).max(200),
  volta: z.string().max(500).optional(),
});

function iguais(a: string, b: string): boolean {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export async function POST(req: Request) {
  const base = new URL(req.url);
  const senhaEquipe = process.env.ACESSO_SENHA;
  const segredo = process.env.SESSAO_SEGREDO;
  if (!senhaEquipe || !segredo) return NextResponse.redirect(new URL("/login?erro=config", base), 303);

  const form = await req.formData();
  const p = Entrada.safeParse({ senha: form.get("senha"), volta: form.get("volta") ?? undefined });
  const volta = destinoSeguro(p.success ? p.data.volta : undefined);

  if (!p.success || !iguais(p.data.senha, senhaEquipe)) {
    await new Promise((r) => setTimeout(r, 800)); // freia tentativa repetida
    const u = new URL("/login", base);
    u.searchParams.set("erro", "1");
    if (volta !== "/") u.searchParams.set("volta", volta);
    return NextResponse.redirect(u, 303);
  }

  const res = NextResponse.redirect(new URL(volta, base), 303);
  res.cookies.set(COOKIE, await criarSessao(segredo), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: DURACAO_S,
  });
  return res;
}
