"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BarrasSaldo, EtiquetaSituacao, LinhaFabric, faltaFabric } from "./Etiquetas";
import { num, pct } from "@/lib/formato";
import { buscarCodigos, resumirSelecao, type CodigoBusca } from "@/lib/kpis";

const MAX_LISTA = 30;

/** "Como está o avanço de…": filtra por desenho, código de tarefa ou descrição do equipamento e soma o recorte. */
export function BuscaGestao({ codigos, inicial = "", comFabric = false }: { codigos: CodigoBusca[]; inicial?: string; comFabric?: boolean }) {
  const [q, setQ] = useState(inicial);
  const achados = useMemo(() => buscarCodigos(codigos, q), [codigos, q]);
  const r = useMemo(() => resumirSelecao(achados), [achados]);
  const ativo = q.trim() !== "";

  return (
    <section className="card g-busca" aria-labelledby="g-busca-t">
      <label id="g-busca-t" className="stat-l" htmlFor="g-busca-campo">
        Como está o avanço de…
      </label>
      <input
        id="g-busca-campo"
        className="campo"
        type="search"
        inputMode="search"
        autoComplete="off"
        placeholder="Desenho, código de tarefa ou equipamento"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {!ativo && <p className="nota">Ex.: 090012-35-DA-0229, 1.18 ou PIN PILE.</p>}

      {ativo && achados.length === 0 && (
        <p className="g-vazio" role="status">
          Nada encontrado para “{q.trim()}”. Confira o desenho, o código ou o nome do equipamento.
        </p>
      )}

      {ativo && achados.length > 0 && (
        <div className="g-busca-res" role="status" aria-live="polite">
          <div className="g-hero-v">
            <b>{pct(r.avanco)}</b>
            <span className="g-delta">
              {num(r.codigos)} {r.codigos === 1 ? "código de tarefa" : "códigos de tarefa"} · {num(r.desenhos)} {r.desenhos === 1 ? "desenho" : "desenhos"}
            </span>
          </div>
          <BarrasSaldo saldo={r.avanco} fabric={comFabric ? r.fabric : null} />
          {comFabric && <LinhaFabric saldo={r.avanco} fabric={r.fabric} falta={faltaFabric(r.fabric, r.previsto, r.realizado)} />}
          <span className="stat-d">
            {num(r.realizado, 1)} de {num(r.previsto, 1)} previsto · faltam {num(Math.max(0, r.previsto - r.realizado), 1)}
          </span>
          <dl className="g-busca-kpis">
            <div>
              <dt>Pendentes de baixa</dt>
              <dd>
                {num(r.pendentes)} <small>de {num(r.componentes)}</small>
              </dd>
            </div>
            <div>
              <dt>Execuções pendentes</dt>
              <dd>
                {num(r.execPend, 1)} <small>de {num(r.execucoes)}</small>
              </dd>
            </div>
          </dl>
          <ol className="g-top">
            {achados.slice(0, MAX_LISTA).map((t) => (
              <li key={t.cod}>
                <Link href={`/tarefa/${encodeURIComponent(t.cod)}`}>
                  <span className="g-top-t">
                    <b>{t.cod}</b> {t.descricao}
                  </span>
                  <span className="g-top-n mono">{t.desenho}</span>
                  <EtiquetaSituacao avanco={t.avanco} />
                  <span className="g-pct">
                    <b>{pct(t.avanco)}</b>
                    {comFabric ? ` × fabric. ${pct(t.fabric)}` : ""} · {num(t.realizado, 1)} de {num(t.previsto, 1)} · {num(t.pendentes)} pend.
                  </span>
                </Link>
              </li>
            ))}
          </ol>
          {achados.length > MAX_LISTA && <p className="nota">E mais {num(achados.length - MAX_LISTA)} códigos. Refine a busca para ver todos.</p>}
        </div>
      )}
    </section>
  );
}
