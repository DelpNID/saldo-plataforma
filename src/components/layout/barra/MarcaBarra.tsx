"use client";

// Origem: delp-visto@f66a6c3 src/components/layout/barra/MarcaBarra.tsx
// Desvio: marca Ascent (LogoAscent/SimboloAscent) e o subtítulo "Subida de saldo";
//   o lockup do Ascent é mais largo e baixo que o do Visto (4:1 contra 3,3:1), por
//   isso 132px em vez de 104px para a mesma altura de letra. Ver docs/visto-desvios.md.
// -----------------------------------------------------------------------------
// MarcaBarra.tsx — o cabeçalho das barras laterais: a marca do Visto e, embaixo,
// o que o sistema faz.
//
// Marca e descritor CENTRALIZADOS na coluna, nos dois estados (pedido do Lucas
// em 11/09/2026; a primeira versão ancorava à esquerda, como as barras de
// referência). O botão de recolher continua no canto direito — centralizar o
// conjunto inclui a marca e o texto, não o controle. O descritor mora AQUI, uma
// vez, para as quatro molduras não divergirem no texto.
//
// Recolhida, sobra o "V" (SimboloVisto) — arquivo derivado da própria arte, não
// desenho novo: o lockup inteiro em 72px ficaria com 6px de altura de letra. O
// recolhimento é do desktop, então tudo aqui é `shell:` — no drawer a marca
// aparece inteira.
// -----------------------------------------------------------------------------
import { clsx } from 'clsx';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { LogoAscent, SimboloAscent } from '../../marca/LogoAscent';

interface MarcaBarraProps {
  /** Fecha o drawer (<900px). Ausente nas molduras cuja barra é só desktop. */
  onFechar?: () => void;
  /** Barra recolhida no desktop. */
  recolhida?: boolean;
  /** Recolhe/expande. Ausente = moldura sem o controle. */
  onAlternar?: () => void;
}

export function MarcaBarra({ onFechar, recolhida = false, onAlternar }: MarcaBarraProps) {
  return (
    <div
      className={clsx(
        'relative flex flex-col items-center border-b border-subtle px-5 py-5 text-center',
        recolhida && 'shell:gap-1 shell:px-2',
      )}
    >
      {/* Recolhida no desktop, entra o SÍMBOLO (só o V, arquivo próprio); no
          drawer e com a barra aberta, o lockup inteiro. Os dois existem na
          árvore e o `shell:` escolhe — a mesma coluna serve de drawer abaixo de
          900px, então não há como decidir isto em JS. */}
      {recolhida && <SimboloAscent className="hidden w-10 shell:block" />}
      <div className={clsx(recolhida && 'shell:hidden')}>
        <LogoAscent tom="escuro" className="w-[120px]" />
      </div>
      <p
        className={clsx(
          'mt-1.5 text-[10px] uppercase tracking-[0.12em] text-txt-2',
          recolhida && 'shell:hidden',
        )}
      >
        Subida de saldo
      </p>

      {onAlternar && (
        // Só desktop: no drawer quem fecha é o X.
        //
        // O aro é o que faz o controle existir na tela: a primeira versão era
        // um chevron cinza-claro solto no canto e "desaparecia" (11/09/2026).
        // Aro cinza + hover vermelho é o mesmo desenho dos botões discretos do
        // projeto (ver PainelAcessosUsuario). A área de clique fica em 44px,
        // como o resto do app, com o aro visível de 32px dentro dela.
        <button
          type="button"
          onClick={onAlternar}
          aria-label={recolhida ? 'Expandir menu' : 'Recolher menu'}
          title={recolhida ? 'Expandir menu' : 'Recolher menu'}
          className={clsx(
            'group hidden h-11 w-11 items-center justify-center shell:flex',
            recolhida
              ? 'shell:mt-1'
              : 'shell:absolute shell:right-1.5 shell:top-1/2 shell:-translate-y-1/2',
          )}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-med bg-bg text-txt-2 transition-colors group-hover:border-delp-red group-hover:text-delp-red">
            {recolhida ? (
              <ChevronRight size={18} strokeWidth={2.5} aria-hidden="true" />
            ) : (
              <ChevronLeft size={18} strokeWidth={2.5} aria-hidden="true" />
            )}
          </span>
        </button>
      )}

      {onFechar && (
        // Só no drawer: ancorado no canto para não empurrar a marca.
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar menu de navegação"
          className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-btn text-txt-2 hover:bg-bg-2 shell:hidden"
        >
          <X size={20} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
