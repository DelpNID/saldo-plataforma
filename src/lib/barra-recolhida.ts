// Origem: delp-visto@f66a6c3 src/lib/barra-recolhida.ts
// Desvios: chave 'ascent.barra-recolhida'; useBarraRecolhida começa em false e lê
//   a escolha no efeito, pelo mesmo motivo do tema (renderização no servidor). Quem
//   recolheu a barra a vê abrir e fechar uma vez ao carregar a página.
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

const CHAVE = 'ascent.barra-recolhida';

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
  ouvintes.forEach((avisar) => avisar(recolhida));
}

export function alternarBarraRecolhida(): void {
  definirBarraRecolhida(!recolhida);
}

export function useBarraRecolhida(): boolean {
  // Ascent: começa aberta e lê a escolha no efeito (ver o cabeçalho do arquivo).
  const [valor, setValor] = useState(false);
  useEffect(() => {
    // Reassume o valor atual na montagem: outra moldura pode ter alternado
    // antes desta aparecer (troca de perfil, drawer do mobile).
    setValor(recolhida);
    ouvintes.add(setValor);
    return () => {
      ouvintes.delete(setValor);
    };
  }, []);
  return valor;
}
