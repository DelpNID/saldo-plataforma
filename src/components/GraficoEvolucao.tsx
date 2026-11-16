"use client";

import { useState, type PointerEvent } from "react";
import { COR_ASCENT } from "@/lib/cores";
import { useLarguraElemento } from "@/lib/use-largura-elemento";

export interface PontoGrafico {
  data: string; // "16/11"
  avanco: number; // 0 a 1
  realizado: number;
  previsto: number;
  pendentes: number;
}

const fmt1 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const fmt0 = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const pctTxt = (v: number) => `${fmt1.format(v * 100)}%`;

// Regra de gráfico do Visto: largura MEDIDA (1 unidade = 1 px, useLarguraElemento) e altura fixa —
// mais largura vira mais respiro entre os pontos, nunca texto maior.
const A = 200;
const M = { esq: 40, dir: 14, topo: 14, base: 26 };
// Cores de tema em SVG entram por `style` (o atributo fill/stroke não resolve var()).
const COR_TEXTO_EIXO = "rgb(var(--txt-2))";
const COR_SUPERFICIE = "rgb(var(--bg))";
const COR_CRUZ = "rgb(var(--border-med))";
const CAB = "px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-txt-muted";

/** Linha única: avanço do saldo por dia. Tocar ou passar o mouse mostra os números do dia. */
export function GraficoEvolucao({ pontos }: { pontos: PontoGrafico[] }) {
  const [ativo, setAtivo] = useState<number | null>(null);
  const [medidaRef, largura] = useLarguraElemento<HTMLDivElement>();
  // Antes da primeira medida (renderização no servidor) usa a largura de um celular.
  const L = Math.max(260, largura || 340);

  if (pontos.length < 2) {
    const p = pontos[0];
    return (
      <div className="rounded-btn bg-bg-2 px-3.5 py-3 text-sm text-txt">
        <p>
          O histórico começou em <b className="font-mono">{p?.data ?? "–"}</b>
          {p ? (
            <>
              , com <b className="font-mono">{pctTxt(p.avanco)}</b> do saldo subido
            </>
          ) : null}
          . A linha de evolução aparece a partir da próxima atualização feita em outro dia.
        </p>
      </div>
    );
  }

  const valores = pontos.map((p) => p.avanco * 100);
  const min = Math.max(0, Math.floor(Math.min(...valores) - 1));
  const max = Math.min(100, Math.ceil(Math.max(...valores) + 1));
  const faixa = Math.max(1, max - min);
  const x = (i: number) => M.esq + (i * (L - M.esq - M.dir)) / (pontos.length - 1);
  const y = (v: number) => M.topo + (1 - (v - min) / faixa) * (A - M.topo - M.base);
  const linhas = [min, min + faixa / 2, max];
  const caminho = pontos.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.avanco * 100).toFixed(1)}`).join(" ");
  const ultimo = pontos.length - 1;
  const passoRotulo = Math.max(1, Math.ceil(pontos.length / Math.max(3, Math.floor(L / 90)))); // datas sem encavalar

  const mover = (e: PointerEvent<SVGRectElement>) => {
    const r = e.currentTarget.ownerSVGElement?.getBoundingClientRect();
    if (!r) return;
    const xs = ((e.clientX - r.left) / r.width) * L;
    let melhor = 0;
    for (let i = 1; i < pontos.length; i++) if (Math.abs(x(i) - xs) < Math.abs(x(melhor) - xs)) melhor = i;
    setAtivo(melhor);
  };

  const sel = ativo ?? ultimo;
  const ps = pontos[sel];
  // O balão encosta na borda mais próxima para não sair do cartão no celular
  const posX = x(sel) / L;
  const balao = posX < 0.33 ? { left: x(sel), transform: "none" } : posX > 0.67 ? { right: L - x(sel), transform: "none" } : { left: x(sel) };
  const eixo = { fill: COR_TEXTO_EIXO, fontSize: 12 };

  return (
    <div className="relative pt-[54px]" ref={medidaRef}>
      <div
        className="pointer-events-none absolute top-0 flex max-w-[calc(100%-4px)] -translate-x-1/2 flex-col rounded-btn bg-txt px-2.5 py-1.5 text-sm leading-tight text-bg"
        role="status"
        style={balao}
      >
        <span>
          <b className="font-mono">{ps.data}</b> · <span className="font-mono">{pctTxt(ps.avanco)}</span>
        </span>
        <small className="text-xs opacity-85">
          <span className="font-mono">
            {fmt0.format(ps.realizado)} de {fmt0.format(ps.previsto)}
          </span>{" "}
          · <span className="font-mono">{fmt0.format(ps.pendentes)}</span> pendentes
        </small>
      </div>
      <svg
        width={L}
        height={A}
        viewBox={`0 0 ${L} ${A}`}
        className="block max-w-full touch-pan-y font-mono"
        role="img"
        aria-label={`Avanço do saldo de ${pontos[0].data} a ${pontos[ultimo].data}: de ${pctTxt(pontos[0].avanco)} para ${pctTxt(pontos[ultimo].avanco)}`}
      >
        {linhas.map((v) => (
          <g key={v}>
            <line x1={M.esq} x2={L - M.dir} y1={y(v)} y2={y(v)} style={{ stroke: COR_ASCENT.grade, strokeWidth: 1 }} />
            <text x={M.esq - 8} y={y(v) + 4} textAnchor="end" style={eixo}>
              {fmt0.format(v)}%
            </text>
          </g>
        ))}
        {pontos.map((p, i) =>
          i % passoRotulo === 0 || i === ultimo ? (
            <text key={p.data} x={x(i)} y={A - 8} textAnchor={i === 0 ? "start" : i === ultimo ? "end" : "middle"} style={eixo}>
              {p.data}
            </text>
          ) : null,
        )}
        <line x1={x(sel)} x2={x(sel)} y1={M.topo} y2={A - M.base} style={{ stroke: COR_CRUZ, strokeDasharray: "3 3" }} />
        <path d={caminho} style={{ fill: "none", stroke: COR_ASCENT.linhaEvolucao, strokeWidth: 2, strokeLinejoin: "round", strokeLinecap: "round" }} />
        {pontos.map((p, i) => (
          <circle
            key={p.data}
            cx={x(i)}
            cy={y(p.avanco * 100)}
            r={i === sel ? 6 : 4.5}
            style={{ fill: i === ultimo ? COR_ASCENT.pontoAtual : COR_ASCENT.linhaEvolucao, stroke: COR_SUPERFICIE, strokeWidth: 2 }}
          />
        ))}
        <rect
          x={0}
          y={0}
          width={L}
          height={A}
          className="cursor-crosshair"
          style={{ fill: "transparent" }}
          onPointerMove={mover}
          onPointerDown={mover}
          onPointerLeave={() => setAtivo(null)}
        />
      </svg>
      <details className="mt-1">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-txt underline underline-offset-2">
          Ver em tabela
        </summary>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-med">
                <th className={`${CAB} text-left`}>Dia</th>
                <th className={`${CAB} text-right`}>Avanço</th>
                <th className={`${CAB} text-right`}>Realizado</th>
                <th className={`${CAB} text-right`}>Pendentes</th>
              </tr>
            </thead>
            <tbody>
              {[...pontos].reverse().map((p) => (
                <tr key={p.data} className="border-b border-subtle font-mono text-sm text-txt">
                  <td className="px-3 py-1.5">{p.data}</td>
                  <td className="px-3 py-1.5 text-right">{pctTxt(p.avanco)}</td>
                  <td className="px-3 py-1.5 text-right">
                    {fmt0.format(p.realizado)} de {fmt0.format(p.previsto)}
                  </td>
                  <td className="px-3 py-1.5 text-right">{fmt0.format(p.pendentes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
