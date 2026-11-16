import { Lock } from "lucide-react";
import type { Metadata } from "next";
import { LogoAscent } from "@/components/marca/LogoAscent";
import { Button } from "@/components/ui/Button";
import { CLASSE_CAMPO } from "@/components/ui/Campo";

export const metadata: Metadata = { title: "Entrar" };

// Anatomia do Login do Visto (src/pages/LoginPage.tsx@f66a6c3): cena escura com a marca e o
// posicionamento à esquerda (só desktop) e o painel de 480px com o filete vermelho à direita.
// Sem carrossel: há uma cena só, desenhada aqui com a grade sutil das cenas do Visto e os
// triângulos da marca como marca d'água (o mesmo gesto do FaixaDaMarca).
// Exceção declarada em docs/visto-desvios.md: a cena usa cores fixas (é arte, sempre escura).
const FUNDO_CENA = "radial-gradient(circle at 50% 45%, #1E1E1E, #050505 75%)";

function Cena() {
  return (
    <div className="absolute inset-0 hidden lg:block" aria-hidden="true" style={{ background: FUNDO_CENA }}>
      <svg className="h-full w-full text-delp-red">
        <defs>
          <pattern id="grade-cena" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M80 0H0V80" fill="none" stroke="#FFFFFF" strokeOpacity="0.035" strokeWidth="1" />
          </pattern>
          {/* Os três triângulos em escada da logo, ampliados como marca d'água. */}
          <pattern id="triangulos-ascent" width="1100" height="900" patternUnits="userSpaceOnUse" patternTransform="scale(0.32)">
            <g fill="currentColor" stroke="currentColor" strokeLinejoin="round" style={{ opacity: 0.055 }} transform="translate(30 900)">
              <path d="M0,-40 L300,-40 L150.0,-310.0 Z" strokeWidth="27" />
              <path d="M250,-230 L630,-230 L440.0,-572.0 Z" strokeWidth="34" />
              <path d="M560,-440 L1040,-440 L800.0,-872.0 Z" strokeWidth="43" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grade-cena)" />
        <rect width="100%" height="100%" fill="url(#triangulos-ascent)" />
      </svg>
      {/* Gradiente de leitura (o mesmo do Visto): o texto do hero fica legível sobre a cena. */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-black/25" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
    </div>
  );
}

export default function Login({ searchParams }: { searchParams: { erro?: string; volta?: string } }) {
  const configurado = Boolean(process.env.ACESSO_SENHA && process.env.SESSAO_SEGREDO);
  const semConfig = !configurado || searchParams.erro === "config";
  const senhaErrada = !semConfig && Boolean(searchParams.erro);
  const erro = "rounded-btn border border-danger bg-danger/10 px-3.5 py-2.5 text-sm font-semibold text-delp-red";

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-bg-2">
      <Cena />

      {/* Hero à esquerda (só desktop): marca + posicionamento. */}
      <div className="z-10 hidden flex-1 flex-col items-start justify-center px-16 lg:flex xl:px-24">
        <h1 className="mb-6">
          <LogoAscent tom="claro" className="w-[300px] xl:w-[360px]" />
        </h1>
        <p className="mb-3 max-w-md text-2xl font-semibold leading-snug text-white xl:text-3xl">
          O saldo de cada projeto, do que já subiu ao que falta baixar.
        </p>
        <p className="max-w-md text-lg leading-relaxed text-white/70">
          O Ascent acompanha a subida de saldo de cada projeto para o PCP e a gestão: o que já subiu, o que falta e qual componente está pendente de
          baixa.
        </p>
        {/* Endosso: o Ascent é o produto, a Delp é a casa. brightness-0 + invert deixam o logo branco sobre a cena. */}
        <div className="mt-12 flex items-center gap-3">
          <span className="text-xs uppercase tracking-widest text-white/50">Uma plataforma</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/delp-logo.png" alt="Delp Engenharia" className="w-[120px] brightness-0 invert" />
        </div>
      </div>

      {/* Painel do formulário à direita (tela cheia fora do desktop). */}
      <div className="relative z-10 flex min-h-screen w-full flex-col lg:w-[480px] lg:min-w-[480px]">
        <div className="absolute inset-0 bg-bg lg:shadow-strong" aria-hidden="true" />
        {/* Filete da marca no topo do painel — o mesmo gesto do Visto. */}
        <div className="absolute inset-x-0 top-0 z-10 h-1 bg-delp-red" aria-hidden="true" />

        <div className="relative z-10 flex flex-1 flex-col px-6 py-8 sm:px-10 lg:px-12">
          {/* Fora do desktop o hero (e seu h1) some: este h1 mantém a hierarquia para leitor de tela. */}
          <h1 className="sr-only lg:hidden">Ascent — subida de saldo</h1>

          <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col lg:max-w-none">
            <div className="flex flex-1 flex-col justify-center py-6">
              <LogoAscent className="mb-8 w-[180px] lg:hidden" />
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-delp-red">PCP · Subida de saldo</p>
              <h2 className="mt-2 text-2xl font-bold leading-tight text-txt">Entrar</h2>

              <form action="/api/login" method="post" className="mt-6 flex flex-col gap-4">
                {semConfig && (
                  <p className={erro} role="alert">
                    O acesso ainda não foi configurado no servidor. Fale com o responsável pela plataforma.
                  </p>
                )}
                <label htmlFor="senha" className="flex flex-col gap-1.5 text-sm font-semibold text-txt">
                  Senha da equipe
                  <input
                    id="senha"
                    name="senha"
                    type="password"
                    className={CLASSE_CAMPO}
                    autoComplete="current-password"
                    required
                    autoFocus
                    aria-invalid={senhaErrada ? true : undefined}
                    aria-describedby={senhaErrada ? "senha-erro" : undefined}
                  />
                </label>
                {senhaErrada && (
                  <p className={erro} id="senha-erro" role="alert">
                    Senha incorreta.
                  </p>
                )}
                <input type="hidden" name="volta" value={searchParams.volta ?? ""} />
                <Button type="submit" className="w-full">
                  Entrar
                </Button>
              </form>
            </div>

            {/* Endosso da Delp só fora do desktop (no desktop ele já está no hero). */}
            <div className="mb-5 flex items-center justify-center gap-3 lg:hidden">
              <span className="text-[10px] uppercase tracking-[0.14em] text-txt-2">Uma plataforma</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/delp-logo.png" alt="Delp Engenharia" className="w-[96px]" />
            </div>
            <p className="flex items-center justify-center gap-1.5 border-t border-subtle pt-4 text-center text-xs text-txt-2">
              <Lock size={12} className="shrink-0" aria-hidden="true" />
              Acesso só com a senha da equipe.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
