"use client";

// Origem: delp-visto@f66a6c3 src/components/layout/ContaNoCabecalho.tsx (BotaoTema e BOTAO_ICONE)
// Claro ⇄ escuro num clique. A escolha "Automático" fica no pé da barra lateral
// (SeletorTema); daqui sai sempre uma escolha explícita.
import { Moon, Sun } from 'lucide-react';
import { definirTema, useTemaEfetivo } from '../../lib/tema';

const BOTAO_ICONE =
  'hidden h-11 w-11 shrink-0 items-center justify-center rounded-btn text-txt-2 transition-colors hover:bg-bg-2 hover:text-txt sm:flex';

export function BotaoTema() {
  const efetivo = useTemaEfetivo();
  const escuro = efetivo === 'escuro';
  const rotulo = escuro ? 'Usar o tema claro' : 'Usar o tema escuro';
  return (
    <button
      type="button"
      onClick={() => definirTema(escuro ? 'claro' : 'escuro')}
      aria-label={rotulo}
      title={rotulo}
      className={BOTAO_ICONE}
    >
      {escuro ? <Sun size={19} aria-hidden="true" /> : <Moon size={19} aria-hidden="true" />}
    </button>
  );
}
