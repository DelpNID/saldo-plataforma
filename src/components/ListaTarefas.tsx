"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Avanco, EtiquetaSituacao } from "./Etiquetas";
import { num } from "@/lib/formato";
import { ROTULO_SITUACAO, compararCodigo, grupoTarefa, situacaoTarefa, type SituacaoTarefa } from "@/lib/regras";

export interface TarefaResumo {
  cod: string;
  descricao: string;
  desenho: string;
  execucoes: number;
  execPend: number;
  previsto: number;
  realizado: number;
  avanco: number;
  fabric: number | null; // % AVANÇO FABRIC (null: planilha sem a coluna)
  pendMaterial: number;
  totalComp: number;
  opsTotal: number;
  opsComSaldo: number;
}

type Coluna = "codigo" | "avanco" | "atraso" | "execPend" | "opsComSaldo" | "pendMaterial";
type Direcao = "ascending" | "descending";
const SITUACOES: SituacaoTarefa[] = ["sem-avanco", "andamento", "concluida"];

// Primeiro clique: código e avanço do menor para o maior; números de pendência do maior para o menor
const DIRECAO_INICIAL: Record<Coluna, Direcao> = {
  codigo: "ascending",
  avanco: "ascending",
  atraso: "descending",
  execPend: "descending",
  opsComSaldo: "descending",
  pendMaterial: "descending",
};

const VALOR: Record<Exclude<Coluna, "codigo">, (t: TarefaResumo) => number> = {
  avanco: (t) => t.avanco,
  atraso: (t) => (t.fabric ?? 0) - t.avanco, // pontos atrás da fabricação
  execPend: (t) => t.execPend,
  opsComSaldo: (t) => t.opsComSaldo,
  pendMaterial: (t) => t.pendMaterial,
};

export function ListaTarefas({ tarefas, children }: { tarefas: TarefaResumo[]; children?: ReactNode }) {
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState<SituacaoTarefa | "todas">("todas");
  const [grupo, setGrupo] = useState("todos");
  const [ordem, setOrdem] = useState<{ coluna: Coluna; direcao: Direcao }>({ coluna: "codigo", direcao: "ascending" });
  const secao = useRef<HTMLElement>(null);
  const fixo = useRef<HTMLDivElement>(null);

  // O cabeçalho da lista para logo abaixo do bloco fixo (título + filtros)
  useEffect(() => {
    const el = fixo.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => secao.current?.style.setProperty("--fixo-h", `${el.offsetHeight}px`));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const comFabric = tarefas.some((t) => t.fabric !== null);
  const grupos = useMemo(() => [...new Set(tarefas.map((t) => grupoTarefa(t.cod)))].sort(compararCodigo), [tarefas]);
  const contagem = useMemo(() => {
    const c: Record<string, number> = { todas: tarefas.length };
    for (const t of tarefas) c[situacaoTarefa(t.avanco)] = (c[situacaoTarefa(t.avanco)] ?? 0) + 1;
    return c;
  }, [tarefas]);

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const l = tarefas.filter(
      (t) =>
        (situacao === "todas" || situacaoTarefa(t.avanco) === situacao) &&
        (grupo === "todos" || grupoTarefa(t.cod) === grupo) &&
        (!q || t.cod.toLowerCase().includes(q) || t.descricao.toLowerCase().includes(q) || t.desenho.toLowerCase().includes(q)),
    );
    const sinal = ordem.direcao === "ascending" ? 1 : -1;
    if (ordem.coluna === "codigo") l.sort((a, b) => sinal * compararCodigo(a.cod, b.cod));
    else {
      const v = VALOR[ordem.coluna];
      l.sort((a, b) => sinal * (v(a) - v(b)) || compararCodigo(a.cod, b.cod));
    }
    return l;
  }, [tarefas, busca, situacao, grupo, ordem]);

  const ordenar = (coluna: Coluna) =>
    setOrdem((o) =>
      o.coluna === coluna ? { coluna, direcao: o.direcao === "ascending" ? "descending" : "ascending" } : { coluna, direcao: DIRECAO_INICIAL[coluna] },
    );
  const botaoOrdena = (coluna: Coluna, rotulo: string) => (
    <button className="ordena" type="button" aria-sort={ordem.coluna === coluna ? ordem.direcao : undefined} onClick={() => ordenar(coluna)}>
      {rotulo}
    </button>
  );
  const limpar = () => {
    setBusca("");
    setGrupo("todos");
    setSituacao("todas");
  };

  return (
    <section className="lista-sec" aria-labelledby="t-tarefas" ref={secao}>
      <div className="fixo" ref={fixo}>
        <div className="section-h">
          <h2 id="t-tarefas">Códigos de tarefa</h2>
          <p>Clique num código para abrir as tarefas filhas, as estruturas e os componentes.</p>
        </div>
        <div className="filtros">
          <label className="sr" htmlFor="busca">
            Buscar código de tarefa
          </label>
          <input
            id="busca"
            className="campo busca"
            type="search"
            placeholder="Buscar por código, descrição ou desenho"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <label className="sr" htmlFor="grupo">
            Grupo
          </label>
          <select id="grupo" className="campo" value={grupo} onChange={(e) => setGrupo(e.target.value)}>
            <option value="todos">Todos os grupos</option>
            {grupos.map((g) => (
              <option key={g} value={g}>
                Grupo {g}
              </option>
            ))}
          </select>
          <div className="chips" role="group" aria-label="Situação">
            {(["todas", ...SITUACOES] as const).map((s) => (
              <button key={s} type="button" className="chip-btn" aria-pressed={situacao === s} onClick={() => setSituacao(s)}>
                {s === "todas" ? "Todas" : ROTULO_SITUACAO[s]} <span className="n">{num(contagem[s] ?? 0)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card lista-card">
        <div className="lista-cab">
          {botaoOrdena("codigo", "Código de tarefa")}
          <span>Situação</span>
          {comFabric ? (
            <span className="cab-duplo">
              {botaoOrdena("avanco", "Avanço do saldo")}
              <span aria-hidden="true">·</span>
              {botaoOrdena("atraso", "Atraso")}
            </span>
          ) : (
            botaoOrdena("avanco", "Avanço do saldo")
          )}
          {botaoOrdena("execPend", "Execuções")}
          {botaoOrdena("opsComSaldo", "OPs com saldo")}
          {botaoOrdena("pendMaterial", "Pendentes de baixa")}
          <span />
        </div>
        {visiveis.length === 0 ? (
          <div className="vazio">
            <b>Nenhum código de tarefa com esses filtros</b>
            <span>Mude a busca, o grupo ou a situação.</span>
            <button className="btn sec" type="button" onClick={limpar}>
              Limpar filtros
            </button>
          </div>
        ) : (
          <ul className="lista">
            {visiveis.map((t) => (
              <li key={t.cod}>
                <Link className="linha" href={`/tarefa/${encodeURIComponent(t.cod)}`}>
                  <span className="t-cod">
                    <b>{t.cod}</b>
                    <span>{t.descricao}</span>
                    <span className="mono">{t.desenho}</span>
                  </span>
                  <span>
                    <EtiquetaSituacao avanco={t.avanco} />
                  </span>
                  <Avanco valor={t.avanco} fabric={t.fabric} rotulo={`${num(t.realizado, 1)} de ${num(t.previsto, 1)}`} />
                  <span className="num-l">
                    <b>{num(t.execucoes)}</b>
                    <small>{num(t.execPend, 1)} pendentes</small>
                  </span>
                  <span className="num-l">
                    <b>{num(t.opsComSaldo)}</b>
                    <small>de {num(t.opsTotal)} OPs</small>
                  </span>
                  <span className="num-l">
                    <b>{num(t.pendMaterial)}</b>
                    <small>de {num(t.totalComp)} componentes</small>
                  </span>
                  <span className="seta" aria-hidden="true">
                    ›
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="nota" aria-live="polite">
        Mostrando {num(visiveis.length)} de {num(tarefas.length)} códigos de tarefa.
      </p>
      {children}
    </section>
  );
}
