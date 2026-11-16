"use client";

import { clsx } from "clsx";
import { ChevronRight, SearchX } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Avanco, EtiquetaSituacao } from "./Etiquetas";
import { EstadoVazio } from "./layout/EstadoVazio";
import { buttonVariants } from "./ui/Button";
import { CLASSE_CAMPO } from "./ui/Campo";
import { Segmentado } from "./ui/Segmentado";
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
type FiltroSituacao = SituacaoTarefa | "todas";
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

/** As colunas da lista a partir de `duascol:`; abaixo, cada linha vira um cartão de três colunas. */
const GRADE = "duascol:grid-cols-[minmax(0,1.5fr)_128px_minmax(0,1fr)_92px_92px_128px_14px]";
/** Cabeçalho de coluna na régua do Visto: cinza, nunca vermelho. */
const CABECALHO = "text-[11px] font-semibold uppercase tracking-[0.1em] text-txt-muted";

export function ListaTarefas({ tarefas, nota }: { tarefas: TarefaResumo[]; nota?: ReactNode }) {
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState<FiltroSituacao>("todas");
  const [grupo, setGrupo] = useState("todos");
  const [ordem, setOrdem] = useState<{ coluna: Coluna; direcao: Direcao }>({ coluna: "codigo", direcao: "ascending" });
  const secao = useRef<HTMLElement>(null);
  const fixo = useRef<HTMLDivElement>(null);

  // O cabeçalho da lista para logo abaixo da faixa de filtros, que para logo abaixo do topo (4rem).
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
  const botaoOrdena = (coluna: Coluna, rotulo: string) => {
    const ativa = ordem.coluna === coluna;
    return (
      // A lista é um <ul>, não uma tabela: o aria-sort não vale aqui, então a ordem vai escrita para o leitor de tela.
      <button
        type="button"
        onClick={() => ordenar(coluna)}
        className={clsx("min-h-11 text-left transition-colors hover:text-txt", CABECALHO, ativa && "!text-txt")}
      >
        {rotulo}
        {ativa && <span aria-hidden="true">{ordem.direcao === "ascending" ? " ↑" : " ↓"}</span>}
        <span className="sr-only">
          {ativa ? (ordem.direcao === "ascending" ? ", em ordem crescente" : ", em ordem decrescente") : ", ordenar"}
        </span>
      </button>
    );
  };
  const limpar = () => {
    setBusca("");
    setGrupo("todos");
    setSituacao("todas");
  };

  return (
    <section
      aria-labelledby="t-tarefas"
      ref={secao}
      className="rounded-card border border-subtle bg-bg shadow-subtle"
    >
      {/* Faixa parada ao rolar (pedido de 15/11): título, busca e filtros, abaixo do topo de 64px. */}
      <div ref={fixo} className="sticky top-16 z-10 flex flex-col gap-3 rounded-t-card border-b border-subtle bg-bg p-4 print:static">
        <div>
          <h2 id="t-tarefas" className="text-[15px] font-semibold leading-tight text-txt">
            Códigos de tarefa
          </h2>
          <p className="mt-1 max-w-[70ch] text-xs leading-snug text-txt-2">
            Clique num código para abrir as tarefas filhas, as estruturas e os componentes.
            {nota && <> {nota}</>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 print:hidden">
          <label className="sr-only" htmlFor="busca">
            Buscar código de tarefa
          </label>
          <input
            id="busca"
            className={clsx(CLASSE_CAMPO, "min-w-0 flex-[1_1_260px] sm:w-auto")}
            type="search"
            placeholder="Buscar por código, descrição ou desenho"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <label className="sr-only" htmlFor="grupo">
            Grupo
          </label>
          <select id="grupo" className={clsx(CLASSE_CAMPO, "!w-auto")} value={grupo} onChange={(e) => setGrupo(e.target.value)}>
            <option value="todos">Todos os grupos</option>
            {grupos.map((g) => (
              <option key={g} value={g}>
                Grupo {g}
              </option>
            ))}
          </select>
          <div className="max-w-full overflow-x-auto">
            <Segmentado<FiltroSituacao>
              ariaLabel="Situação"
              valor={situacao}
              aoTrocar={setSituacao}
              opcoes={(["todas", ...SITUACOES] as const).map((s) => ({
                id: s,
                rotulo: `${s === "todas" ? "Todas" : ROTULO_SITUACAO[s]} ${num(contagem[s] ?? 0)}`,
              }))}
            />
          </div>
        </div>
      </div>

      {/* Cabeçalho de coluna: para logo abaixo da faixa (a altura dela é medida em --fixo-h). */}
      <div
        className={clsx(
          "sticky z-[5] hidden items-center gap-3 border-b border-med bg-bg px-4 duascol:grid print:static",
          GRADE,
        )}
        style={{ top: "calc(4rem + var(--fixo-h, 0px))" }}
      >
        {botaoOrdena("codigo", "Código de tarefa")}
        <span className={CABECALHO}>Situação</span>
        {comFabric ? (
          <span className={clsx("flex items-center gap-1.5", CABECALHO)}>
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
        <EstadoVazio
          icone={SearchX}
          titulo="Nenhum código de tarefa com esses filtros"
          descricao="Mude a busca, o grupo ou a situação."
          acao={
            <button className={buttonVariants.ghost} type="button" onClick={limpar}>
              Limpar filtros
            </button>
          }
        />
      ) : (
        <ul className="flex flex-col">
          {visiveis.map((t, i) => (
            <li key={t.cod} className={clsx(i > 0 && "border-t border-subtle")}>
              <Link
                href={`/tarefa/${encodeURIComponent(t.cod)}`}
                className={clsx(
                  "group grid min-h-11 grid-cols-3 items-center gap-x-3.5 gap-y-2 px-4 py-2.5 text-txt transition-colors hover:bg-bg-2",
                  GRADE,
                )}
              >
                <span className="col-span-2 flex min-w-0 flex-col leading-tight duascol:col-span-1">
                  <b className="font-mono text-[15px] font-bold">{t.cod}</b>
                  <span className="break-words text-sm font-semibold">{t.descricao}</span>
                  <span className="font-mono text-xs text-txt-2">{t.desenho}</span>
                </span>
                <span>
                  <EtiquetaSituacao avanco={t.avanco} />
                </span>
                <span className="col-span-3 duascol:col-span-1">
                  <Avanco valor={t.avanco} fabric={t.fabric} rotulo={`${num(t.realizado, 1)} de ${num(t.previsto, 1)}`} />
                </span>
                <Numero valor={num(t.execucoes)} apoio={`${num(t.execPend, 1)} pendentes`} rotulo="Execuções" />
                <Numero valor={num(t.opsComSaldo)} apoio={`de ${num(t.opsTotal)} OPs`} rotulo="OPs com saldo" />
                <Numero valor={num(t.pendMaterial)} apoio={`de ${num(t.totalComp)} componentes`} rotulo="Pendentes de baixa" />
                <ChevronRight
                  size={16}
                  aria-hidden="true"
                  className="hidden text-border-med transition-colors group-hover:text-delp-red duascol:block"
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
      <p className="border-t border-subtle px-4 py-2.5 text-xs text-txt-2" aria-live="polite">
        Mostrando <span className="font-mono">{num(visiveis.length)}</span> de <span className="font-mono">{num(tarefas.length)}</span>{" "}
        códigos de tarefa.
      </p>
    </section>
  );
}

/** Um número da linha; abaixo de `duascol:` (sem cabeçalho de coluna) ele leva o rótulo escrito. */
function Numero({ valor, apoio, rotulo }: { valor: string; apoio: string; rotulo: string }) {
  return (
    <span className="flex flex-col leading-tight">
      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-txt-2 duascol:hidden">{rotulo}</span>
      <b className="font-mono text-[15px] font-bold">{valor}</b>
      <small className="text-xs text-txt-2">{apoio}</small>
    </span>
  );
}
