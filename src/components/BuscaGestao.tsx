"use client";

import { clsx } from "clsx";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Barra, Comparacao, EtiquetaSituacao } from "./Etiquetas";
import { CLASSE_CAMPO } from "./ui/Campo";
import { COR_ASCENT } from "@/lib/cores";
import { num, pct } from "@/lib/formato";
import { buscarCodigos, resumirSelecao, type CodigoBusca } from "@/lib/kpis";

const MAX_LISTA = 30;
/** Rótulo micro-caps (régua do Visto). */
const ROTULO = "text-[11px] font-bold uppercase tracking-[0.1em] text-txt-muted";

/** "Como está o avanço de…": filtra por desenho, código de tarefa ou descrição do equipamento e soma o recorte. */
export function BuscaGestao({ codigos, inicial = "", comFabric = false }: { codigos: CodigoBusca[]; inicial?: string; comFabric?: boolean }) {
  const [q, setQ] = useState(inicial);
  const achados = useMemo(() => buscarCodigos(codigos, q), [codigos, q]);
  const r = useMemo(() => resumirSelecao(achados), [achados]);
  const ativo = q.trim() !== "";

  return (
    <section className="flex flex-col gap-2 rounded-card border border-subtle bg-bg p-4 shadow-subtle" aria-labelledby="g-busca-t">
      <label id="g-busca-t" className={ROTULO} htmlFor="g-busca-campo">
        Como está o avanço de…
      </label>
      <input
        id="g-busca-campo"
        className={clsx(CLASSE_CAMPO, "!text-base")}
        type="search"
        inputMode="search"
        autoComplete="off"
        placeholder="Desenho, código de tarefa ou equipamento"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      {!ativo && <p className="text-sm text-txt-2">Ex.: 090012-35-DA-0229, 1.18 ou PIN PILE.</p>}

      {ativo && achados.length === 0 && (
        <p className="rounded-btn bg-bg-2 px-3.5 py-3 text-sm text-txt" role="status">
          Nada encontrado para “{q.trim()}”. Confira o desenho, o código ou o nome do equipamento.
        </p>
      )}

      {ativo && achados.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-subtle pt-2" role="status" aria-live="polite">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <b className="font-mono text-[36px] font-bold leading-none text-txt">{pct(r.avanco)}</b>
            <span className="text-sm font-semibold text-txt-2">
              {num(r.codigos)} {r.codigos === 1 ? "código de tarefa" : "códigos de tarefa"} · {num(r.desenhos)} {r.desenhos === 1 ? "desenho" : "desenhos"}
            </span>
          </div>
          {comFabric ? (
            <Comparacao saldo={r.avanco} fabric={r.fabric} previsto={r.previsto} realizado={r.realizado} />
          ) : (
            <Barra valor={r.avanco} cor={COR_ASCENT.avanco} className="h-2.5" />
          )}
          <span className="text-sm text-txt-2">
            <span className="font-mono">
              {num(r.realizado, 1)} de {num(r.previsto, 1)}
            </span>{" "}
            previsto · faltam <span className="font-mono">{num(Math.max(0, r.previsto - r.realizado), 1)}</span>
          </span>
          <dl className="grid grid-cols-2 gap-2">
            <div className="rounded-btn border border-subtle bg-bg-2 px-2.5 py-2">
              <dt className={ROTULO}>Pendentes de baixa</dt>
              <dd className="font-mono text-xl font-bold text-txt">
                {num(r.pendentes)} <small className="text-[13px] font-medium text-txt-2">de {num(r.componentes)}</small>
              </dd>
            </div>
            <div className="rounded-btn border border-subtle bg-bg-2 px-2.5 py-2">
              <dt className={ROTULO}>Execuções pendentes</dt>
              <dd className="font-mono text-xl font-bold text-txt">
                {num(r.execPend, 1)} <small className="text-[13px] font-medium text-txt-2">de {num(r.execucoes)}</small>
              </dd>
            </div>
          </dl>
          <ol>
            {achados.slice(0, MAX_LISTA).map((t) => (
              <li key={t.cod} className="border-t border-subtle first:border-t-0">
                <Link
                  href={`/tarefa/${encodeURIComponent(t.cod)}`}
                  className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1 py-2.5 text-txt transition-colors hover:bg-bg-2"
                >
                  <span className="col-span-2 break-words text-[15px] leading-snug">
                    <b className="font-mono font-bold">{t.cod}</b> {t.descricao}
                  </span>
                  <span className="font-mono text-sm text-txt-2">{t.desenho}</span>
                  <span className="justify-self-end">
                    <EtiquetaSituacao avanco={t.avanco} />
                  </span>
                  <span className="col-span-2 text-[13px] text-txt-2">
                    <b className="font-mono text-txt">{pct(t.avanco)}</b>
                    {comFabric ? ` × fabric. ${pct(t.fabric)}` : ""} · {num(t.realizado, 1)} de {num(t.previsto, 1)} · {num(t.pendentes)} pend.
                  </span>
                </Link>
              </li>
            ))}
          </ol>
          {achados.length > MAX_LISTA && (
            <p className="text-sm text-txt-2">E mais {num(achados.length - MAX_LISTA)} códigos. Refine a busca para ver todos.</p>
          )}
        </div>
      )}
    </section>
  );
}
