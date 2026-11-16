"use client";

// Origem: delp-visto@f66a6c3 src/components/layout/Sidebar.tsx
// Desvios: o menu é o do Ascent (GRUPOS_MENU e estaAtivo de src/lib/navegacao.ts),
//   sem os grupos por papel nem as âncoras do módulo de terceiros do Visto (o Ascent
//   tem uma senha de equipe, sem papéis); os selos chegam por prop do layout; o pé
//   da barra tem a escolha completa do tema (SeletorTema), porque o Ascent não tem o
//   menu da conta onde o Visto a guarda; next/navigation no lugar do React Router;
//   some na impressão. Ver docs/visto-desvios.md.
// -----------------------------------------------------------------------------
// Sidebar.tsx — a barra lateral: fixa a partir de `shell:` (900px), gaveta abaixo.
// 264px aberta, 72px recolhida (só o símbolo e os ícones).
// -----------------------------------------------------------------------------
import { clsx } from 'clsx';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { alternarBarraRecolhida, useBarraRecolhida } from '../../lib/barra-recolhida';
import { GRUPOS_MENU, estaAtivo } from '../../lib/navegacao';
import { ItemBarra } from './barra/ItemBarra';
import { MarcaBarra } from './barra/MarcaBarra';
import { RotuloSecao } from './barra/RotuloSecao';
import { SeloNumero } from './barra/SeloNumero';
import { SeletorTema } from './SeletorTema';

/** O que cada item conta, para o leitor de tela (o número sozinho não diz o quê). */
const ROTULO_DO_SELO: Record<string, (n: number) => string> = {
  '/pendencias': (n) => `${n.toLocaleString('pt-BR')} componentes pendentes de baixa`,
};

export function Sidebar({
  open,
  onClose,
  selos,
}: {
  open: boolean;
  onClose: () => void;
  selos: Partial<Record<string, number>>;
}) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const recolhida = useBarraRecolhida();

  // Acessibilidade do drawer: ao abrir, o foco do teclado vai para o primeiro
  // item do menu (o retorno do foco ao fechar é responsabilidade do AppShell).
  useEffect(() => {
    if (open) {
      navRef.current?.querySelector<HTMLElement>('a, button')?.focus();
    }
  }, [open]);

  const seloDoItem = (para: string) => {
    const n = selos[para];
    return n ? <SeloNumero n={n} rotulo={(ROTULO_DO_SELO[para] ?? String)(n)} /> : undefined;
  };

  return (
    <aside
      role={open ? 'dialog' : undefined}
      aria-modal={open ? true : undefined}
      aria-label="Menu de navegação"
      className={clsx(
        'fixed inset-y-0 left-0 z-40 flex w-[264px] flex-col border-r border-subtle bg-bg print:hidden',
        'transition-[transform,visibility] shell:visible shell:translate-x-0',
        open ? 'visible translate-x-0' : 'invisible -translate-x-full',
        recolhida && 'shell:w-[72px]',
      )}
    >
      <MarcaBarra onFechar={onClose} recolhida={recolhida} onAlternar={alternarBarraRecolhida} />

      {/* Navegação principal, renderizada grupo a grupo. */}
      <nav
        ref={navRef}
        aria-label="Navegação principal"
        className={clsx(
          'mt-4 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4',
          recolhida && 'shell:px-2',
        )}
      >
        {GRUPOS_MENU.map((grupo, indiceGrupo) => (
          <div key={grupo.titulo} className={indiceGrupo > 0 ? 'mt-6' : undefined}>
            <RotuloSecao recolhida={recolhida}>{grupo.titulo}</RotuloSecao>
            <ul className="flex flex-col gap-1">
              {grupo.itens.map((item) => (
                <li key={item.para}>
                  <ItemBarra
                    icone={item.icone}
                    rotulo={item.rotulo}
                    para={item.para}
                    fim={item.fim}
                    estado={estaAtivo(item, pathname) ? 'ativo' : 'normal'}
                    selo={seloDoItem(item.para)}
                    recolhida={recolhida}
                    onClique={onClose}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <SeletorTema recolhida={recolhida} />
    </aside>
  );
}
