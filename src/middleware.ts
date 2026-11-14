import { NextResponse, type NextRequest } from "next/server";
import { COOKIE, sessaoValida } from "@/lib/sessao";

// Toda tela exige sessão válida. Sem SESSAO_SEGREDO configurado, nada abre.
export async function middleware(req: NextRequest) {
  const ok = await sessaoValida(req.cookies.get(COOKIE)?.value, process.env.SESSAO_SEGREDO);
  if (ok) return NextResponse.next();

  const url = req.nextUrl.clone();
  const volta = req.nextUrl.pathname + req.nextUrl.search;
  url.pathname = "/login";
  url.search = "";
  if (volta !== "/") url.searchParams.set("volta", volta);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|api/login|_next/static|_next/image|favicon.ico|delp-logo.png|robots.txt).*)"],
};
