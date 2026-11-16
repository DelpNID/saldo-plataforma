"use client";

// Origem: delp-visto@f66a6c3 src/components/layout/Painel.tsx
// Desvios (aditivos; o uso do Visto continua valendo):
//   - `acao` aceita `href` (vira next/link): o onClick não passa de uma página de
//     servidor para o navegador, e no Ascent o link do bloco leva a outra tela;
//   - `apoio` aceita conteúdo (ReactNode), para o apoio com link (nota de Retrabalho);
//   - o link/botão da `acao` tem 44px de altura (min-h-11), alvo de toque do Ascent.
//   Ver docs/visto-desvios.md.
// -----------------------------------------------------------------------------
// Painel.tsx — o cartão de bloco das telas de indicador: título em caixa baixa
// e TINTA ESCURA, apoio em cinza e, à direita, o link da tela que resolve o
// assunto do bloco.
//
// Não é o CabecalhoSecao: aquele escreve o título em Delp Red, que é o registro
// dos cartões de CADASTRO do Portal. Numa tela de painel, com seis blocos
// abertos ao mesmo tempo, seis títulos vermelhos fazem a tela inteira gritar e
// o vermelho perde o papel de destaque — por isso o Dashboard nasceu com este
// desenho, e por isso a Visão geral da empresa passou a usá-lo (14/09/2026,
// pedido do Lucas: "os títulos dos gráficos devem ser pretos como os do
// dashboard"). Uma cópia só, para os dois não divergirem.
// -----------------------------------------------------------------------------
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';
import { useNaFolha } from './folha';

/** O link "Ver →" do bloco; min-h-11 é o desvio de toque do Ascent. */
const CLASSE_ACAO =
  'flex min-h-11 shrink-0 items-center gap-1 rounded-btn px-2 py-1 text-xs font-semibold text-txt-2 transition-colors hover:bg-bg-2 hover:text-delp-red';

export function Painel({
  titulo,
  apoio,
  acao,
  controles,
  children,
  className,
  preencher = false,
  alinhado = false,
}: {
  titulo: string;
  apoio?: ReactNode;
  acao?: { rotulo: string; onClick?: () => void; href?: string };
  /** Controle do próprio bloco no cabeçalho (ex.: o alternador de janela do
   *  gráfico). Fica antes do link da `acao`, que leva para outra tela. */
  controles?: ReactNode;
  children: ReactNode;
  className?: string;
  /** O conteúdo ESTICA até o fim do cartão (com duascol:self-stretch na
   *  className, o cartão estica até a altura da linha). Para o painel curto
   *  que dividia a linha com um gráfico alto e deixava branco embaixo. */
  preencher?: boolean;
  /**
   * Casa o CABEÇALHO com o do painel vizinho (subgrid). Dois painéis lado a
   * lado com apoios de tamanhos diferentes — um de duas linhas, outro de três
   * — começam o conteúdo em alturas diferentes, e dois gráficos iguais ficam
   * desencontrados na tela. Com subgrid os dois cartões herdam as MESMAS duas
   * linhas do contêiner (cabeçalho e corpo), então o corpo começa na mesma
   * horizontal nos dois.
   *
   * Exige que o contêiner declare `duascol:grid-rows-[auto_1fr]` e que os dois
   * painéis usem a prop. Navegador sem subgrid ignora a regra e cai no
   * empilhamento de sempre — o desalinhamento volta, nada quebra.
   */
  alinhado?: boolean;
}) {
  const folha = useNaFolha();
  // --sangria é o recuo do bloco, e quem encosta a tabela na borda dele (a
  // TabelaColaboradores, a lista de quem não entra hoje) desconta o MESMO
  // valor: numa folha o recuo é o dos fatos do cabeçalho, 20px.
  const sangria = { '--sangria': folha ? '1.25rem' : '1rem' } as CSSProperties;
  return (
    <section
      style={sangria}
      className={`p-[var(--sangria)] ${folha ? '' : 'rounded-card border border-subtle bg-bg shadow-subtle'} ${
        preencher ? 'flex flex-col' : ''
      } ${
        alinhado ? 'duascol:row-span-2 duascol:grid duascol:grid-rows-subgrid duascol:gap-y-0' : ''
      } ${className ?? ''}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold leading-tight text-txt">{titulo}</h2>
          {apoio && <p className="mt-1 max-w-[70ch] text-xs leading-snug text-txt-muted">{apoio}</p>}
        </div>
        {controles}
        {acao &&
          (acao.href ? (
            <Link href={acao.href} className={CLASSE_ACAO}>
              {acao.rotulo}
              <ArrowRight size={13} aria-hidden="true" />
            </Link>
          ) : (
            <button type="button" onClick={acao.onClick} className={CLASSE_ACAO}>
              {acao.rotulo}
              <ArrowRight size={13} aria-hidden="true" />
            </button>
          ))}
      </div>
      <div className={`mt-3 ${preencher ? 'flex flex-1 flex-col' : ''}`}>{children}</div>
    </section>
  );
}
