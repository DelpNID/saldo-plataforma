"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";

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

// O desenho usa a largura real do cartão (1 unidade = 1 px): o texto fica legível no celular e no computador.
const A = 200;
const M = { esq: 40, dir: 14, topo: 14, base: 26 };

/** Linha única: avanço do saldo por dia. Tocar ou passar o mouse mostra os números do dia. */
export function GraficoEvolucao({ pontos }: { pontos: PontoGrafico[] }) {
  const [ativo, setAtivo] = useState<number | null>(null);
  const caixa = useRef<HTMLDivElement>(null);
  const [L, setL] = useState(340);

  useEffect(() => {
    const el = caixa.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setL(Math.max(260, Math.round(el.clientWidth))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  if (pontos.length < 2) {
    const p = pontos[0];
    return (
      <div className="g-vazio">
        <p>
          O histórico começou em <b>{p?.data ?? "–"}</b>
          {p ? (
            <>
              , com <b>{pctTxt(p.avanco)}</b> do saldo subido
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
  const esquerda = (x(sel) / L) * 100;

  return (
    <div className="g-grafico" ref={caixa}>
      <div className="g-tooltip" role="status" style={{ left: `clamp(70px, ${esquerda}%, calc(100% - 70px))` }}>
        <b>{ps.data}</b> · {pctTxt(ps.avanco)}
        <small>
          {fmt0.format(ps.realizado)} de {fmt0.format(ps.previsto)} · {fmt0.format(ps.pendentes)} pendentes
        </small>
      </div>
      <svg
        width={L}
        height={A}
        viewBox={`0 0 ${L} ${A}`}
        role="img"
        aria-label={`Avanço do saldo de ${pontos[0].data} a ${pontos[ultimo].data}: de ${pctTxt(pontos[0].avanco)} para ${pctTxt(pontos[ultimo].avanco)}`}
      >
        {linhas.map((v) => (
          <g key={v}>
            <line className="g-linha-grade" x1={M.esq} x2={L - M.dir} y1={y(v)} y2={y(v)} />
            <text className="g-eixo" x={M.esq - 8} y={y(v) + 4} textAnchor="end">
              {fmt0.format(v)}%
            </text>
          </g>
        ))}
        {pontos.map((p, i) =>
          i % passoRotulo === 0 || i === ultimo ? (
            <text key={p.data} className="g-eixo" x={x(i)} y={A - 8} textAnchor={i === 0 ? "start" : i === ultimo ? "end" : "middle"}>
              {p.data}
            </text>
          ) : null,
        )}
        <line className="g-cruz" x1={x(sel)} x2={x(sel)} y1={M.topo} y2={A - M.base} />
        <path className="g-linha" d={caminho} />
        {pontos.map((p, i) => (
          <circle key={p.data} className={i === ultimo ? "g-ponto g-ponto-atual" : "g-ponto"} cx={x(i)} cy={y(p.avanco * 100)} r={i === sel ? 6 : 4.5} />
        ))}
        <rect className="g-alvo" x={0} y={0} width={L} height={A} onPointerMove={mover} onPointerDown={mover} onPointerLeave={() => setAtivo(null)} />
      </svg>
      <details className="g-tabela">
        <summary>Ver em tabela</summary>
        <div className="tab-wrap">
          <table>
            <thead>
              <tr>
                <th>Dia</th>
                <th className="n">Avanço</th>
                <th className="n">Realizado</th>
                <th className="n">Pendentes</th>
              </tr>
            </thead>
            <tbody>
              {[...pontos].reverse().map((p) => (
                <tr key={p.data}>
                  <td>{p.data}</td>
                  <td className="n">{pctTxt(p.avanco)}</td>
                  <td className="n">
                    {fmt0.format(p.realizado)} de {fmt0.format(p.previsto)}
                  </td>
                  <td className="n">{fmt0.format(p.pendentes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
