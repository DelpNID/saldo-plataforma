"use client";

// Origem: delp-visto@f66a6c3 src/components/layout/barra/ItemBarra.tsx
// Desvio: next/link no lugar do NavLink do React Router, com aria-current; o
//   estado ativo vem sempre do Sidebar. Ver docs/visto-desvios.md.
// -----------------------------------------------------------------------------
// ItemBarra.tsx — a linha de menu das barras laterais, nas quatro molduras.
//
// Uma forma só, o link: `para` navega, e o `onClique` fecha o drawer no mobile.
// A forma de AÇÃO (botão sem rota) servia só ao "Sair" do grupo Conta, e saiu
// com ele em 06/11/2026, quando a conta subiu para o cabeçalho.
//
// Havia outra, expansível, com chevron à esquerda: ela existia só para
// a árvore de três níveis do AppShell, que virou menu plano em 14/09/2026. Saiu
// junto — com ela iam a calha de alinhamento e o estado "ramo ativo" (o pai que
// segurava o vermelho enquanto o submenu aberto marcava o filho).
//
// O estado vem de fora em vez de sair do `isActive` do NavLink porque as
// molduras acendem itens por rotas IRMÃS (`extras`): duas rotas diferentes
// marcam o mesmo item. Sem `estado`, um link cai no isActive dele.
// -----------------------------------------------------------------------------
import { clsx } from 'clsx';
import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export type EstadoItemBarra = 'normal' | 'ativo';

interface ItemBarraProps {
  icone: LucideIcon;
  rotulo: string;
  /** Rota do link. */
  para: string;
  /** `end` do NavLink: acende só na rota exata. */
  fim?: boolean;
  /** Força o estado. Num link, ausente = o `isActive` do NavLink decide. */
  estado?: EstadoItemBarra;
  /** Selo à direita (contagem de conversas, hoje). */
  selo?: ReactNode;
  /** Barra recolhida no desktop: sobra o ícone, e o rótulo vira tooltip. */
  recolhida?: boolean;
  onClique?: () => void;
}

const BASE =
  'relative flex min-h-[44px] w-full items-center gap-3 rounded-btn px-3 text-left text-sm font-medium';
// Recolhida (só desktop): o ícone no centro da coluna de 72px, sem rótulo.
const BASE_RECOLHIDA = 'shell:justify-center shell:px-0';

function classes(estado: EstadoItemBarra): string {
  return estado === 'ativo'
    ? 'bg-delp-red/10 text-delp-red'
    : 'text-txt-2 hover:bg-bg-2 hover:text-txt';
}

export function ItemBarra({
  icone: Icone,
  rotulo,
  para,
  fim,
  estado,
  selo,
  recolhida = false,
  onClique,
}: ItemBarraProps) {
  const corpo = (
    <>
      <Icone size={18} className="shrink-0" aria-hidden="true" />
      {/* O rótulo QUEBRA em vez de cortar (06/11/2026, "faça uma forma de
          aparecer toda a escrita"): com o número ao lado, "Documentação por
          pessoa" pedia 162px e tinha 150. Duas linhas de 17,5px cabem nos 44px
          da linha, então a altura do item não muda; o teto de duas linhas só
          segura rótulo que nem assim caberia. */}
      <span
        className={clsx('line-clamp-2 min-w-0 flex-1 leading-tight', recolhida && 'shell:hidden')}
      >
        {rotulo}
      </span>
      {/* Recolhida, a contagem não cabe: um número de 20px sobre uma coluna de
          72px cobre o próprio ícone. Então ela vira leitura (sr-only, para o
          leitor de tela continuar dizendo quantas conversas esperam) e quem
          avisa na tela é o ponto no canto do ícone. */}
      {selo && (
        <>
          <span className={clsx(recolhida && 'shell:sr-only')}>{selo}</span>
          {recolhida && (
            <span
              className="hidden shell:absolute shell:right-3 shell:top-2 shell:block shell:h-2 shell:w-2 shell:rounded-full shell:bg-delp-red"
              aria-hidden="true"
            />
          )}
        </>
      )}
    </>
  );

  // Tooltip nativo: o rótulo completo quando a coluna truncar (e o rótulo
  // inteiro quando ela estiver recolhida).
  // Ascent: next/link no lugar do NavLink; o estado vem sempre de quem monta o
  // menu (Sidebar, por estaAtivo de src/lib/navegacao.ts), então `fim` não se usa aqui.
  void fim;
  const ativo = estado === 'ativo';
  return (
    <Link
      href={para}
      onClick={onClique}
      title={rotulo}
      aria-current={ativo ? 'page' : undefined}
      className={clsx(BASE, recolhida && BASE_RECOLHIDA, classes(ativo ? 'ativo' : 'normal'))}
    >
      {corpo}
    </Link>
  );
}
