"use client";

// Origem: delp-visto@f66a6c3 src/components/ui/TileIndicador.tsx
// Desvios (aditivos; o uso do Visto continua valendo):
//   - `children`: conteúdo entre a linha do valor e o detalhe;
//   - `variacaoTexto`: variação já escrita, para as séries do Ascent ("desde ontem");
//   - a variação "boa" usa text-success-forte (o --success puro dá ~3:1 em 12px).
//   Ver docs/visto-desvios.md.
// -----------------------------------------------------------------------------
// TileIndicador.tsx — o card de número do Portal (padrão único, 30/07/2026)
//
// Antes cada tela tinha o seu: TileSiclope (faixa vermelha + ícone à direita),
// os cards do People Analytics (ícone em quadro colorido, número acima do
// rótulo) e o tile das Entrevistas. Agora é um só, nesta ordem de leitura:
//
//   RÓTULO EM CAIXA-ALTA          ← o que é (recua, em cinza)
//   1.318                         ← o número (mono, tabular, tinta escura)
//   ↗ +7% em junho (16) vs. maio  ← para onde vai, quando há série
//   Média por mês fechado: 14     ← com o que comparar
//
// Um número sozinho não responde "1.318 é muito?" — daí a tendência e o
// detalhe. `serie`/`meses` são opcionais: telas sem histórico (Indicações,
// Vagas, Siclope) usam rótulo + valor + detalhe e o card fica igual.
//
// Regras que o componente garante:
// · variação com cor semântica SÓ quando o chamador diz o sentido
//   (`subirEhBom`) — cor errada é pior que cor nenhuma;
// · série percentual (`taxa`) compara em pontos percentuais, não em % relativo;
// · mês corrente e futuros ficam fora da tendência (ver indicador-tendencia);
// · o sparkline segue a ESCALA ÚNICA dos gráficos (22/09/2026): vermelho [4],
//   o Delp Red da marca. Ele foi vermelho até 15/09/2026, virou tinta com o
//   argumento de que cinco cards na mesma faixa punham cinco manchas
//   vermelhas em linha — e volta agora porque a escala de uma matiz só passou
//   a valer no sistema inteiro, e um gráfico cinza no meio dela seria a
//   exceção. O custo é conhecido e foi aceito na escolha da direção: a faixa
//   de KPIs tem cinco traços vermelhos lado a lado. Quem carrega o SENTIDO
//   continua sendo a variação ao lado do número, que só acende quando o
//   chamador diz para que lado é bom.
// -----------------------------------------------------------------------------

import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import {
  barrinhas,
  larguraDasBarrinhas,
  media,
  mesesFechados,
  sparkline,
  variacaoMensal,
  variacaoNoPeriodo,
} from '../../lib/indicador-tendencia';
import { useNaFolha } from '../layout/folha';
import type { VariacaoMensal } from '../../lib/indicador-tendencia';
import type { ReactNode } from 'react';

const fInt = (v: number) => v.toLocaleString('pt-BR');

/**
 * O degrau [4] da escala dos gráficos — o Delp Red da marca.
 *
 * Entra como TOKEN e não como classe do Tailwind: este é o único gráfico do
 * sistema que pinta por `currentColor` (o resto recebe a cor por prop, do
 * catálogo COR_TERCEIROS), e uma classe obrigaria a escala a existir duas
 * vezes — no catálogo (`ESCALA_VERMELHOS`, src/lib/terceiros-ui.ts) e no
 * tailwind.config.js. Aqui não dá para importar o catálogo: `components/ui/`
 * não importa do módulo. O token é a MESMA fonte dos dois, e acompanha o tema.
 */
const TOM_DA_TENDENCIA = 'rgb(var(--vermelho-4))';

/**
 * As barrinhas do registro 'painel' (11/11/2026, "como o exemplo… acho que
 * ficou mais limpo"). Os meses anteriores no degrau [3] e o último no [5]: dois
 * degraus de distância, porque vizinhos da escala se leem como uma cor só, e
 * nada abaixo do [3], que não passa 3:1 contra o cartão sem legenda ao lado. O
 * mês zerado é um toco no cinza dos fios.
 */
// 4px de barra: com seis cards na faixa (o de visitantes, 11/11/2026), um card
// de 1780px de tela tem ~140px úteis — número de três dígitos + 11 barras.
const BARRA = { largura: 4, vao: 2, altura: 44 };
const COR_BARRA = 'rgb(var(--vermelho-3))';
const COR_ULTIMA_BARRA = 'rgb(var(--vermelho-5))';
const COR_TOCO = 'rgb(var(--border-med))';

export interface TileIndicadorProps {
  /** Número já formatado (ou string curta como '—'). */
  valor: number | string;
  /** Sufixo em corpo menor ao lado do número (ex.: 'h' de horas). */
  sufixo?: string;
  rotulo: string;
  /** Linha de contexto sob o número ('75% do total', '2 recusas'…). */
  detalhe?: string;
  /** Cor de um ponto antes do rótulo — identidade de categoria ou estado
   *  (crítico/atenção/normal). Sem ele, o rótulo vem só em cinza. */
  tom?: string;
  /** Contagem por mês, alinhada a `meses` (ver Indicadores.kpis). */
  serie?: number[];
  /** Rótulos MM/AAAA do eixo — nomeiam os meses da comparação. */
  meses?: string[];
  /** true = subir é bom (adesão); false = subir é ruim (desligamentos). */
  subirEhBom?: boolean;
  /** Formata os valores da série nos textos de apoio. */
  formatarSerie?: (v: number) => string;
  /** true = a série JÁ é percentual: variação em pontos percentuais. */
  taxa?: boolean;
  /** true = série ACUMULADA (estoque: quadro cadastrado mês a mês). Some com a
   *  linha de média, que só faz sentido em fluxo — "média de acumulado" não
   *  significa nada. A variação mês a mês continua (é o crescimento). */
  estoque?: boolean;
  /**
   * Registro do card. 'painel' (Dashboard da Gestão de Terceiros e do portal):
   * número maior com a variação embaixo dele e, ao lado, uma BARRINHA por mês
   * fechado, o último em destaque (11/11/2026, no lugar da faixa larga de área
   * com os meses escritos, que vinha de 14/09/2026). 'padrao' é o card do resto
   * do Portal, onde ele divide a linha com outros três e a tendência é um fio
   * ao lado do número.
   */
  variante?: 'padrao' | 'painel';
  /** Eixo da série. 'mensal' (padrão) compara os dois últimos meses FECHADOS e
   *  precisa de `meses`. 'diario' é para séries dia a dia (snapshots): compara
   *  a ponta com o começo do período ("−3 nos últimos 7 dias"), sem descartar
   *  o dia corrente — contagem de quadro é estoque, não acumulado do dia. */
  eixo?: 'mensal' | 'diario';
  /** Se informado, o tile inteiro vira botão (ex.: "toque para ver quem"). */
  onClick?: () => void;
  /** Ascent: conteúdo entre a linha do valor e o detalhe (a barra Saldo ×
   *  Fabricação, o link "ver lista", a situação da RA). */
  children?: ReactNode;
  /** Ascent: variação já escrita ("desde ontem", "em 7 dias"), para séries que
   *  não são mensais nem do período — substitui a variação calculada, com a
   *  mesma seta e a mesma regra de cor. */
  variacaoTexto?: { texto: string; sentido: -1 | 0 | 1; subirEhBom?: boolean };
}

export function TileIndicador({
  valor,
  sufixo,
  rotulo,
  detalhe,
  tom,
  serie,
  meses,
  subirEhBom,
  formatarSerie = fInt,
  taxa = false,
  estoque = false,
  eixo = 'mensal',
  onClick,
  variante = 'padrao',
  children,
  variacaoTexto,
}: TileIndicadorProps) {
  // Numa folha (layout/folha.ts) o card é uma célula da faixa: sem caixa, e o
  // fio entre as células é de quem monta a faixa.
  const naFolha = useNaFolha();
  const diario = eixo === 'diario';
  // Estoque (quadro de pessoas) informa pela DIFERENÇA ABSOLUTA: 1.321 → 1.318
  // em % arredonda para "0%" e esconde que três pessoas saíram.
  const porDiferenca = taxa || estoque;
  const v = diario
    ? variacaoNoPeriodo(serie ?? [])
    : serie && meses
      ? variacaoMensal(serie, meses)
      : null;
  // Contagem compara em %; taxa compara em pontos percentuais.
  const sentido = v ? (porDiferenca ? v.dif : (v.pct ?? 0)) : 0;
  // Tendência e média ignoram o mês em curso: com ele a linha despenca no fim
  // só porque o mês ainda não terminou. O valor grande segue sendo o total.
  const serieTendencia =
    !diario && serie && meses ? serie.slice(0, mesesFechados(meses)) : serie;
  const temTendencia = Boolean(serieTendencia && serieTendencia.length >= 3);
  // Série diária é estoque (quadro do dia): média de estoque não diz nada.
  const temMedia = temTendencia && !estoque && !diario;
  // O registro menor (72×28, o `compacto`) saiu em 11/11/2026 com a Visão
  // geral da empresa, a última a usá-lo: ela passou ao 'painel'.
  const larguraLinha = 108;
  const alturaLinha = 34;
  const linha = serieTendencia ? sparkline(serieTendencia, larguraLinha, alturaLinha) : null;
  // pct null (mês anterior zerado) só atrapalha contagem; taxa usa a diferença.
  const semComparacao = v == null || (!porDiferenca && v.pct == null);
  // UMA cor de variação para os dois registros. No 'painel' ela chegou a ser
  // uma PÍLULA com superfície tingida, e saiu em 22/09/2026 ("retire essa cor
  // em volta"): a variação é um detalhe ao lado de um número de 32px, e a
  // mancha de cor pesava mais que o próprio dado — na faixa de cinco tiles,
  // cinco manchinhas verdes e vermelhas em linha. A seta e o sinal já dizem
  // para que lado foi; a cor do TEXTO diz se isso é bom.
  // Ascent: verde FORTE — o --success puro dá ~3:1 sobre branco em 12px (abaixo do AA).
  const corDe = (s: number, bom: boolean | undefined) =>
    s === 0 || bom === undefined ? 'text-txt-2' : (s > 0) === bom ? 'text-success-forte' : 'text-danger';
  const corVariacao = semComparacao ? 'text-txt-2' : corDe(sentido, subirEhBom);
  const SetaDe = (s: number) => (s > 0 ? TrendingUp : s < 0 ? TrendingDown : Minus);
  const variacaoPronta = variacaoTexto && (() => {
    const SetaTexto = SetaDe(variacaoTexto.sentido);
    return (
      <p className={`flex flex-wrap items-center gap-x-1 text-xs font-semibold ${corDe(variacaoTexto.sentido, variacaoTexto.subirEhBom)}`}>
        <SetaTexto size={13} aria-hidden="true" />
        <span>{variacaoTexto.texto}</span>
      </p>
    );
  })();

  const conteudo = (
    <>
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase leading-snug tracking-[0.1em] text-txt-muted">
        {tom && (
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: tom }}
            aria-hidden="true"
          />
        )}
        {rotulo}
      </p>
      <div className="flex items-end justify-between gap-3">
        <p className="font-mono text-[28px] font-bold leading-none tracking-tight text-txt">
          {typeof valor === 'number' ? fInt(valor) : valor}
          {sufixo && <span className="text-sm font-medium text-txt-muted">{sufixo}</span>}
        </p>
        {linha && (
          <svg
            width={larguraLinha}
            height={alturaLinha}
            viewBox={`0 0 ${larguraLinha} ${alturaLinha}`}
            className="shrink-0 overflow-visible"
            style={{ color: TOM_DA_TENDENCIA }}
            role="img"
            aria-label={
              diario
                ? `Tendência dos últimos ${serieTendencia!.length} dias: ${serieTendencia!.map(formatarSerie).join(', ')}.`
                : `Tendência dos ${serieTendencia!.length} meses fechados: ${serieTendencia!.map(formatarSerie).join(', ')}.`
            }
          >
            <path d={linha.area} fill="currentColor" opacity="0.1" />
            <path
              d={linha.linha}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <circle
              cx={linha.fim.x}
              cy={linha.fim.y}
              r="3"
              fill="currentColor"
              stroke="white"
              strokeWidth="2"
            />
          </svg>
        )}
      </div>
      {children}
      {variacaoPronta}
      {!variacaoTexto && v && !semComparacao && (
        <p className={`flex flex-wrap items-baseline gap-x-1 text-xs font-semibold ${corVariacao}`}>
          {sentido > 0 ? (
            <TrendingUp size={13} className="self-center" aria-hidden="true" />
          ) : sentido < 0 ? (
            <TrendingDown size={13} className="self-center" aria-hidden="true" />
          ) : (
            <Minus size={13} className="self-center" aria-hidden="true" />
          )}
          <span className="font-mono">
            {sentido > 0 ? '+' : ''}
            {taxa
              ? `${Math.round(v.dif)} p.p.`
              : estoque
                ? fInt(Math.round(v.dif))
                : `${Math.round((v.pct as number) * 100)}%`}
          </span>
          <span className="font-normal text-txt-2">
            {diario
              ? `nos últimos ${serie!.length} dias (de ${formatarSerie(v.anterior)} para ${formatarSerie(v.atual)})`
              : `em ${(v as VariacaoMensal).mes} (${formatarSerie(v.atual)}) vs. ${(v as VariacaoMensal).mesAnterior}`}
          </span>
        </p>
      )}
      {temMedia && (
        <p className="text-xs text-txt-muted">
          {taxa ? 'Média dos meses fechados: ' : 'Média por mês fechado: '}
          {/* Média de contagem pede uma decimal ("14"; "12,167" sugeria uma
              precisão que o indicador não tem). */}
          <span className="font-mono">
            {taxa
              ? formatarSerie(media(serieTendencia!))
              : media(serieTendencia!).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}
          </span>
          {detalhe && ` · ${detalhe}`}
        </p>
      )}
      {detalhe && !temMedia && <p className="text-xs text-txt-muted">{detalhe}</p>}
    </>
  );

  // ---- Registro 'painel' -----------------------------------------------------
  // O número com a variação embaixo dele (seta, sinal e cor de texto, sem
  // superfície) e, ao lado, uma barrinha por mês fechado, o último em destaque.
  // A largura é FIXA (a soma das barras), então não há medida nem laço de
  // tamanho: era o que a faixa larga de antes precisava contornar.
  const barras =
    variante === 'painel' && temTendencia && serieTendencia ? barrinhas(serieTendencia, BARRA) : null;
  const larguraBarras = barras ? larguraDasBarrinhas(barras.length, BARRA) : 0;
  const mesesTendencia = !diario && meses ? meses.slice(0, mesesFechados(meses)) : [];
  const variacaoEscrita =
    v && !semComparacao
      ? `${sentido > 0 ? '+' : ''}${
          taxa
            ? `${Math.round(v.dif)} p.p.`
            : estoque
              ? fInt(Math.round(v.dif))
              : `${Math.round((v.pct as number) * 100)}%`
        }`
      : null;
  const Seta = sentido > 0 ? TrendingUp : sentido < 0 ? TrendingDown : Minus;

  const conteudoPainel = (
    <>
      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase leading-snug tracking-[0.1em] text-txt-muted">
        {tom && (
          <span
            className="h-1.5 w-1.5 shrink-0 rounded-full"
            style={{ background: tom }}
            aria-hidden="true"
          />
        )}
        {rotulo}
      </p>
      <div className="mt-1 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[32px] font-bold leading-none tracking-tight text-txt">
            {typeof valor === 'number' ? fInt(valor) : valor}
            {sufixo && <span className="text-base font-medium text-txt-muted">{sufixo}</span>}
          </p>
          {variacaoTexto && <div className="mt-1.5">{variacaoPronta}</div>}
          {!variacaoTexto && variacaoEscrita && (
            <span
              className={`mt-1.5 flex items-center gap-1 text-xs font-bold ${corVariacao}`}
              title={
                v && 'mes' in v ? `${(v as VariacaoMensal).mes} vs. ${(v as VariacaoMensal).mesAnterior}` : undefined
              }
            >
              <Seta size={12} aria-hidden="true" />
              <span className="font-mono">{variacaoEscrita}</span>
            </span>
          )}
        </div>
        {barras && (
          <svg
            width={larguraBarras}
            height={BARRA.altura}
            viewBox={`0 0 ${larguraBarras} ${BARRA.altura}`}
            className="shrink-0"
            role="img"
            aria-label={`Tendência dos ${serieTendencia!.length} meses fechados: ${serieTendencia!.map(formatarSerie).join(', ')}.`}
          >
            {barras.map((b, i) => (
              <rect
                key={i}
                x={b.x}
                y={b.y}
                width={b.w}
                height={b.h}
                rx={1}
                // Cor de tema dentro de SVG entra por style: o atributo fill
                // não resolve var().
                style={{ fill: b.zero ? COR_TOCO : i === barras.length - 1 ? COR_ULTIMA_BARRA : COR_BARRA }}
              >
                <title>
                  {`${mesesTendencia[i] ? `${mesesTendencia[i]}: ` : ''}${formatarSerie(serieTendencia![i] ?? 0)}`}
                </title>
              </rect>
            ))}
          </svg>
        )}
      </div>
      {children}
      {detalhe && <p className="mt-1 text-xs leading-snug text-txt-muted">{detalhe}</p>}
    </>
  );

  // Sem flex-1: todo consumidor põe o tile numa grade (.grade-indicadores),
  // onde a propriedade é inerte — e ela sugeria que o card devia absorver a
  // largura sobrante, que é justamente o que a grade impede.
  const base = naFolha
    ? 'flex flex-col gap-1.5 px-5 py-4'
    : variante === 'painel'
      // SEM h-full: numa faixa que quebra linha, height:100% resolve contra a
      // altura do CONTÊINER (a soma das linhas), não contra a linha do card —
      // e cada card virava a altura das duas somadas, com o gráfico de
      // tendência largado no pé de uma torre de 400px (tela do Lucas com a
      // sidebar aberta, 14/09/2026). Encher a linha já é o padrão do flex e do
      // grid (align-items: stretch); o height não acrescentava nada.
      ? 'flex flex-col gap-1.5 rounded-card border border-subtle bg-bg p-4 shadow-subtle'
      : 'flex flex-col gap-1.5 rounded-card border border-subtle bg-bg p-4 shadow-sm';
  const corpo = variante === 'painel' ? conteudoPainel : conteudo;
  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={`${base} w-full text-left ${
          naFolha ? 'transition-colors hover:bg-bg-2/50' : 'transition-shadow hover:border-med hover:shadow-md'
        }`}
      >
        {corpo}
      </button>
    );
  }
  return <div className={base}>{corpo}</div>;
}
