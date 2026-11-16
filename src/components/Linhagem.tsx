"use client";

import { clsx } from "clsx";
import { ChevronDown, ChevronRight, ChevronUp, SearchX } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { BOTAO_FERRAMENTA } from "./Acoes";
import { Avanco, EtiquetaSituacao } from "./Etiquetas";
import { EstadoVazio } from "./layout/EstadoVazio";
import { buttonVariants } from "./ui/Button";
import { CLASSE_CAMPO } from "./ui/Campo";
import { Segmentado } from "./ui/Segmentado";
import { num, pct } from "@/lib/formato";
import { ROTULO_SITUACAO, caminhosDaLinhagem, origemDesce, situacaoTarefa, type SituacaoTarefa, type TipoOrigem } from "@/lib/regras";

export interface FilhaLinhagem {
  tarFilho: string;
  tipo: TipoOrigem;
  titulo: string;
  previsto: number;
  realizado: number;
  componentes: number;
  pendentes: number;
}

export interface CodigoLinhagem {
  fabric: number | null; // % AVANÇO FABRIC
  cod: string;
  descricao: string;
  avanco: number;
  previsto: number;
  realizado: number;
}

export interface DesenhoLinhagem {
  desenho: string;
  codigos: CodigoLinhagem[];
}

type FiltroSituacao = SituacaoTarefa | "todas";
const SITUACOES: SituacaoTarefa[] = ["sem-avanco", "andamento", "concluida"];
const SEP = ">";

/** Rótulo micro-caps (régua do Visto). */
const ROTULO = "text-[11px] font-bold uppercase tracking-[0.08em] text-txt-2";
/** Os fios da árvore: a cor da borda média do Visto, 2px. */
const FIO = "before:absolute before:bg-border-med after:absolute after:bg-border-med";

interface Props {
  desenhos: DesenhoLinhagem[];
  /** Tarefas filhas de cada código (inclui RETRABALHO), as mesmas de "De onde vem o saldo". */
  filhasPorCodigo: Record<string, FilhaLinhagem[]>;
  /** Avanço próprio de cada código de tarefa, para mostrar ao lado quando ele aparece como filha. */
  avancoPorCodigo: Record<string, { avanco: number; previsto: number; realizado: number; fabric: number | null }>;
  total: number;
  abrir?: string[]; // códigos que já começam com as tarefas filhas abertas (?abrir=1.18)
  children?: ReactNode;
}

/** Botão "N filhas": abre e fecha um nível. Aberto, fica escuro (o mesmo gesto do alternador ligado). */
function BotaoFilhas({ aberto, n, rotulo, controla, aoClicar }: { aberto: boolean; n: number; rotulo: string; controla: string; aoClicar: () => void }) {
  const Icone = aberto ? ChevronUp : ChevronDown;
  return (
    <button
      type="button"
      aria-expanded={aberto}
      aria-controls={controla}
      aria-label={rotulo}
      title="Tarefas filhas"
      onClick={aoClicar}
      className={clsx(
        "inline-flex min-h-11 min-w-11 items-center justify-center gap-1 whitespace-nowrap rounded-btn border px-3 text-sm font-semibold transition-colors",
        aberto ? "border-txt bg-txt text-bg" : "border-med bg-bg text-txt hover:border-txt-muted",
      )}
    >
      <span className="font-mono">{num(n)}</span> {n === 1 ? "filha" : "filhas"}
      <Icone size={15} aria-hidden="true" />
    </button>
  );
}

/** Linhagem: projeto › desenho › código de tarefa › tarefas filhas, descendo código dentro de código. */
export function Linhagem({ desenhos, filhasPorCodigo, avancoPorCodigo, total, abrir = [], children }: Props) {
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState<FiltroSituacao>("todas");
  const [abertos, setAbertos] = useState<Set<string>>(() => new Set(abrir));
  const filhas = (cod: string) => filhasPorCodigo[cod] ?? [];

  const contagem = useMemo(() => {
    const c: Record<string, number> = { todas: 0 };
    for (const d of desenhos)
      for (const t of d.codigos) {
        c.todas += 1;
        c[situacaoTarefa(t.avanco)] = (c[situacaoTarefa(t.avanco)] ?? 0) + 1;
      }
    return c;
  }, [desenhos]);

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return desenhos
      .map((d) => {
        const desenhoBate = q !== "" && d.desenho.toLowerCase().includes(q);
        const codigos = d.codigos.filter(
          (t) =>
            (situacao === "todas" || situacaoTarefa(t.avanco) === situacao) &&
            (!q || desenhoBate || t.cod.toLowerCase().includes(q) || t.descricao.toLowerCase().includes(q)),
        );
        return { ...d, codigos };
      })
      .filter((d) => d.codigos.length > 0); // desenho sem nenhum código visível some
  }, [desenhos, busca, situacao]);

  const mostrando = visiveis.reduce((s, d) => s + d.codigos.length, 0);
  const alternar = (chave: string) =>
    setAbertos((a) => {
      const n = new Set(a);
      if (n.has(chave)) {
        // fechar um nível fecha também o que estava aberto abaixo dele
        for (const k of [...n]) if (k === chave || k.startsWith(chave + SEP)) n.delete(k);
      } else n.add(chave);
      return n;
    });
  const abrirTudo = (cod: string) => setAbertos((a) => new Set([...a, cod, ...caminhosDaLinhagem(cod, filhas)]));
  const recolherTudo = (cod: string) => setAbertos((a) => new Set([...a].filter((k) => k !== cod && !k.startsWith(cod + SEP))));

  /** Lista de tarefas filhas de `caminho` (o último código do caminho), com os níveis abaixo. */
  const renderFilhas = (caminho: string[]): ReactNode => {
    const pai = caminho[caminho.length - 1];
    const lista = filhas(pai);
    const raiz = caminho[0];
    const temNiveis = caminho.length === 1 && caminhosDaLinhagem(raiz, filhas, 2).length > 0;
    return (
      <ul className="col-span-2 ml-6 mt-2 flex flex-col gap-1.5 border-l-2 border-border-med py-1" id={`filhas-${caminho.join(SEP)}`}>
        {temNiveis && (
          <li className="flex flex-wrap gap-2 pl-5">
            <button className={BOTAO_FERRAMENTA} type="button" onClick={() => abrirTudo(raiz)}>
              Abrir a linhagem completa
            </button>
            <button className={BOTAO_FERRAMENTA} type="button" onClick={() => recolherTudo(raiz)}>
              Recolher
            </button>
          </li>
        )}
        {lista.map((f) => {
          const chave = [...caminho, f.tarFilho].join(SEP);
          const desce = origemDesce(f.tipo) && !caminho.includes(f.tarFilho) && filhas(f.tarFilho).length > 0;
          const aberto = desce && abertos.has(chave);
          const proprio = f.tipo === "outra" ? avancoPorCodigo[f.tarFilho] : undefined;
          const nFilhas = filhas(f.tarFilho).length;
          return (
            <li key={chave} className={clsx("relative pl-5", FIO, "before:left-0 before:top-[26px] before:h-0.5 before:w-5 after:hidden")}>
              <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 rounded-btn border border-subtle bg-bg px-3.5 py-2">
                <span className="flex min-w-0 flex-[1_1_200px] flex-col leading-tight">
                  <span className={ROTULO}>{caminho.length === 1 ? "Tarefa filha" : `${caminho.join(" › ")} ›`}</span>
                  {origemDesce(f.tipo) ? (
                    <Link
                      className="font-bold text-txt underline underline-offset-[3px] hover:text-delp-red"
                      href={`/tarefa/${encodeURIComponent(f.tarFilho)}`}
                    >
                      {f.titulo}
                    </Link>
                  ) : (
                    <b className="font-bold text-txt">{f.titulo}</b>
                  )}
                </span>
                <span className="flex-[0_0_150px]">
                  <Avanco
                    valor={f.previsto > 0 ? f.realizado / f.previsto : 0}
                    rotulo={`${num(f.realizado, 1)} de ${num(f.previsto, 1)} em ${pai === "RETRABALHO" ? "Retrabalho" : pai}`}
                  />
                </span>
                <span className="flex-[1_1_240px] text-sm text-txt">
                  <span className="font-mono">{num(f.componentes)}</span> componentes · <span className="font-mono">{num(f.pendentes)}</span>{" "}
                  pendentes de baixa
                  {proprio && (
                    <span className="block text-[13px] text-txt">
                      Código {f.tarFilho}: <b className="font-mono">{pct(proprio.avanco)}</b> do saldo ({num(proprio.realizado, 1)} de{" "}
                      {num(proprio.previsto, 1)})
                      {proprio.fabric !== null && (
                        <>
                          {" "}
                          × fabricação <b className="font-mono">{pct(proprio.fabric)}</b>
                        </>
                      )}
                    </span>
                  )}
                </span>
                {desce && (
                  <span className="ml-auto">
                    <BotaoFilhas
                      aberto={aberto}
                      n={nFilhas}
                      controla={`filhas-${chave}`}
                      rotulo={`${aberto ? "Fechar" : "Abrir"} as ${nFilhas} tarefas filhas de ${f.tarFilho}`}
                      aoClicar={() => alternar(chave)}
                    />
                  </span>
                )}
              </div>
              {aberto && renderFilhas([...caminho, f.tarFilho])}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <>
      {/* Busca e situação paradas ao rolar, abaixo do topo de 64px (como o .fixo de antes). */}
      <div className="sticky top-16 z-10 -mx-4 flex flex-wrap items-center gap-2.5 border-b border-subtle bg-bg-2 px-4 py-2.5 md:-mx-6 md:px-6 print:hidden">
        <label className="sr-only" htmlFor="busca-lin">
          Buscar na linhagem
        </label>
        <input
          id="busca-lin"
          className={clsx(CLASSE_CAMPO, "min-w-0 flex-[1_1_260px] sm:w-auto")}
          type="search"
          placeholder="Buscar por código, descrição ou desenho"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
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

      <section aria-label="Linhagem" className="flex flex-col gap-3">
        {children}
        {visiveis.length === 0 ? (
          <div className="rounded-card border border-subtle bg-bg shadow-subtle">
            <EstadoVazio
              icone={SearchX}
              titulo="Nenhum código de tarefa com esses filtros"
              descricao="Mude a busca ou a situação."
              acao={
                <button
                  className={buttonVariants.ghost}
                  type="button"
                  onClick={() => {
                    setBusca("");
                    setSituacao("todas");
                  }}
                >
                  Limpar filtros
                </button>
              }
            />
          </div>
        ) : (
          <div className="ml-[22px] flex flex-col gap-3.5 pt-3.5">
            {visiveis.map((d) => (
              <div
                key={d.desenho}
                className={clsx(
                  "relative grid grid-cols-1 items-center gap-6 pl-6 duascol:grid-cols-[minmax(0,230px)_minmax(0,1fr)]",
                  FIO,
                  "before:-top-3.5 before:bottom-0 before:left-0 before:w-0.5 last:before:bottom-1/2",
                  "after:left-0 after:top-[calc(50%-1px)] after:h-0.5 after:w-6",
                )}
              >
                <div className="relative flex flex-col rounded-card border border-med bg-bg-2 px-3.5 py-2.5 leading-tight duascol:after:absolute duascol:after:left-full duascol:after:top-[calc(50%-1px)] duascol:after:h-0.5 duascol:after:w-6 duascol:after:bg-border-med">
                  <span className={ROTULO}>Desenho</span>
                  <b className="font-mono font-bold text-txt">{d.desenho}</b>
                  <small className="text-sm text-txt-2">
                    {num(d.codigos.length)} {d.codigos.length === 1 ? "código de tarefa" : "códigos de tarefa"}
                  </small>
                </div>
                <ul className="flex flex-col gap-2 border-l-2 border-border-med py-1">
                  {d.codigos.map((t) => {
                    const aberto = abertos.has(t.cod);
                    const n = filhas(t.cod).length;
                    return (
                      <li
                        key={t.cod}
                        className={clsx(
                          "relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 pl-5",
                          FIO,
                          "before:left-0 before:top-[33px] before:h-0.5 before:w-5 after:hidden",
                        )}
                      >
                        <Link
                          href={`/tarefa/${encodeURIComponent(t.cod)}`}
                          className="group grid min-h-16 grid-cols-[minmax(0,1fr)_auto_12px] items-center gap-x-3 gap-y-1.5 rounded-card border border-subtle bg-bg px-3.5 py-2.5 text-txt shadow-subtle transition-colors hover:border-txt-muted duascol:grid-cols-[minmax(0,1fr)_auto_132px_12px]"
                        >
                          <span className="grid min-w-0 grid-cols-[46px_minmax(0,1fr)] items-baseline gap-x-2 leading-tight">
                            <b className="font-mono font-bold">{t.cod}</b>
                            <span className="break-words font-semibold">{t.descricao}</span>
                          </span>
                          <EtiquetaSituacao avanco={t.avanco} />
                          <span className="col-span-full row-start-2 duascol:col-span-1 duascol:row-start-auto">
                            <Avanco valor={t.avanco} fabric={t.fabric} rotulo={`${num(t.realizado, 1)} de ${num(t.previsto, 1)}`} />
                          </span>
                          <ChevronRight size={14} aria-hidden="true" className="text-border-med group-hover:text-delp-red" />
                        </Link>
                        {n > 0 ? (
                          <BotaoFilhas
                            aberto={aberto}
                            n={n}
                            controla={`filhas-${t.cod}`}
                            rotulo={`${aberto ? "Fechar" : "Abrir"} as ${n} tarefas filhas de ${t.cod}`}
                            aoClicar={() => alternar(t.cod)}
                          />
                        ) : (
                          <span className="min-w-11" />
                        )}
                        {aberto && renderFilhas([t.cod])}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
        <p className="text-sm text-txt-2" aria-live="polite">
          Mostrando <span className="font-mono">{num(mostrando)}</span> de <span className="font-mono">{num(total)}</span> códigos de tarefa. A
          linhagem agrupa os códigos pelo desenho; as tarefas filhas de cada código são as mesmas de “De onde vem o saldo”. Quando a filha é outro
          código, abra as filhas dela para descer a linhagem.
        </p>
      </section>
    </>
  );
}
