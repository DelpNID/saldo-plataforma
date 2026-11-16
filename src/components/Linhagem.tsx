"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { Avanco, EtiquetaSituacao } from "./Etiquetas";
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

const SITUACOES: SituacaoTarefa[] = ["sem-avanco", "andamento", "concluida"];
const SEP = ">";

interface Props {
  desenhos: DesenhoLinhagem[];
  /** Tarefas filhas de cada código (inclui RETRABALHO), as mesmas de "De onde vem o saldo". */
  filhasPorCodigo: Record<string, FilhaLinhagem[]>;
  /** Avanço próprio de cada código de tarefa, para mostrar ao lado quando ele aparece como filha. */
  avancoPorCodigo: Record<string, { avanco: number; previsto: number; realizado: number }>;
  total: number;
  abrir?: string[]; // códigos que já começam com as tarefas filhas abertas (?abrir=1.18)
  children?: ReactNode;
}

/** Linhagem: projeto › desenho › código de tarefa › tarefas filhas, descendo código dentro de código. */
export function Linhagem({ desenhos, filhasPorCodigo, avancoPorCodigo, total, abrir = [], children }: Props) {
  const [busca, setBusca] = useState("");
  const [situacao, setSituacao] = useState<SituacaoTarefa | "todas">("todas");
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
      <ul className="lin-filhas" id={`filhas-${caminho.join(SEP)}`}>
        {temNiveis && (
          <li className="lin-acoes">
            <button className="btn sec" type="button" onClick={() => abrirTudo(raiz)}>
              Abrir a linhagem completa
            </button>
            <button className="btn sec" type="button" onClick={() => recolherTudo(raiz)}>
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
            <li key={chave}>
              <div className="lin-filha">
                <span>
                  <span className="rotulo">{caminho.length === 1 ? "Tarefa filha" : `${caminho.join(" › ")} ›`}</span>
                  {origemDesce(f.tipo) ? (
                    <Link className="lin-filha-t" href={`/tarefa/${encodeURIComponent(f.tarFilho)}`}>
                      {f.titulo}
                    </Link>
                  ) : (
                    <b>{f.titulo}</b>
                  )}
                </span>
                <Avanco
                  valor={f.previsto > 0 ? f.realizado / f.previsto : 0}
                  rotulo={`${num(f.realizado, 1)} de ${num(f.previsto, 1)} em ${pai === "RETRABALHO" ? "Retrabalho" : pai}`}
                />
                <span className="origem-n">
                  {num(f.componentes)} componentes · {num(f.pendentes)} pendentes de baixa
                  {proprio && (
                    <>
                      <br />
                      <span className="lin-proprio">
                        Código {f.tarFilho}: <b>{pct(proprio.avanco)}</b> do saldo ({num(proprio.realizado, 1)} de {num(proprio.previsto, 1)})
                      </span>
                    </>
                  )}
                </span>
                {desce && (
                  <button
                    className="lin-abrir"
                    type="button"
                    aria-expanded={aberto}
                    aria-controls={`filhas-${chave}`}
                    aria-label={`${aberto ? "Fechar" : "Abrir"} as ${nFilhas} tarefas filhas de ${f.tarFilho}`}
                    onClick={() => alternar(chave)}
                  >
                    {num(nFilhas)} {nFilhas === 1 ? "filha" : "filhas"}
                  </button>
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
      <div className="fixo">
        <div className="filtros">
          <label className="sr" htmlFor="busca-lin">
            Buscar na linhagem
          </label>
          <input
            id="busca-lin"
            className="campo busca"
            type="search"
            placeholder="Buscar por código, descrição ou desenho"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />
          <div className="chips" role="group" aria-label="Situação">
            {(["todas", ...SITUACOES] as const).map((s) => (
              <button key={s} type="button" className="chip-btn" aria-pressed={situacao === s} onClick={() => setSituacao(s)}>
                {s === "todas" ? "Todas" : ROTULO_SITUACAO[s]} <span className="n">{num(contagem[s] ?? 0)}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <section aria-label="Linhagem">
        {children}
        {visiveis.length === 0 ? (
          <div className="card vazio">
            <b>Nenhum código de tarefa com esses filtros</b>
            <span>Mude a busca ou a situação.</span>
            <button
              className="btn sec"
              type="button"
              onClick={() => {
                setBusca("");
                setSituacao("todas");
              }}
            >
              Limpar filtros
            </button>
          </div>
        ) : (
          <div className="linhagem">
            {visiveis.map((d) => (
              <div className="lin-grupo" key={d.desenho}>
                <div className="lin-desenho">
                  <span className="rotulo">Desenho</span>
                  <b className="mono">{d.desenho}</b>
                  <small>
                    {num(d.codigos.length)} {d.codigos.length === 1 ? "código de tarefa" : "códigos de tarefa"}
                  </small>
                </div>
                <ul className="lin-cods">
                  {d.codigos.map((t) => {
                    const aberto = abertos.has(t.cod);
                    const n = filhas(t.cod).length;
                    return (
                      <li key={t.cod}>
                        <Link className="card lin-cod" href={`/tarefa/${encodeURIComponent(t.cod)}`}>
                          <span className="t-cod">
                            <b>{t.cod}</b>
                            <span>{t.descricao}</span>
                          </span>
                          <EtiquetaSituacao avanco={t.avanco} />
                          <Avanco valor={t.avanco} rotulo={`${num(t.realizado, 1)} de ${num(t.previsto, 1)}`} />
                          <span className="seta" aria-hidden="true">
                            ›
                          </span>
                        </Link>
                        {n > 0 ? (
                          <button
                            className="lin-abrir"
                            type="button"
                            aria-expanded={aberto}
                            aria-controls={`filhas-${t.cod}`}
                            aria-label={`${aberto ? "Fechar" : "Abrir"} as ${n} tarefas filhas de ${t.cod}`}
                            title="Tarefas filhas"
                            onClick={() => alternar(t.cod)}
                          >
                            {num(n)} {n === 1 ? "filha" : "filhas"}
                          </button>
                        ) : (
                          <span className="lin-abrir-vazio" />
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
        <p className="nota" aria-live="polite">
          Mostrando {num(mostrando)} de {num(total)} códigos de tarefa. A linhagem agrupa os códigos pelo desenho; as tarefas filhas de cada código são as
          mesmas de “De onde vem o saldo”. Quando a filha é outro código, abra as filhas dela para descer a linhagem.
        </p>
      </section>
    </>
  );
}
