"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Avanco } from "./Etiquetas";
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
  pendMaterial: number;
  totalComp: number;
  opsTotal: number;
  opsComSaldo: number;
}

type Ordem = "codigo" | "avanco" | "pendencias";
const SITUACOES: SituacaoTarefa[] = ["sem-avanco", "andamento", "concluida"];

export function ListaTarefas({ tarefas }: { tarefas: TarefaResumo[] }) {
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState<SituacaoTarefa | "todas">("todas");
  const [grupo, setGrupo] = useState("todos");
  const [ordem, setOrdem] = useState<Ordem>("codigo");

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
    if (ordem === "avanco") l.sort((a, b) => a.avanco - b.avanco || compararCodigo(a.cod, b.cod));
    else if (ordem === "pendencias") l.sort((a, b) => b.pendMaterial - a.pendMaterial || compararCodigo(a.cod, b.cod));
    else l.sort((a, b) => compararCodigo(a.cod, b.cod));
    return l;
  }, [tarefas, busca, situacao, grupo, ordem]);

  return (
    <>
      <div className="filtros">
        <label className="sr" htmlFor="busca">Buscar código de tarefa</label>
        <input id="busca" className="campo busca" type="search" placeholder="Buscar por código, descrição ou desenho" value={busca} onChange={(e) => setBusca(e.target.value)} />
        <label className="sr" htmlFor="grupo">Grupo</label>
        <select id="grupo" className="campo" value={grupo} onChange={(e) => setGrupo(e.target.value)}>
          <option value="todos">Todos os grupos</option>
          {grupos.map((g) => (
            <option key={g} value={g}>Grupo {g}</option>
          ))}
        </select>
        <label className="sr" htmlFor="ordem">Ordenar</label>
        <select id="ordem" className="campo" value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)}>
          <option value="codigo">Ordem: código</option>
          <option value="avanco">Ordem: menor avanço</option>
          <option value="pendencias">Ordem: mais pendências</option>
        </select>
      </div>
      <div className="chips" role="group" aria-label="Situação">
        {(["todas", ...SITUACOES] as const).map((s) => (
          <button key={s} type="button" className="chip-btn" aria-pressed={situacao === s} onClick={() => setSituacao(s)}>
            {s === "todas" ? "Todas" : ROTULO_SITUACAO[s]} <span className="n">{contagem[s] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="card">
        <div className="lista-cab" aria-hidden="true">
          <span>Código de tarefa</span>
          <span>Avanço do saldo</span>
          <span>Execuções</span>
          <span>OPs com saldo</span>
          <span>Pendentes de baixa</span>
          <span />
        </div>
        {visiveis.length === 0 ? (
          <p className="vazio">Nenhum código de tarefa com esse filtro.</p>
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
                  <Avanco valor={t.avanco} rotulo={`${num(t.realizado, 1)} de ${num(t.previsto, 1)}`} />
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
                  <span className="seta" aria-hidden="true">›</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="nota">Mostrando {num(visiveis.length)} de {num(tarefas.length)} códigos de tarefa.</p>
    </>
  );
}
