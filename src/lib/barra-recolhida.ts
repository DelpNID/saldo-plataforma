// Origem: delp-visto@f66a6c3 src/lib/barra-recolhida.ts
// Desvios: chave 'ascent.barra-recolhida'; a escolha vai TAMBÉM num cookie com o
//   mesmo nome, que o layout do servidor lê (recolhidaPeloCookie) e passa como estado
//   inicial do useBarraRecolhida(inicial) — assim a barra já sai do servidor do jeito
//   certo, sem o salto de 192px a cada carregamento (revisão final, 16/11).
//   Ver docs/visto-desvios.md.
// -----------------------------------------------------------------------------
// barra-recolhida.ts — a barra lateral está recolhida?
//
// Store de módulo com ouvintes, no mesmo padrão do selo-conversas.ts: as quatro
// molduras vivem em árvores diferentes (a Sidebar do AppShell, as duas mesas, o
// shell do gestor e o portal da terceira), e um provider teria de subir até o
// App para alcançar todas.
//
// Vale só no DESKTOP: abaixo de 900px a barra é drawer e aparece inteira. Por
// isso o estado é um booleano só e quem consome aplica as classes de
// recolhimento com o prefixo `shell:` — é o CSS que decide onde ele tem efeito,
// e não há um segundo estado para manter em sincronia com a largura da tela.
//
// A escolha fica no localStorage: quem passa o dia na tela não quer reabrir a
// barra a cada aba nova.
// -----------------------------------------------------------------------------
import { useEffect, useState } from 'react';
import { COOKIE_BARRA, cookieDaBarra } from './barra-cookie';

export { COOKIE_BARRA, cookieDaBarra, recolhidaPeloCookie } from './barra-cookie';

const CHAVE = COOKIE_BARRA;

function gravarCookie(valor: boolean): void {
  try {
    document.cookie = cookieDaBarra(valor);
  } catch {
    // Sem cookie, o servidor desenha a barra aberta e o efeito corrige.
  }
}

function lerSalvo(): boolean {
  try {
    return window.localStorage.getItem(CHAVE) === '1';
  } catch {
    // Janela privativa ou storage bloqueado: barra aberta.
    return false;
  }
}

let recolhida = typeof window === 'undefined' ? false : lerSalvo();
const ouvintes = new Set<(v: boolean) => void>();

/** Recolhe ou expande a barra em TODAS as molduras montadas. */
export function definirBarraRecolhida(valor: boolean): void {
  if (valor === recolhida) return;
  recolhida = valor;
  try {
    window.localStorage.setItem(CHAVE, recolhida ? '1' : '0');
  } catch {
    // Sem storage a escolha vale só para esta sessão.
  }
  gravarCookie(recolhida);
  ouvintes.forEach((avisar) => avisar(recolhida));
}

export function alternarBarraRecolhida(): void {
  definirBarraRecolhida(!recolhida);
}

export function useBarraRecolhida(inicial = false): boolean {
  // Ascent: começa no valor que o servidor leu do cookie (ver o cabeçalho do arquivo).
  const [valor, setValor] = useState(inicial);
  useEffect(() => {
    // Reassume o valor atual na montagem: outra moldura pode ter alternado
    // antes desta aparecer (troca de perfil, drawer do mobile).
    setValor(recolhida);
    // Quem recolheu antes do cookie existir (só localStorage) passa a tê-lo.
    gravarCookie(recolhida);
    ouvintes.add(setValor);
    return () => {
      ouvintes.delete(setValor);
    };
  }, []);
  return valor;
}
