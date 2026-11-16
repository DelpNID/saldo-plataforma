import { AlertCircle, Lock, LogIn } from "lucide-react";
import type { Metadata } from "next";
import { CampoSenha } from "@/components/CampoSenha";
import { LogoAscent } from "@/components/marca/LogoAscent";
import { saudacaoDaHora } from "@/lib/saudacao";
import pacote from "../../../package.json";

export const metadata: Metadata = { title: "Entrar" };

// Anatomia do Login do Visto (src/pages/LoginPage.tsx@f66a6c3): cena escura com a marca e o
// posicionamento à esquerda (só desktop) e o painel de 480px com o filete vermelho à direita.
// Uma cena só (sem carrossel): public/images/cena-ascent.svg, na linguagem das cenas do Visto.

// Origem: delp-visto@f66a6c3 LoginPage.tsx (CLASSE_BOTAO_ENTRAR), igual ao Visto.
const CLASSE_BOTAO_ENTRAR =
  "flex h-14 w-full items-center justify-center gap-2 rounded-btn bg-delp-red text-lg font-semibold text-white shadow-[0_8px_18px_-10px_rgba(204,15,16,0.55)] transition-colors hover:bg-delp-red-dark disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none";
const ERRO = "flex items-start gap-1.5 text-sm font-semibold text-delp-red";

export const dynamic = "force-dynamic"; // a saudação segue o relógio

export default function Login({ searchParams }: { searchParams: { erro?: string; volta?: string } }) {
  const configurado = Boolean(process.env.ACESSO_SENHA && process.env.SESSAO_SEGREDO);
  const semConfig = !configurado || searchParams.erro === "config";
  const senhaErrada = !semConfig && Boolean(searchParams.erro);

  return (
    <div className="relative flex min-h-screen overflow-hidden bg-bg">
      {/* Cena (só desktop) e o gradiente de leitura do Visto, para o texto do hero ficar legível. */}
      <div className="absolute inset-0 z-0 hidden lg:block" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/cena-ascent.svg" alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-black/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
      </div>

      {/* Hero à esquerda (só desktop): marca + posicionamento. */}
      <div className="z-10 hidden flex-1 flex-col items-start justify-center px-16 lg:flex xl:px-24">
        <h1 className="mb-6">
          <LogoAscent tom="claro" className="w-[272px] xl:w-[326px]" />
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
          <img src="/images/delp-logo.png" alt="Delp Engenharia" className="w-[120px] brightness-0 invert" />
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
              <div className="mb-9 text-center lg:text-left">
                <div className="mb-8 flex justify-center lg:justify-start">
                  <LogoAscent tom="escuro" className="w-[181px]" />
                </div>
                {/* Saudação pelo relógio de Brasília. O Ascent entra com a senha da equipe, então não há nome. */}
                <p className="text-sm font-semibold uppercase tracking-[0.14em] text-delp-red">{saudacaoDaHora()}</p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-txt">Entrar no sistema</h2>
                <p className="mt-1.5 text-base text-txt-2">Subida de saldo do PCP</p>
              </div>

              <form action="/api/login" method="post" className="flex flex-col">
                {semConfig && (
                  <p className={`${ERRO} mb-4 rounded-btn border border-danger bg-danger/10 px-3.5 py-2.5`} role="alert">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                    O acesso ainda não foi configurado no servidor. Fale com o responsável pela plataforma.
                  </p>
                )}
                <CampoSenha rotulo="Senha da equipe" erro={senhaErrada} />
                {senhaErrada && (
                  <p className={`${ERRO} mt-1.5`} id="senha-erro" role="alert">
                    <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                    Senha incorreta.
                  </p>
                )}
                <input type="hidden" name="volta" value={searchParams.volta ?? ""} />
                <button type="submit" className={`mt-5 ${CLASSE_BOTAO_ENTRAR}`}>
                  <LogIn size={20} aria-hidden="true" />
                  Entrar
                </button>
              </form>
            </div>

            {/* Endosso da Delp só fora do desktop (no desktop ele já está no hero). O painel é sempre
                claro, então vai a logo original, que é escura e feita para fundo claro. */}
            <div className="mb-5 flex items-center justify-center gap-3 lg:hidden">
              <span className="text-xs uppercase tracking-widest text-txt-2">Uma plataforma</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/delp-logo.png" alt="Delp Engenharia" className="w-[110px]" />
            </div>

            <div className="border-t border-subtle pt-4 text-center">
              {/* Os dois fatos são verdade no sistema: HTTPS na Vercel e a entrada só com a senha da equipe. */}
              <p className="mb-2 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-xs text-txt-2">
                <Lock size={12} className="shrink-0" aria-hidden="true" />
                Conexão segura · acesso só com a senha da equipe
              </p>
              <p className="select-none text-xs text-txt-2">
                <span className="font-semibold">Ascent</span> — subida de saldo do PCP da Delp Engenharia · v{pacote.version}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
