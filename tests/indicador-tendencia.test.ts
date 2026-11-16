// Origem: delp-visto@f66a6c3 src/lib/indicador-tendencia.test.ts (só o caminho do import mudou)
// -----------------------------------------------------------------------------
// indicador-tendencia.test.ts — variação, média, proporção e sparkline dos
// números-destaque do Dashboard.
// -----------------------------------------------------------------------------
import { describe, expect, it } from 'vitest';
import {
  acumular,
  barrinhas,
  eixoDeMeses,
  eixoDeMesesFechados,
  eixoDesdeOPrimeiro,
  larguraDasBarrinhas,
  media,
  mesesFechados,
  serieAcumuladaNoEixo,
  serieDeMediasNoEixo,
  serieMensal,
  serieMensalDeContagens,
  serieNoEixo,
  nomeMes,
  serieProporcao,
  sparkline,
  variacao,
  variacaoMensal,
  variacaoNoPeriodo,
  trechoFinalSemNulos,
} from '../src/lib/indicador-tendencia';

// 15/08/2026 — usado como "hoje" nos testes de mês fechado (nada de data real:
// o teste tem de valer em qualquer dia).
const HOJE = new Date(2026, 7, 15);

// As barrinhas do card de painel (11/11/2026, "como o exemplo… acho que ficou
// mais limpo"): uma por mês, apoiadas na mesma base, a mais alta no topo.
describe('barrinhas', () => {
  it('uma por mês, lado a lado, com a altura proporcional ao maior', () => {
    expect(barrinhas([0, 5, 10], { largura: 5, vao: 2, altura: 40 })).toEqual([
      { x: 0, y: 38, w: 5, h: 2, zero: true },
      { x: 7, y: 20, w: 5, h: 20, zero: false },
      { x: 14, y: 0, w: 5, h: 40, zero: false },
    ]);
  });

  it('mês com pouco não some ao lado de um máximo grande', () => {
    expect(barrinhas([1, 1000], { largura: 5, vao: 2, altura: 40 }).map((b) => b.h)).toEqual([3, 40]);
  });

  it('série toda zerada vira só tocos, sem dividir por zero', () => {
    expect(barrinhas([0, 0], { largura: 5, vao: 2, altura: 40 })).toEqual([
      { x: 0, y: 38, w: 5, h: 2, zero: true },
      { x: 7, y: 38, w: 5, h: 2, zero: true },
    ]);
  });

  it('a largura total é a soma das barras e dos vãos', () => {
    expect(larguraDasBarrinhas(11, { largura: 5, vao: 2 })).toBe(75);
  });
});

describe('variacao', () => {
  it('compara o último mês com o anterior', () => {
    expect(variacao([7, 6, 9, 8, 10, 12])).toEqual({ atual: 12, anterior: 10, pct: 0.2, dif: 2 });
  });

  it('reconhece queda', () => {
    expect(variacao([10, 8])).toEqual({ atual: 8, anterior: 10, pct: -0.2, dif: -2 });
  });

  it('mês anterior zerado não vira variação infinita — fica sem comparação', () => {
    expect(variacao([0, 5])).toEqual({ atual: 5, anterior: 0, pct: null, dif: 5 });
  });

  it('taxa usa a diferença em pontos: 50% → 60% é +10 p.p., não +20%', () => {
    const v = variacao([50, 60])!;
    expect(v.dif).toBe(10);
    expect(v.pct).toBeCloseTo(0.2, 5);
  });

  it('série de um mês (ou vazia) não tem o que comparar', () => {
    expect(variacao([5])).toBeNull();
    expect(variacao([])).toBeNull();
  });
});

describe('media', () => {
  it('média do recorte', () => {
    expect(media([7, 6, 9, 8, 10, 12])).toBeCloseTo(8.6667, 3);
  });

  it('série vazia é 0, não NaN', () => {
    expect(media([])).toBe(0);
  });
});

describe('serieProporcao', () => {
  it('converte duas contagens em percentual', () => {
    expect(serieProporcao([5, 3], [10, 4])).toEqual([50, 75]);
  });

  it('mês sem denominador vira 0 (não NaN, que quebraria o sparkline)', () => {
    expect(serieProporcao([0, 2], [0, 4])).toEqual([0, 50]);
  });
});

describe('mesesFechados', () => {
  it('conta só os meses já encerrados — corrente e futuros ficam de fora', () => {
    const meses = ['05/2026', '06/2026', '07/2026', '08/2026', '09/2026'];
    // Em 15/08/2026: maio, junho e julho fecharam; agosto corre; setembro é futuro.
    expect(mesesFechados(meses, HOJE)).toBe(3);
  });

  it('recorte todo no passado conta tudo', () => {
    expect(mesesFechados(['01/2025', '02/2025'], HOJE)).toBe(2);
  });

  it('recorte só com o mês corrente não tem mês fechado', () => {
    expect(mesesFechados(['08/2026'], HOJE)).toBe(0);
  });
});

describe('variacaoMensal', () => {
  const meses = ['05/2026', '06/2026', '07/2026', '08/2026'];

  it('compara os dois últimos meses FECHADOS e nomeia os dois', () => {
    // Série: maio 14, junho 16, julho 18, agosto 1 (mês em curso).
    const v = variacaoMensal([14, 16, 18, 1], meses, HOJE)!;
    expect(v.atual).toBe(18);
    expect(v.anterior).toBe(16);
    expect(v.mes).toBe('julho');
    expect(v.mesAnterior).toBe('junho');
    expect(v.pct).toBeCloseTo(0.125, 5);
  });

  it('o mês em curso não derruba a variação (era o bug de 30/07: "-94%")', () => {
    // Sem o corte, [16, 1] daria -94%; com o corte, junho vs maio dá +14%.
    const v = variacaoMensal([14, 16, 1], ['05/2026', '06/2026', '08/2026'], HOJE)!;
    expect(v.mes).toBe('junho');
    expect(v.pct).toBeCloseTo(0.1429, 3);
  });

  it('sem dois meses fechados, não há comparação a mostrar', () => {
    expect(variacaoMensal([5, 1], ['07/2026', '08/2026'], HOJE)).toBeNull();
    expect(variacaoMensal([1], ['08/2026'], HOJE)).toBeNull();
  });
});

describe('nomeMes', () => {
  it('MM/AAAA vira o nome do mês', () => {
    expect(nomeMes('06/2026')).toBe('junho');
    expect(nomeMes('01/2026')).toBe('janeiro');
    expect(nomeMes('12/2025')).toBe('dezembro');
  });

  it('formato inesperado passa intacto', () => {
    expect(nomeMes('junho')).toBe('junho');
    expect(nomeMes('')).toBe('');
  });
});

describe('sparkline', () => {
  it('menos de 3 pontos não desenha tendência', () => {
    expect(sparkline([1, 2], 100, 30)).toBeNull();
    expect(sparkline([], 100, 30)).toBeNull();
  });

  it('primeiro e último ponto encostam nas margens laterais', () => {
    const s = sparkline([1, 5, 3], 100, 30, 4);
    expect(s).not.toBeNull();
    expect(s!.linha.startsWith('M 4.0')).toBe(true);
    expect(s!.fim.x).toBeCloseTo(96, 5);
  });

  it('o maior valor fica no topo e o menor no rodapé da área útil', () => {
    const s = sparkline([1, 5, 3], 100, 30, 4)!;
    // y do máximo = margem (topo); y do mínimo = altura - margem (base).
    expect(s.linha).toContain('4.0 26.0'); // primeiro ponto = mínimo
    expect(s.linha).toContain('50.0 4.0'); // ponto do meio = máximo
  });

  it('série constante fica na metade da altura, sem colar na borda', () => {
    const s = sparkline([4, 4, 4], 100, 30)!;
    expect(s.fim.y).toBe(15);
  });

  it('a área fecha na linha de base', () => {
    const s = sparkline([1, 5, 3], 100, 30, 4)!;
    expect(s.area.endsWith('L 4.0 26.0 Z')).toBe(true);
  });
});

describe('variacaoNoPeriodo', () => {
  it('compara a ponta com o começo da série (leitura de período)', () => {
    expect(variacaoNoPeriodo([1321, 1322, 1317, 1318])).toEqual({
      atual: 1318,
      anterior: 1321,
      pct: (1318 - 1321) / 1321,
      dif: -3,
    });
  });

  it('série de um ponto não tem período a comparar', () => {
    expect(variacaoNoPeriodo([1318])).toBeNull();
    expect(variacaoNoPeriodo([])).toBeNull();
  });

  it('começo zerado não vira variação infinita', () => {
    expect(variacaoNoPeriodo([0, 7])?.pct).toBeNull();
    expect(variacaoNoPeriodo([0, 7])?.dif).toBe(7);
  });
});

describe('trechoFinalSemNulos', () => {
  it('série toda medida devolve tudo', () => {
    expect(trechoFinalSemNulos([3, 4, 5])).toEqual([3, 4, 5]);
  });

  it('coluna nova: só os dias já medidos entram', () => {
    expect(trechoFinalSemNulos([null, null, 81, 79])).toEqual([81, 79]);
  });

  it('corta no último buraco — não costura dias distantes', () => {
    expect(trechoFinalSemNulos([5, 6, null, 8, 9])).toEqual([8, 9]);
  });

  it('nada medido ainda devolve vazio (o tile fica sem gráfico)', () => {
    expect(trechoFinalSemNulos([null, null])).toEqual([]);
    expect(trechoFinalSemNulos([])).toEqual([]);
  });
});

describe('serieMensal', () => {
  // Janela de 6 meses terminando em agosto/2026 (HOJE): mar → ago.
  it('monta o eixo dos últimos meses em ordem cronológica', () => {
    const { meses } = serieMensal([], 6, HOJE);
    expect(meses).toEqual(['03/2026', '04/2026', '05/2026', '06/2026', '07/2026', '08/2026']);
  });

  it('conta as datas no mês certo', () => {
    const { serie } = serieMensal(
      [
        new Date(2026, 5, 3).toISOString(),
        new Date(2026, 5, 28).toISOString(),
        new Date(2026, 7, 1).toISOString(),
      ],
      6,
      HOJE,
    );
    expect(serie).toEqual([0, 0, 0, 2, 0, 1]); // junho = 2, agosto = 1
  });

  it('ignora datas fora da janela e datas inválidas', () => {
    const { serie } = serieMensal(
      [new Date(2025, 0, 10).toISOString(), 'nao-e-data', new Date(2026, 6, 9).toISOString()],
      6,
      HOJE,
    );
    expect(serie).toEqual([0, 0, 0, 0, 1, 0]);
    expect(serie.reduce((s, n) => s + n, 0)).toBe(1);
  });

  it('lista vazia devolve o eixo com zeros (mês sem nada é 0, não some do eixo)', () => {
    const { serie, meses } = serieMensal([], 3, HOJE);
    expect(serie).toEqual([0, 0, 0]);
    expect(meses).toHaveLength(3);
  });

  it('atravessa a virada do ano', () => {
    const { meses } = serieMensal([], 3, new Date(2026, 1, 10));
    expect(meses).toEqual(['12/2025', '01/2026', '02/2026']);
  });
});

describe('eixoDeMeses', () => {
  it('termina no mês corrente, em ordem cronológica', () => {
    expect(eixoDeMeses(3, HOJE)).toEqual(['06/2026', '07/2026', '08/2026']);
  });

  it('é o MESMO eixo que serieMensal monta — um só formato de mês na tela', () => {
    // Se divergissem, mesesFechados e variacaoMensal receberiam rótulos que não
    // reconhecem e a comparação sumiria sem erro nenhum.
    expect(eixoDeMeses(6, HOJE)).toEqual(serieMensal([], 6, HOJE).meses);
  });
});

describe('serieMensalDeContagens', () => {
  it('casa cada contagem no seu mês do eixo', () => {
    const { serie, meses } = serieMensalDeContagens(
      [
        { mes: '06/2026', n: 4 },
        { mes: '08/2026', n: 1 },
      ],
      3,
      HOJE,
    );
    expect(meses).toEqual(['06/2026', '07/2026', '08/2026']);
    expect(serie).toEqual([4, 0, 1]);
  });

  it('mês ausente entra como 0 em vez de encurtar o eixo', () => {
    // Zero é informação: naquele mês não chegou nenhuma indicação. Omitir o mês
    // fingiria que ele não existiu e deslocaria a leitura da tendência.
    expect(serieMensalDeContagens([], 3, HOJE).serie).toEqual([0, 0, 0]);
  });

  it('ignora mês fora da janela sem estourar', () => {
    // O servidor devolve TODOS os meses com registro, de propósito — quem recorta
    // é a tela. Mês antigo não pode vazar para dentro da janela nem quebrá-la.
    const { serie } = serieMensalDeContagens(
      [
        { mes: '01/2020', n: 99 },
        { mes: '07/2026', n: 2 },
      ],
      3,
      HOJE,
    );
    expect(serie).toEqual([0, 2, 0]);
  });

  it('atravessa a virada do ano', () => {
    const { serie, meses } = serieMensalDeContagens(
      [{ mes: '12/2025', n: 5 }],
      3,
      new Date(2026, 1, 10),
    );
    expect(meses).toEqual(['12/2025', '01/2026', '02/2026']);
    expect(serie).toEqual([5, 0, 0]);
  });

  it('entrega uma série que mesesFechados sabe recortar', () => {
    // O contrato real do tile: o eixo daqui alimenta o recorte de meses fechados
    // do TileIndicador. Com HOJE em agosto, o mês corrente fica fora.
    const { meses } = serieMensalDeContagens([], 3, HOJE);
    expect(mesesFechados(meses, HOJE)).toBe(2);
  });
});

describe('eixoDesdeOPrimeiro', () => {
  it('começa no primeiro mês COM registro, não no teto da janela', () => {
    // O bug que motivou a função: 3 indicações num módulo novo rendiam 12 meses
    // de eixo, dez deles zerados, e "média por mês fechado: 0,1".
    expect(eixoDesdeOPrimeiro([{ mes: '07/2026', n: 3 }], 12, HOJE)).toEqual([
      '07/2026',
      '08/2026',
    ]);
  });

  it('registro mais antigo que a janela: eixo inteiro, o teto vale', () => {
    const eixo = eixoDesdeOPrimeiro([{ mes: '01/2020', n: 1 }], 3, HOJE);
    expect(eixo).toEqual(['06/2026', '07/2026', '08/2026']);
  });

  it('sem registro nenhum devolve vazio — a tela esconde o tile', () => {
    // Linha reta no zero é pior que tile ausente: parece dado.
    expect(eixoDesdeOPrimeiro([], 12, HOJE)).toEqual([]);
    expect(eixoDesdeOPrimeiro([{ mes: '07/2026', n: 0 }], 12, HOJE)).toEqual([]);
  });

  it('mês zerado no meio não encurta o eixo pela frente', () => {
    // Começa no primeiro mês com registro e vai até hoje, inclusive os vazios do
    // meio: mês sem indicação é informação.
    expect(eixoDesdeOPrimeiro([{ mes: '06/2026', n: 2 }], 12, HOJE)).toEqual([
      '06/2026',
      '07/2026',
      '08/2026',
    ]);
  });

  it('ignora mês malformado sem estourar', () => {
    expect(eixoDesdeOPrimeiro([{ mes: '2026-07', n: 5 }], 12, HOJE)).toEqual([]);
  });
});

describe('serieAcumuladaNoEixo', () => {
  const meses = ['06/2026', '07/2026', '08/2026'];

  it('acumula ao longo do eixo', () => {
    const serie = serieAcumuladaNoEixo(
      [
        { mes: '06/2026', n: 2 },
        { mes: '08/2026', n: 3 },
      ],
      meses,
    );
    expect(serie).toEqual([2, 2, 5]);
  });

  it('o que ficou ANTES do eixo entra como base', () => {
    // Sem a base o acumulado começaria em zero e fingiria um crescimento que não
    // houve — e a taxa do primeiro mês do eixo sairia errada.
    expect(serieAcumuladaNoEixo([{ mes: '01/2026', n: 10 }, { mes: '07/2026', n: 1 }], meses)).toEqual(
      [10, 11, 11],
    );
  });

  it('eixo vazio devolve série vazia', () => {
    expect(serieAcumuladaNoEixo([{ mes: '07/2026', n: 1 }], [])).toEqual([]);
  });

  it('serve uma taxa acumulada que nunca passa de 100%', () => {
    // O contrato real do tile: numerador e denominador acumulados, divididos
    // depois. Como o numerador é subconjunto do denominador, a taxa fica em 0–100
    // — e é isso que quebraria se alguém dividisse antes de acumular.
    const entradas = [
      { mes: '06/2026', n: 4 },
      { mes: '07/2026', n: 6 },
    ];
    const contratadas = [{ mes: '07/2026', n: 2 }];
    const taxa = serieProporcao(
      serieAcumuladaNoEixo(contratadas, meses),
      serieAcumuladaNoEixo(entradas, meses),
    );
    expect(taxa).toEqual([0, 20, 20]);
    expect(taxa.every((v) => v >= 0 && v <= 100)).toBe(true);
  });
});

describe('serieDeMediasNoEixo', () => {
  const meses = ['05/2026', '06/2026', '07/2026', '08/2026'];

  it('devolve série e eixo do MESMO tamanho', () => {
    // O tile casa serie[i] com meses[i]; tamanhos diferentes deslocariam a
    // variação para o mês errado sem erro nenhum.
    const r = serieDeMediasNoEixo([{ mes: '07/2026', n: 12 }], meses);
    expect(r.serie).toHaveLength(r.meses.length);
  });

  it('mês sem amostra é BURACO: corta no último e mantém só o trecho final', () => {
    // Maio tem média, junho não. Costurar maio a julho desenharia uma tendência
    // que não existiu; zerar junho afundaria a linha para 0 dia.
    const r = serieDeMediasNoEixo(
      [
        { mes: '05/2026', n: 30 },
        { mes: '07/2026', n: 10 },
        { mes: '08/2026', n: 12 },
      ],
      meses,
    );
    expect(r.serie).toEqual([10, 12]);
    expect(r.meses).toEqual(['07/2026', '08/2026']);
  });

  it('média zero é valor, não buraco — decisão no mesmo dia conta', () => {
    // Distinção que o `?? null` protege: 0 é uma média legítima (decidido no dia)
    // e não pode ser confundido com ausência de amostra.
    const r = serieDeMediasNoEixo(
      [
        { mes: '06/2026', n: 5 },
        { mes: '07/2026', n: 0 },
        { mes: '08/2026', n: 3 },
      ],
      meses,
    );
    expect(r.serie).toEqual([5, 0, 3]);
    expect(r.meses).toEqual(['06/2026', '07/2026', '08/2026']);
  });

  it('eixo todo vazio devolve vazio nos dois', () => {
    expect(serieDeMediasNoEixo([], meses)).toEqual({ serie: [], meses: [] });
  });

  it('buraco no ÚLTIMO mês do eixo descarta o resto — não há trecho final', () => {
    // Por isso a tela passa um eixo de meses FECHADOS: com o mês corrente na
    // ponta, todo dia 1º ele entraria vazio e apagaria o histórico inteiro.
    expect(serieDeMediasNoEixo([{ mes: '06/2026', n: 5 }], meses)).toEqual({
      serie: [],
      meses: [],
    });
  });
});

describe('eixoDeMesesFechados', () => {
  it('não inclui o mês corrente', () => {
    // HOJE é 15/08/2026: agosto está em formação e fica fora.
    const eixo = eixoDeMesesFechados(3, HOJE);
    expect(eixo).toEqual(['05/2026', '06/2026', '07/2026']);
    expect(eixo).not.toContain('08/2026');
  });

  it('entrega o tamanho pedido, não um mês a menos', () => {
    // O primeiro esboço encolhia a janela ao tirar o mês corrente.
    expect(eixoDeMesesFechados(6, HOJE)).toHaveLength(6);
  });

  it('todos os meses devolvidos estão fechados', () => {
    const eixo = eixoDeMesesFechados(12, HOJE);
    expect(mesesFechados(eixo, HOJE)).toBe(eixo.length);
  });

  it('atravessa a virada do ano', () => {
    expect(eixoDeMesesFechados(2, new Date(2026, 0, 20))).toEqual(['11/2025', '12/2025']);
  });
});

describe('serieNoEixo', () => {
  it('projeta as contagens no eixo dado, com 0 no mês ausente', () => {
    expect(serieNoEixo([{ mes: '07/2026', n: 4 }], ['06/2026', '07/2026'])).toEqual([0, 4]);
  });

  it('é a mesma projeção que serieMensalDeContagens usa', () => {
    const contagens = [{ mes: '07/2026', n: 4 }];
    const { serie, meses } = serieMensalDeContagens(contagens, 3, HOJE);
    expect(serieNoEixo(contagens, meses)).toEqual(serie);
  });
});

describe('acumular', () => {
  it('fluxo do mês vira total no fim de cada mês', () => {
    expect(acumular([1, 2, 3])).toEqual([1, 3, 6]);
  });

  it('a base soma o que já existia antes da janela', () => {
    expect(acumular([1, 2], 10)).toEqual([11, 13]);
  });

  it('série vazia devolve vazia', () => {
    expect(acumular([], 5)).toEqual([]);
  });
});
