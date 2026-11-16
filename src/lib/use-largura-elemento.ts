// Origem: delp-visto@f66a6c3 src/lib/use-largura-elemento.ts
// -----------------------------------------------------------------------------
// use-largura-elemento.ts — largura REAL de um elemento, em px, via
// ResizeObserver.
//
// Para os gráficos SVG do Portal: 1 unidade de viewBox = 1px CSS, sempre.
// A largura medida vira a largura do viewBox, então alargar a tela vira
// respiro entre as barras — nunca escala (com viewBox fixo + w-full, fontes
// de 9px chegaram a renderizar a ~22px em monitor largo, 20/08/2026).
//
// É um CALLBACK ref, não RefObject: o observer se anexa quando o nó monta,
// MESMO que a montagem aconteça depois (gráfico com early return de "sem
// dados" que passa a ter dados). Devolve 0 até a primeira medição — o
// chamador não renderiza o SVG nesse meio-tempo de um frame.
// -----------------------------------------------------------------------------
import { useCallback, useRef, useState } from 'react';

export function useLarguraElemento<T extends HTMLElement>(): [(node: T | null) => void, number] {
  const [medidaRef, { largura }] = useTamanhoElemento<T>();
  return [medidaRef, largura];
}

/**
 * As DUAS medidas, para o gráfico que precisa preencher a altura que sobrou no
 * painel (15/09/2026: dois painéis lado a lado terminando na mesma linha, com
 * o vizinho de altura variável).
 *
 * Quem usa a altura tem de garantir que o SVG não dimensione o container —
 * `absolute inset-0` dentro de um pai `flex-1 min-h-0` —, senão a medida
 * realimenta o desenho e o laço trava numa altura que só cresce (foi o que
 * transformou a faixa de indicadores numa fileira de torres em 14/09/2026).
 */
export function useTamanhoElemento<T extends HTMLElement>(): [
  (node: T | null) => void,
  { largura: number; altura: number },
] {
  const observador = useRef<ResizeObserver | null>(null);
  const [tamanho, setTamanho] = useState({ largura: 0, altura: 0 });

  const medidaRef = useCallback((node: T | null) => {
    observador.current?.disconnect();
    observador.current = null;
    if (!node) return;
    const novo = new ResizeObserver((entradas) => {
      const caixa = entradas[0]?.contentRect;
      const nova = { largura: Math.round(caixa?.width ?? 0), altura: Math.round(caixa?.height ?? 0) };
      // Só atualiza quando muda de verdade — resize dispara em rajada.
      setTamanho((atual) =>
        nova.largura === atual.largura && nova.altura === atual.altura ? atual : nova,
      );
    });
    novo.observe(node);
    observador.current = novo;
  }, []);

  return [medidaRef, tamanho];
}
