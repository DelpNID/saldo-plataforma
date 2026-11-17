// Gráficos do painel do gestor (tela Gestão). Desenho do Visto: uma escala só, a de vermelhos
// (src/lib/cores.ts), degraus não vizinhos no mesmo gráfico e o rótulo SEMPRE escrito ao lado,
// para a cor nunca carregar a leitura sozinha. Cor de SVG entra por `style` (fill/stroke não
// resolvem var()). Sem estado: serve à página do servidor e aos blocos do navegador.
import { clsx } from "clsx";
import Link from "next/link";
import { COR_ASCENT } from "@/lib/cores";
import { num, pct } from "@/lib/formato";

const COR_PENDENTE = "rgb(var(--bg-3))";
const COR_TEXTO = "rgb(var(--txt))";
const COR_TEXTO_2 = "rgb(var(--txt-2))";
const largura = (v: number) => `${Math.max(0, Math.min(1, v)) * 100}%`;

/**
 * Rosca do saldo: o anel de fora é o saldo subido (degrau 5) sobre o pendente (cinza);
 * o anel de dentro, quando há, é a fabricação (degrau 3) — o que já deveria ter subido.
 */
export function RoscaSaldo({ saldo, fabric, tamanho = 168, rotulo }: { saldo: number; fabric: number | null; tamanho?: number; rotulo: string }) {
  const arco = (r: number, v: number) => {
    const c = 2 * Math.PI * r;
    return { strokeDasharray: `${Math.max(0, Math.min(1, v)) * c} ${c}` };
  };
  return (
    <svg
      viewBox="0 0 120 120"
      width={tamanho}
      height={tamanho}
      role="img"
      aria-label={`${rotulo}: ${pct(saldo)} do saldo subido, ${pct(Math.max(0, 1 - saldo))} pendente${fabric !== null ? `, fabricação ${pct(fabric)}` : ""}`}
      className="shrink-0"
    >
      <circle cx="60" cy="60" r="50" fill="none" strokeWidth="13" style={{ stroke: COR_PENDENTE }} />
      <circle cx="60" cy="60" r="50" fill="none" strokeWidth="13" transform="rotate(-90 60 60)" style={{ stroke: COR_ASCENT.saldo, ...arco(50, saldo) }}>
        <title>Saldo subido {pct(saldo)}</title>
      </circle>
      {fabric !== null && (
        <>
          <circle cx="60" cy="60" r="35" fill="none" strokeWidth="7" style={{ stroke: COR_PENDENTE }} />
          <circle
            cx="60"
            cy="60"
            r="35"
            fill="none"
            strokeWidth="7"
            transform="rotate(-90 60 60)"
            style={{ stroke: COR_ASCENT.fabricacao, ...arco(35, fabric) }}
          >
            <title>Fabricação {pct(fabric)}</title>
          </circle>
        </>
      )}
      <text x="60" y="61" textAnchor="middle" style={{ fill: COR_TEXTO, fontSize: 17, fontWeight: 700, fontFamily: "JetBrains Mono, monospace" }}>
        {pct(saldo)}
      </text>
      <text x="60" y="74" textAnchor="middle" style={{ fill: COR_TEXTO_2, fontSize: 7.5, fontWeight: 600 }}>
        saldo subido
      </text>
    </svg>
  );
}

/** Legenda da rosca: cada parte com o quadradinho da cor, o nome, o % e a quantidade. */
export function LegendaRosca({ saldo, fabric, previsto, realizado }: { saldo: number; fabric: number | null; previsto: number; realizado: number }) {
  const linhas = [
    { rotulo: "Saldo subido", cor: COR_ASCENT.saldo, parte: saldo, qtd: realizado },
    { rotulo: "Pendente", cor: COR_PENDENTE, parte: Math.max(0, 1 - saldo), qtd: Math.max(0, previsto - realizado), borda: true },
    ...(fabric !== null ? [{ rotulo: "Fabricação (anel de dentro)", cor: COR_ASCENT.fabricacao, parte: fabric, qtd: fabric * previsto }] : []),
  ];
  return (
    <ul className="flex min-w-0 flex-col gap-1.5 text-sm text-txt-2">
      {linhas.map((l) => (
        <li key={l.rotulo} className="grid grid-cols-[12px_minmax(0,1fr)_auto] items-center gap-x-2">
          <span
            className={clsx("h-3 w-3 rounded-sm", "borda" in l && l.borda && "border border-border-med")}
            style={{ background: l.cor }}
            aria-hidden="true"
          />
          <span className="min-w-0">{l.rotulo}</span>
          <span className="text-right">
            <b className="font-mono font-bold text-txt">{pct(l.parte)}</b> <span className="font-mono text-xs">{num(l.qtd, 1)}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export interface Parte {
  rotulo: string;
  explica?: string;
  n: number;
  cor: string;
  destaque?: boolean;
}

/** Uma barra dividida em partes (com 2px de fundo entre elas) e a lista com número e % de cada parte. */
export function FaixaPartes({ partes, total, rotuloTotal }: { partes: Parte[]; total: number; rotuloTotal: string }) {
  const parte = (n: number) => (total > 0 ? n / total : 0);
  return (
    <div className="flex flex-col gap-2.5">
      <span
        className="flex h-3.5 gap-0.5 overflow-hidden rounded-full bg-bg-3"
        role="img"
        aria-label={`${rotuloTotal}: ${partes.map((p) => `${p.rotulo} ${num(p.n)}`).join(", ")}`}
      >
        {partes
          .filter((p) => p.n > 0)
          .map((p) => (
            <span
              key={p.rotulo}
              className="block h-full first:rounded-l-full last:rounded-r-full"
              style={{ width: largura(parte(p.n)), background: p.cor }}
              title={`${p.rotulo}: ${num(p.n)}`}
            />
          ))}
      </span>
      <ul className="flex flex-col gap-1.5 text-sm text-txt-2">
        {partes.map((p) => (
          <li key={p.rotulo} className={clsx("grid grid-cols-[12px_minmax(0,1fr)_auto_3.25rem] items-baseline gap-x-2", p.destaque && "text-txt")}>
            <span className="h-3 w-3 translate-y-0.5 rounded-sm" style={{ background: p.cor }} aria-hidden="true" />
            <span className="min-w-0">
              <span className={clsx(p.destaque && "font-semibold")}>{p.rotulo}</span>
              {p.explica && <span className="block text-xs text-txt-2">{p.explica}</span>}
            </span>
            <b className="font-mono font-bold text-txt">{num(p.n)}</b>
            <span className="text-right font-mono text-xs">{pct(parte(p.n))}</span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-txt-2">
        {rotuloTotal}: <b className="font-mono text-txt">{num(total)}</b>
      </p>
    </div>
  );
}

/** Barras horizontais de uma série (degrau 4), cada uma com o nome, a quantidade e o % escritos; a linha leva à lista. */
export function BarrasLista({ itens, total }: { itens: { rotulo: string; explica?: string; n: number; href?: string }[]; total: number }) {
  const maior = Math.max(1, ...itens.map((i) => i.n));
  return (
    <ul className="flex flex-col">
      {itens.map((i) => {
        const conteudo = (
          <>
            <span className="min-w-0">
              <span className="font-semibold text-txt">{i.rotulo}</span>
              {i.explica && <span className="block text-xs text-txt-2">{i.explica}</span>}
            </span>
            <span className="text-right">
              <b className="font-mono font-bold text-txt">{num(i.n)}</b>{" "}
              <span className="font-mono text-xs text-txt-2">{pct(total > 0 ? i.n / total : 0)}</span>
            </span>
            <span className="col-span-2 block h-2 overflow-hidden rounded-full bg-bg-3" role="presentation">
              <span className="block h-full rounded-full" style={{ width: largura(i.n / maior), background: COR_ASCENT.avanco }} />
            </span>
          </>
        );
        const classe = "grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 py-2";
        return (
          <li key={i.rotulo} className="border-t border-subtle first:border-t-0">
            {i.href ? (
              <Link href={i.href} className={clsx(classe, "rounded-btn transition-colors hover:bg-bg-2")}>
                {conteudo}
              </Link>
            ) : (
              <div className={classe}>{conteudo}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
