"use client";

// Origem: delp-visto@f66a6c3 src/components/layout/AppShell.tsx
// Desvios: sem useAuth e sem a saída por inatividade da portaria (o Ascent tem uma
//   senha de equipe); o conteúdo vem por `children` (layout do App Router) em vez do
//   <Outlet/>; projetos e selos chegam por prop do layout do servidor; na impressão o
//   recuo da barra sai (print:!pl-0 — sem o !, o shell:pl-[264px] ganharia). Ver docs/visto-desvios.md.
// -----------------------------------------------------------------------------
// AppShell.tsx — a moldura das telas logadas: barra lateral + topo + conteúdo.
// -----------------------------------------------------------------------------
import { clsx } from 'clsx';
import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { useBarraRecolhida } from '../../lib/barra-recolhida';
import type { ProjetoOpcao } from '../SeletorProjeto';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export function AppShell({
  projetos,
  selos,
  barraRecolhida: recolhidaInicial = false,
  children,
}: {
  projetos: ProjetoOpcao[];
  selos: Partial<Record<string, number>>;
  /** O estado da barra lido do cookie no servidor (primeira pintura certa). */
  barraRecolhida?: boolean;
  children: ReactNode;
}) {
  // Drawer da sidebar no mobile (no desktop ela é fixa e este estado é ignorado).
  const [menuAberto, setMenuAberto] = useState(false);
  const barraRecolhida = useBarraRecolhida(recolhidaInicial);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const conteudoRef = useRef<HTMLDivElement>(null);
  const estavaAberto = useRef(false);
  const pathname = usePathname();

  const abrirMenu = useCallback(() => setMenuAberto(true), []);
  const fecharMenu = useCallback(() => setMenuAberto(false), []);

  // Fecha o drawer sempre que a rota muda (o usuário clicou num link do menu).
  useEffect(() => {
    setMenuAberto(false);
  }, [pathname]);

  // Com o drawer aberto o resto da página fica inerte (nem foco nem clique) e a
  // rolagem do fundo trava.
  useEffect(() => {
    conteudoRef.current?.toggleAttribute('inert', menuAberto);
    document.body.style.overflow = menuAberto ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuAberto]);

  // Ao fechar, o foco volta ao botão que abriu o menu.
  useEffect(() => {
    if (!menuAberto && estavaAberto.current) {
      menuButtonRef.current?.focus();
    }
    estavaAberto.current = menuAberto;
  }, [menuAberto]);

  // Esc fecha o drawer.
  useEffect(() => {
    if (!menuAberto) return;
    const aoTeclar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setMenuAberto(false);
    };
    window.addEventListener('keydown', aoTeclar);
    return () => window.removeEventListener('keydown', aoTeclar);
  }, [menuAberto]);

  return (
    <div className="min-h-screen bg-bg-2">
      {/* Overlay escuro atrás do drawer (só no mobile). Clicar nele fecha.
          Fica FORA do wrapper inerte para continuar clicável. */}
      {menuAberto && (
        <div className="fixed inset-0 z-30 bg-black/40 shell:hidden" onClick={fecharMenu} aria-hidden="true" />
      )}

      <Sidebar open={menuAberto} onClose={fecharMenu} selos={selos} recolhidaInicial={recolhidaInicial} />

      {/* Conteúdo: no desktop, deslocado para dar lugar à sidebar fixa — 264px
          com a barra aberta, 72px com ela recolhida. */}
      <div
        ref={conteudoRef}
        className={clsx(
          'flex min-h-screen flex-col print:!pl-0',
          barraRecolhida ? 'shell:pl-[72px]' : 'shell:pl-[264px]',
        )}
      >
        <Topbar onOpenMenu={abrirMenu} menuButtonRef={menuButtonRef} projetos={projetos} />
        {/* Sem teto de largura: tetos são POR BLOCO (.grade-indicadores, 70ch). */}
        <main className="w-full flex-1 px-4 py-6 md:px-6 md:py-8 print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
