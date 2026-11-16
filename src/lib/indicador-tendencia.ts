// Origem: delp-visto@f66a6c3 src/lib/indicador-tendencia.ts
// -----------------------------------------------------------------------------
// indicador-tendencia.ts — regras puras dos números-destaque (30/07/2026)
//
// Um número sozinho não é indicador: "12 desligamentos" não diz se está bom.
// Estas funções derivam o que falta a partir da série mensal que a API manda
// (Indicadores.kpis, alinhada a Indicadores.meses): a variação contra o mês
// anterior, a média do recorte e a geometria do sparkline.
//
// Ficam fora do componente para serem testadas sem DOM (padrão do projeto).
// -----------------------------------------------------------------------------

/** Variação do último mês contra o anterior. */
export interface Variacao {
  /** Valor do último mês da série. */
  atual: number;
  /** Valor do mês anterior. */
  anterior: number;
  /** Variação relativa (0,2 = +20%); null quando não há base de comparação
   *  (série com menos de 2 meses ou mês anterior zerado — dividir por zero não
   *  vira "+∞%", vira "sem comparação"). Serve a indicadores de CONTAGEM. */
  pct: number | null;
  /** Diferença absoluta (atual − anterior). É o que vale para indicadores que
   *  JÁ SÃO percentual: adesão de 50% para 60% é +10 pontos percentuais, não
   *  "+20%" — a variação relativa de uma taxa engana quem lê. */
  dif: number;
}

export function variacao(serie: number[]): Variacao | null {
  if (serie.length < 2) return null;
  const atual = serie[serie.length - 1];
  const anterior = serie[serie.length - 2];
  return {
    atual,
    anterior,
    pct: anterior === 0 ? null : (atual - anterior) / anterior,
    dif: atual - anterior,
  };
}

/** Média aritmética do recorte (0 quando a série está vazia). */
export function media(serie: number[]): number {
  if (serie.length === 0) return 0;
  return serie.reduce((s, v) => s + v, 0) / serie.length;
}

/**
 * Quantos meses do eixo já FECHARAM. Mês corrente e meses futuros ficam de
 * fora: comparar um mês incompleto com um mês inteiro sempre finge queda, e o
 * eixo tem meses à frente de propósito (desligamento é registrado com a data
 * do aviso prévio, que cai no mês seguinte).
 *
 * `meses` vem em ordem cronológica no formato MM/AAAA.
 */
export function mesesFechados(meses: string[], hoje = new Date()): number {
  const limite = hoje.getFullYear() * 100 + (hoje.getMonth() + 1); // AAAAMM do mês corrente
  return meses.filter((m) => {
    const p = /^(\d{2})\/(\d{4})$/.exec(m);
    if (!p) return false;
    return Number(p[2]) * 100 + Number(p[1]) < limite;
  }).length;
}

/** Variação entre os dois últimos meses FECHADOS, com o nome de cada um. */
export interface VariacaoMensal extends Variacao {
  /** Mês do valor `atual` (ex.: 'junho'). */
  mes: string;
  /** Mês do valor `anterior` (ex.: 'maio'). */
  mesAnterior: string;
}

/**
 * Variação mês a mês pronta para exibição: recorta a série nos meses fechados
 * e compara os dois últimos. Devolve null quando não há dois meses fechados no
 * recorte — nesse caso o tile mostra só a média, sem inventar comparação.
 */
export function variacaoMensal(
  serie: number[],
  meses: string[],
  hoje = new Date(),
): VariacaoMensal | null {
  const n = Math.min(mesesFechados(meses, hoje), serie.length);
  if (n < 2) return null;
  const v = variacao(serie.slice(0, n));
  if (!v) return null;
  return { ...v, mes: nomeMes(meses[n - 1]), mesAnterior: nomeMes(meses[n - 2]) };
}

/**
 * O trecho FINAL contíguo sem nulos — para séries que começaram a ser medidas
 * depois das outras (coluna nova no snapshot: os dias anteriores vêm null).
 * Corta no último buraco em vez de costurar dias distantes numa linha só, que
 * desenharia uma tendência que não existiu.
 */
export function trechoFinalSemNulos(valores: (number | null | undefined)[]): number[] {
  const fim: number[] = [];
  for (let i = valores.length - 1; i >= 0; i--) {
    const v = valores[i];
    if (v == null) break;
    fim.unshift(v);
  }
  return fim;
}

/**
 * Variação da PONTA contra o COMEÇO da série — leitura de período fechado
 * ("−3 nos últimos 7 dias"), usada nas séries diárias de snapshot. Diferente
 * da mensal: aqui nada é descartado, porque cada ponto é um estoque completo
 * do dia (não um acumulado em formação).
 */
export function variacaoNoPeriodo(serie: number[]): Variacao | null {
  if (serie.length < 2) return null;
  const atual = serie[serie.length - 1];
  const anterior = serie[0];
  return {
    atual,
    anterior,
    pct: anterior === 0 ? null : (atual - anterior) / anterior,
    dif: atual - anterior,
  };
}

/** 'MM/AAAA' → nome do mês em português ('06/2026' → 'junho'). Devolve a
 *  entrada intacta se não casar o formato (o rótulo é só texto de apoio). */
const NOMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

export function nomeMes(mmAAAA: string): string {
  const m = /^(\d{2})\/(\d{4})$/.exec(mmAAAA);
  if (!m) return mmAAAA;
  return NOMES[Number(m[1]) - 1] ?? mmAAAA;
}

/**
 * Eixo mensal + contagem por mês a partir de datas ISO. Para as telas que têm a
 * lista inteira no cliente e não uma série pronta da API (Indicações): a janela
 * são os `quantidade` meses que TERMINAM no mês corrente, em ordem cronológica,
 * e mês sem nada entra como 0 — o zero é informação (naquele mês não veio
 * nenhuma), diferente de omitir o mês do eixo.
 *
 * Datas fora da janela (ou inválidas) são ignoradas: quem precisa do acumulado
 * completo usa o total da lista, não a soma da série.
 */
const chaveMes = (d: Date) => `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

/**
 * Os `quantidade` meses que TERMINAM no mês corrente, em ordem cronológica e no
 * formato MM/AAAA que `mesesFechados` e `variacaoMensal` esperam.
 *
 * Sempre no relógio de QUEM LÊ, nunca no do servidor: é o mesmo relógio que
 * `mesesFechados` usa para decidir qual mês ainda está em formação, e dois
 * relógios diferentes fariam o eixo terminar num mês que a comparação considera
 * futuro (ou o contrário) na virada do mês.
 */
export function eixoDeMeses(quantidade: number, hoje = new Date()): string[] {
  const meses: string[] = [];
  for (let i = quantidade - 1; i >= 0; i--) {
    meses.push(chaveMes(new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)));
  }
  return meses;
}

export function serieMensal(
  datasIso: string[],
  quantidade = 6,
  hoje = new Date(),
): { serie: number[]; meses: string[] } {
  const meses = eixoDeMeses(quantidade, hoje);
  const posicao = new Map(meses.map((m, i) => [m, i]));
  const serie = meses.map(() => 0);
  for (const iso of datasIso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) continue;
    const p = posicao.get(chaveMes(d));
    if (p !== undefined) serie[p] += 1;
  }
  return { serie, meses };
}

/**
 * Mesmo eixo do `serieMensal`, mas a partir de contagens JÁ AGREGADAS por mês —
 * para as telas cuja lista é paginada e que por isso não têm as datas no cliente
 * (Banco de Talentos: a entrada de indicações vem contada por mês do servidor).
 *
 * Mês ausente nas contagens entra como 0: naquele mês não veio nenhuma, e isso é
 * informação — diferente de encurtar o eixo e fingir que o mês não existiu.
 * Mês fora da janela é ignorado, como no irmão.
 */
export function serieMensalDeContagens(
  contagens: readonly { mes: string; n: number }[],
  quantidade = 12,
  hoje = new Date(),
): { serie: number[]; meses: string[] } {
  const meses = eixoDeMeses(quantidade, hoje);
  return { serie: serieNoEixo(contagens, meses), meses };
}

/** MM/AAAA → AAAAMM, para comparar meses por ordem sem montar Date. */
function ordinalDoMes(mes: string): number | null {
  const p = /^(\d{2})\/(\d{4})$/.exec(mes);
  return p ? Number(p[2]) * 100 + Number(p[1]) : null;
}

/**
 * As contagens alinhadas a um eixo JÁ ESCOLHIDO. Mês ausente entra como 0; mês
 * fora do eixo é ignorado. Separada de `serieMensalDeContagens` porque os eixos
 * de janela fixa e de janela desde o primeiro registro precisam da mesma
 * projeção — duas cópias divergiriam no tratamento do mês vazio.
 */
export function serieNoEixo(
  contagens: readonly { mes: string; n: number }[],
  meses: readonly string[],
): number[] {
  const porMes = new Map(contagens.map((c) => [c.mes, c.n]));
  return meses.map((m) => porMes.get(m) ?? 0);
}

/**
 * Eixo que TERMINA no mês corrente e COMEÇA no primeiro mês com registro — no
 * máximo `maximo` meses.
 *
 * Existe por causa dos módulos novos: janela fixa de 12 meses num programa de
 * duas semanas rende dez meses de zero, e aí a "média por mês fechado" dilui o
 * programa por um passado em que ele não existia (o Banco de Talentos mostrava
 * "0,1 por mês" com 3 indicações). Havendo registro mais antigo que a janela, o
 * eixo fica inteiro: o começo é o teto, não a falta de história.
 *
 * Devolve [] quando não há registro nenhum — a tela esconde o tile em vez de
 * desenhar uma linha reta no zero.
 */
export function eixoDesdeOPrimeiro(
  contagens: readonly { mes: string; n: number }[],
  maximo: number,
  hoje = new Date(),
): string[] {
  const comRegistro = contagens
    .filter((c) => c.n > 0)
    .map((c) => ordinalDoMes(c.mes))
    .filter((o): o is number => o !== null);
  if (comRegistro.length === 0) return [];

  const eixo = eixoDeMeses(maximo, hoje);
  const inicio = ordinalDoMes(eixo[0]);
  const maisAntigo = Math.min(...comRegistro);
  // Registro anterior à janela: o eixo já está no teto e não se corta.
  if (inicio === null || maisAntigo <= inicio) return eixo;
  const primeiro = eixo.findIndex((m) => {
    const o = ordinalDoMes(m);
    return o !== null && o >= maisAntigo;
  });
  return primeiro <= 0 ? eixo : eixo.slice(primeiro);
}

/**
 * Os `quantidade` meses FECHADOS mais recentes — o eixo cheio sem o mês corrente.
 *
 * É o eixo das séries de MÉDIA. Com o mês corrente dentro, todo dia 1º o mês novo
 * entra vazio, `serieDeMediasNoEixo` corta ali e o gráfico do tile desaparece até
 * a primeira decisão do mês — piscando mês a mês. O mês em formação já ficava
 * fora da tendência e da média (ver `mesesFechados`), então tirá-lo do eixo não
 * esconde nada: só evita que a falta de amostra de hoje apague o histórico.
 */
export function eixoDeMesesFechados(quantidade: number, hoje = new Date()): string[] {
  // Pede um mês a mais e corta o que não fechou — assim a janela entregue tem o
  // tamanho pedido em vez de encolher por causa do mês corrente.
  const eixo = eixoDeMeses(quantidade + 1, hoje);
  return eixo.slice(0, mesesFechados(eixo, hoje)).slice(-quantidade);
}

/**
 * Série de MÉDIAS mensais alinhada a um eixo, com o eixo cortado no último
 * buraco — e o `meses` devolvido junto, já do mesmo tamanho da série.
 *
 * Mês sem amostra é BURACO, não zero: um mês em que ninguém decidiu nada não tem
 * "média zero dias", e zerar afundaria a linha e contaminaria a média dos meses
 * fechados. Costurar por cima do buraco (ligando março a junho) desenharia uma
 * tendência que não existiu — por isso reusa `trechoFinalSemNulos`, que é a
 * mesma decisão já tomada para as colunas novas do snapshot.
 *
 * Consequência assumida: em processo de volume baixo, quase todo mês é buraco e
 * o trecho final fica curto — aí o tile mostra o número grande e não desenha
 * linha. É o resultado honesto; a alternativa era uma linha inventada.
 */
export function serieDeMediasNoEixo(
  medias: readonly { mes: string; n: number }[],
  meses: readonly string[],
): { serie: number[]; meses: string[] } {
  const porMes = new Map(medias.map((m) => [m.mes, m.n]));
  const comBuracos = meses.map((m) => porMes.get(m) ?? null);
  const serie = trechoFinalSemNulos(comBuracos);
  return { serie, meses: meses.slice(meses.length - serie.length) };
}

/**
 * Série ACUMULADA (estoque no fim de cada mês do eixo) a partir de contagens de
 * FLUXO por mês. O que ficou antes do eixo entra como base — sem isso o
 * acumulado começaria em zero e fingiria um crescimento que não houve.
 *
 * É o que permite plotar uma taxa acumulada com a MESMA definição do número
 * grande do tile: numerador e denominador acumulados, mês a mês.
 */
export function serieAcumuladaNoEixo(
  contagens: readonly { mes: string; n: number }[],
  meses: readonly string[],
): number[] {
  const inicio = meses.length > 0 ? ordinalDoMes(meses[0]) : null;
  const base =
    inicio === null
      ? 0
      : contagens.reduce((soma, c) => {
          const o = ordinalDoMes(c.mes);
          return o !== null && o < inicio ? soma + c.n : soma;
        }, 0);
  return acumular(serieNoEixo(contagens, meses), base);
}

/**
 * Série de FLUXO (entradas do mês) vira série de ESTOQUE (total acumulado no
 * fim de cada mês). `base` é o que já existia antes do primeiro mês da janela —
 * sem ela o acumulado começaria em zero e fingiria um crescimento que não houve.
 */
export function acumular(serie: number[], base = 0): number[] {
  let soma = base;
  return serie.map((n) => (soma += n));
}

/** Duas séries de contagem viram uma série de PERCENTUAL (0–100) — ex.: adesão
 *  por mês = aceitaram/total. Mês sem denominador entra como 0 (não há taxa a
 *  mostrar; deixar NaN quebraria o sparkline). */
export function serieProporcao(parte: number[], total: number[]): number[] {
  return parte.map((p, i) => {
    const t = total[i] ?? 0;
    return t === 0 ? 0 : (p / t) * 100;
  });
}

/** As barrinhas do card de painel (11/11/2026): uma por mês, apoiadas na
 *  mesma base e proporcionais ao MAIOR mês. Zero vira um toco de 2px — o mês
 *  existe, só não teve nada —, e mês com pouco tem pelo menos 3px, para não
 *  sumir ao lado de um máximo grande. */
export interface Barrinha {
  x: number;
  y: number;
  w: number;
  h: number;
  zero: boolean;
}

const TOCO = 2;
const MINIMO = 3;

export function larguraDasBarrinhas(quantas: number, { largura, vao }: { largura: number; vao: number }): number {
  return quantas <= 0 ? 0 : quantas * largura + (quantas - 1) * vao;
}

export function barrinhas(
  serie: number[],
  { largura, vao, altura }: { largura: number; vao: number; altura: number },
): Barrinha[] {
  const max = Math.max(0, ...serie);
  return serie.map((v, i) => {
    const zero = v <= 0 || max === 0;
    const h = zero ? TOCO : Math.max(MINIMO, Math.round((v / max) * altura));
    return { x: i * (largura + vao), y: altura - h, w: largura, h, zero };
  });
}

/** Geometria do sparkline: linha, área de preenchimento e o ponto final
 *  (destacado — é o valor que o número grande mostra). Série constante fica
 *  na metade da altura, em vez de colar na borda. */
export interface Sparkline {
  linha: string;
  area: string;
  fim: { x: number; y: number };
}

export function sparkline(
  serie: number[],
  largura: number,
  altura: number,
  margem = 4,
): Sparkline | null {
  if (serie.length < 3) return null; // com 2 pontos a "tendência" engana
  const min = Math.min(...serie);
  const max = Math.max(...serie);
  const x = (i: number) => margem + (i * (largura - 2 * margem)) / (serie.length - 1);
  const y = (v: number) =>
    max === min
      ? altura / 2
      : altura - margem - ((v - min) / (max - min)) * (altura - 2 * margem);
  const pontos = serie.map((v, i) => `${x(i).toFixed(1)} ${y(v).toFixed(1)}`);
  const linha = `M ${pontos.join(' L ')}`;
  const base = (altura - margem).toFixed(1);
  const area = `${linha} L ${x(serie.length - 1).toFixed(1)} ${base} L ${x(0).toFixed(1)} ${base} Z`;
  return {
    linha,
    area,
    fim: { x: x(serie.length - 1), y: y(serie[serie.length - 1]) },
  };
}
