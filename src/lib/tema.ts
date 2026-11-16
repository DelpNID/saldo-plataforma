// Origem: delp-visto@f66a6c3 src/lib/tema.ts
// Desvios: chave 'ascent.tema'; useTema e useTemaEfetivo começam num valor fixo
//   ('sistema' / 'claro') e leem o real no efeito — o Ascent renderiza no servidor,
//   e o estado inicial lido do navegador faria o HTML do servidor discordar do
//   cliente (erro de hidratação). A primeira pintura já sai certa pelo script
//   inline do <head> (src/lib/tema-script.ts). Ver docs/visto-desvios.md.
// -----------------------------------------------------------------------------
// tema.ts — claro, escuro ou o que o sistema operacional estiver usando
// (17/09/2026, pedido do Lucas).
//
// O tema NÃO vira variante de classe nas telas: ele troca as CSS vars em
// :root[data-tema='escuro'] (src/index.css), e por isso este módulo só precisa
// escrever um atributo no <html>. Foi o que tornou o modo noturno viável sem
// reescrever 141 arquivos.
//
// Store de módulo com ouvintes, no mesmo padrão de barra-recolhida.ts: quem
// mostra o estado (Configurações) e quem o aplica (o documento) não estão na
// mesma árvore.
//
// A escolha fica no localStorage, como as outras preferências: é do navegador,
// não da conta — a mesma pessoa pode querer escuro no computador da mesa e
// claro no da fábrica, onde a luz é outra.
//
// `sistema` é o padrão e acompanha o Windows na hora, sem recarregar: quem
// deixa o computador trocar sozinho ao anoitecer espera que o sistema
// acompanhe.
// -----------------------------------------------------------------------------
import { useEffect, useState } from 'react';

export type Tema = 'claro' | 'escuro' | 'sistema';

// Ascent: a chave mora em tema-script.ts (lido pelo layout de servidor, sem hooks).
import { CHAVE_TEMA } from './tema-script';
export { CHAVE_TEMA };

// "Do sistema" saiu do rótulo (17/09/2026): aqui dentro, SISTEMA é o Visto —
// quem lê entendia que aquele botão mudava a cor do Visto, e não que ele
// entregava a decisão ao Windows.
export const TEMAS: { valor: Tema; rotulo: string; ajuda: string }[] = [
  { valor: 'claro', rotulo: 'Claro', ajuda: 'O visual de sempre.' },
  { valor: 'escuro', rotulo: 'Escuro', ajuda: 'Fundo grafite, para pouca luz.' },
  { valor: 'sistema', rotulo: 'Automático', ajuda: 'Segue o tema do Windows.' },
];

function ehTema(v: string | null): v is Tema {
  return v === 'claro' || v === 'escuro' || v === 'sistema';
}

function lerSalvo(): Tema {
  try {
    const salvo = window.localStorage.getItem(CHAVE_TEMA);
    return ehTema(salvo) ? salvo : 'sistema';
  } catch {
    // Janela privativa ou storage bloqueado.
    return 'sistema';
  }
}

/** O que o sistema operacional está pedindo agora. */
export function temaDoSistema(): 'claro' | 'escuro' {
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
    ? 'escuro'
    : 'claro';
}

let tema: Tema = typeof window === 'undefined' ? 'sistema' : lerSalvo();
const ouvintes = new Set<(v: Tema) => void>();

/** Escreve o tema EFETIVO no <html>. `data-tema` é o que o CSS lê. */
function aplicar(): void {
  if (typeof document === 'undefined') return;
  const efetivo = tema === 'sistema' ? temaDoSistema() : tema;
  document.documentElement.setAttribute('data-tema', efetivo);
}

export function definirTema(valor: Tema): void {
  tema = valor;
  try {
    window.localStorage.setItem(CHAVE_TEMA, valor);
  } catch {
    // Sem storage a escolha vale só para esta sessão.
  }
  aplicar();
  ouvintes.forEach((avisar) => avisar(tema));
}

export function lerTema(): Tema {
  return tema;
}

/**
 * Liga o tema ao documento. Chamado uma vez, no main.tsx.
 *
 * O ouvinte do sistema fica sempre ativo, e não só quando o tema é `sistema`:
 * assinar e cancelar conforme a escolha deixaria o app sem ouvinte justamente
 * no caso em que ele importa, se a escolha mudar entre dois renders.
 */
export function iniciarTema(): void {
  aplicar();
  if (typeof window === 'undefined' || !window.matchMedia) return;
  const consulta = window.matchMedia('(prefers-color-scheme: dark)');
  const aoMudar = () => {
    if (tema === 'sistema') aplicar();
  };
  consulta.addEventListener('change', aoMudar);
}

/**
 * O tema que está VALENDO — `sistema` já resolvido em claro ou escuro.
 *
 * Existe para quem não pode se virar só com CSS: a arte da marca é PNG, com o
 * texto de cor fixa, então o componente precisa escolher o arquivo.
 */
export function useTemaEfetivo(): 'claro' | 'escuro' {
  const escolha = useTema();
  // Ascent: começa em 'claro' e lê o sistema no efeito (ver o cabeçalho do arquivo).
  const [doSistema, setDoSistema] = useState<'claro' | 'escuro'>('claro');
  useEffect(() => {
    setDoSistema(temaDoSistema());
    if (!window.matchMedia) return;
    const consulta = window.matchMedia('(prefers-color-scheme: dark)');
    const aoMudar = () => setDoSistema(temaDoSistema());
    consulta.addEventListener('change', aoMudar);
    return () => consulta.removeEventListener('change', aoMudar);
  }, []);
  return escolha === 'sistema' ? doSistema : escolha;
}

export function useTema(): Tema {
  // Ascent: começa em 'sistema' e lê a escolha no efeito (ver o cabeçalho do arquivo).
  const [valor, setValor] = useState<Tema>('sistema');
  useEffect(() => {
    setValor(tema);
    ouvintes.add(setValor);
    return () => {
      ouvintes.delete(setValor);
    };
  }, []);
  return valor;
}
