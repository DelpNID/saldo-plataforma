"use client";

// Origem: delp-visto@f66a6c3 src/components/layout/Topbar.tsx
// Desvios: a trilha sai de trilhaDaRota (src/lib/navegacao.ts) em vez dos grupos
//   por papel do Visto; a casinha diz "Ascent"; à direita, o seletor de projeto, o
//   botão de tema e o Sair (o Ascent não tem sino nem menu da conta — senha de
//   equipe); next/link e next/navigation; some na impressão. Ver docs/visto-desvios.md.
import { ChevronRight, Home, LogOut, Menu } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { RefObject } from 'react';
import { trilhaDaRota } from '../../lib/navegacao';
import { SeletorProjeto, type ProjetoOpcao } from '../SeletorProjeto';
import { buttonVariants } from '../ui/Button';
import { BotaoTema } from './BotaoTema';

interface TopbarProps {
  onOpenMenu: () => void;
  menuButtonRef: RefObject<HTMLButtonElement>;
  projetos: ProjetoOpcao[];
}

export function Topbar({ onOpenMenu, menuButtonRef, projetos }: TopbarProps) {
  const pathname = usePathname();
  const trilha = trilhaDaRota(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-16 shrink-0 items-center gap-3 border-b border-subtle bg-bg px-4 md:px-6 print:hidden">
      <button
        ref={menuButtonRef}
        type="button"
        onClick={onOpenMenu}
        aria-label="Abrir menu de navegação"
        className="-ml-2 flex h-11 w-11 items-center justify-center rounded-btn text-txt-2 hover:bg-bg-2 shell:hidden"
      >
        <Menu size={22} aria-hidden="true" />
      </button>

      <nav aria-label="Trilha de navegação" className="min-w-0 flex-1">
        <ol className="flex items-center gap-1.5 text-sm">
          <li className="shrink-0">
            <Link
              href="/"
              className="flex min-h-11 items-center gap-1.5 rounded-btn px-1.5 py-1 font-medium text-txt-2 transition-colors hover:bg-bg-2 hover:text-delp-red"
            >
              <Home size={15} aria-hidden="true" />
              <span className="hidden sm:inline">Ascent</span>
              <span className="sr-only sm:hidden">Ascent</span>
            </Link>
          </li>
          {trilha.map((crumb, i) => {
            const ehUltimo = i === trilha.length - 1;
            return (
              <li key={crumb.rotulo} className="flex min-w-0 items-center gap-1.5">
                <ChevronRight size={15} className="shrink-0 text-border-med" aria-hidden="true" />
                {crumb.para && !ehUltimo ? (
                  <Link
                    href={crumb.para}
                    className="hidden truncate rounded-btn px-1 py-0.5 text-txt-2 transition-colors hover:text-delp-red sm:inline"
                  >
                    {crumb.rotulo}
                  </Link>
                ) : (
                  <span className="truncate font-semibold text-txt" aria-current={ehUltimo ? 'page' : undefined}>
                    {crumb.rotulo}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="flex shrink-0 items-center gap-1 sm:gap-2">
        {projetos.length > 0 && <SeletorProjeto atualId={projetos[0].id} opcoes={projetos} />}
        <BotaoTema />
        <form action="/api/sair" method="post">
          <button type="submit" className={`${buttonVariants.ghost} !px-3 sm:!px-5`} aria-label="Sair">
            <LogOut size={16} aria-hidden="true" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </form>
      </div>
    </header>
  );
}
