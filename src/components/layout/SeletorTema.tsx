"use client";

// A escolha completa do tema (Claro · Escuro · Automático) no pé da barra lateral.
// Origem do desenho: delp-visto@f66a6c3 src/components/layout/ContaNoCabecalho.tsx
//   (o grupo "Tema" do menu da conta). O Ascent não tem menu da conta, e a barra
//   vira a gaveta no celular, então é aqui que o "Automático" mora nas duas larguras.
// Desvios: opção ativa em bg-grad-delp (no escuro o --delp-red clareia e o branco por
//   cima cai para ~3:1); botões com 44px de altura (alvo de toque). Ver docs/visto-desvios.md.
import { clsx } from 'clsx';
import { Moon } from 'lucide-react';
import { useId } from 'react';
import { definirTema, TEMAS, useTema } from '../../lib/tema';

export function SeletorTema({ recolhida = false }: { recolhida?: boolean }) {
  const tema = useTema();
  const id = useId();
  return (
    <div className={clsx('border-t border-subtle px-3 py-3', recolhida && 'shell:hidden')}>
      <div className="flex items-center gap-3 px-3 text-sm text-txt">
        <Moon size={17} aria-hidden="true" className="shrink-0 text-txt-2" />
        <span className="flex-1" id={`${id}-tema`}>
          Tema
        </span>
      </div>
      {/* Grade de três colunas iguais: os três botões ficam com a largura do
          maior ("Automático"), e o escolhido vai no vermelho da marca. */}
      <div
        role="radiogroup"
        aria-labelledby={`${id}-tema`}
        className="mt-2 grid grid-cols-3 overflow-hidden rounded-badge border border-border-med text-[11.5px]"
      >
        {TEMAS.map((t) => (
          <button
            key={t.valor}
            type="button"
            role="radio"
            aria-checked={tema === t.valor}
            title={t.ajuda}
            onClick={() => definirTema(t.valor)}
            className={clsx(
              'min-h-11 px-2 py-1 text-center transition-colors',
              tema === t.valor ? 'bg-grad-delp font-semibold text-white' : 'text-txt-2 hover:bg-bg-2',
            )}
          >
            {t.rotulo}
          </button>
        ))}
      </div>
    </div>
  );
}
