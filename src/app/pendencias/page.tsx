import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { Copiar, Exportar, Imprimir, type Celula } from "@/components/Acoes";
import { CLASSE_CORTE } from "@/components/Arvore";
import { FiltrosPendencias, type ValoresFiltro } from "@/components/FiltrosPendencias";
import { Rodape, Topo } from "@/components/Topo";
import { cargaAtiva, prisma } from "@/lib/db";
import { num } from "@/lib/formato";
import { ROTULO_CORTE, compararCodigo, planosDaColuna, statusCorte, type StatusCorte } from "@/lib/regras";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pendências de baixa" };

const POR_PAGINA = 100;

interface Props {
  searchParams: { tarefa?: string; grupo?: string; q?: string; pagina?: string; plano?: string; ordem?: string };
}

// A coluna guarda um ou mais planos separados por vírgula ("CNC0007581,PA10.081")
const temPlano = (prefixo: string): Prisma.ComponenteWhereInput => ({
  OR: [{ cnc: { startsWith: prefixo } }, { cnc: { contains: `,${prefixo}` } }],
});
const FILTRO_PLANO: Record<string, { rotulo: string; where: Prisma.ComponenteWhereInput }> = {
  cnc: { rotulo: "Com CNC", where: temPlano("CNC") },
  pa: { rotulo: "Com PA/PC", where: temPlano("PA") },
  sem: { rotulo: "Sem plano de corte", where: { cnc: null } },
};

// Ordem dentro de cada grupo (código de tarefa › execução). Sem "ordem": a mesma de sempre.
const ORDENS: Record<string, Prisma.ComponenteOrderByWithRelationInput[]> = {
  "op-asc": [{ codOrdem: "asc" }, { idAtvOrdem: "asc" }],
  "op-desc": [{ codOrdem: "desc" }, { idAtvOrdem: "asc" }],
  "usado-desc": [{ qtdUsada: "desc" }, { codOrdem: "asc" }],
  "usado-asc": [{ qtdUsada: "asc" }, { codOrdem: "asc" }],
};

type Params = Props["searchParams"];
function link(base: Params, muda: Partial<Params>): string {
  const p = new URLSearchParams();
  for (const [k, val] of Object.entries({ ...base, ...muda })) if (val) p.set(k, val);
  const s = p.toString();
  return s ? `/pendencias?${s}` : "/pendencias";
}

/** Números de página: 1, os vizinhos da atual e a última, com "…" entre os saltos. */
function numerosPagina(atual: number, total: number): (number | "…")[] {
  const set = new Set([1, total, atual - 1, atual, atual + 1, ...(atual <= 3 ? [2, 3] : [])].filter((n) => n >= 1 && n <= total));
  const ord = [...set].sort((a, b) => a - b);
  const out: (number | "…")[] = [];
  ord.forEach((n, i) => {
    if (i > 0 && n - ord[i - 1] > 1) out.push("…");
    out.push(n);
  });
  return out;
}

export default async function Pendencias({ searchParams }: Props) {
  const carga = await cargaAtiva();
  if (!carga) {
    return (
      <>
        <Topo ativo="pendencias" />
        <main className="in">
          <div className="card vazio">
            <b>Nenhuma planilha carregada ainda</b>
            <Link className="btn sec" href="/importar">
              Ir para Atualizar
            </Link>
          </div>
        </main>
      </>
    );
  }

  const tarefa = searchParams.tarefa?.slice(0, 40) || undefined;
  const grupo = searchParams.grupo?.slice(0, 20) || undefined;
  const q = searchParams.q?.trim().slice(0, 80) || undefined;
  const pagina = Math.max(1, Math.trunc(Number(searchParams.pagina)) || 1);
  const plano = searchParams.plano && FILTRO_PLANO[searchParams.plano] ? searchParams.plano : undefined;
  const ordem = searchParams.ordem && ORDENS[searchParams.ordem] ? searchParams.ordem : undefined;
  const params: Params = { tarefa, grupo, q, plano, ordem };

  const base: Prisma.ComponenteWhereInput = { cargaId: carga.id, apontado: { lte: 0 } };
  const where: Prisma.ComponenteWhereInput = {
    ...base,
    ...(tarefa ? { tarPai: tarefa } : {}),
    ...(grupo ? { grupo } : {}),
    AND: [
      ...(plano ? [FILTRO_PLANO[plano].where] : []),
      ...(q
        ? [
            {
              OR: [
                { codigoPrd: { contains: q, mode: "insensitive" } },
                { nome: { contains: q, mode: "insensitive" } },
                { codOrdem: { contains: q } },
                { codEstrutura: { contains: q } },
                { cnc: { contains: q.toUpperCase() } },
              ],
            } satisfies Prisma.ComponenteWhereInput,
          ]
        : []),
    ],
  };

  const [total, linhas, porTarefa, porGrupo] = await Promise.all([
    prisma.componente.count({ where }),
    prisma.componente.findMany({
      where,
      orderBy: [{ tarPai: "asc" }, { exec: "asc" }, ...(ordem ? ORDENS[ordem] : [{ codOrdem: "asc" as const }, { idAtvOrdem: "asc" as const }])],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    prisma.componente.groupBy({ by: ["tarPai"], where: base, _count: { _all: true } }),
    prisma.componente.groupBy({ by: ["grupo"], where: { ...base, ...(tarefa ? { tarPai: tarefa } : {}) }, _count: { _all: true } }),
  ]);
  const tarefas = porTarefa.sort((a, b) => compararCodigo(a.tarPai, b.tarPai));
  const grupos = porGrupo.sort((a, b) => b._count._all - a._count._all);
  const totalPendentes = porTarefa.reduce((s, t) => s + t._count._all, 0);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));
  const filtrado = Boolean(tarefa || grupo || q || plano);

  // Quantos componentes cada grupo (código › execução) tem no recorte inteiro, não só nesta página
  const tarPaisPagina = [...new Set(linhas.map((c) => c.tarPai))];
  const porGrupoExec = tarPaisPagina.length
    ? await prisma.componente.groupBy({ by: ["tarPai", "exec"], where: { AND: [where, { tarPai: { in: tarPaisPagina } }] }, _count: { _all: true } })
    : [];
  const totalGrupo = new Map(porGrupoExec.map((g) => [`${g.tarPai}|${g.exec}`, g._count._all]));

  // Corte de cada linha da página (OP + plano na aba CNC_PCQ)
  const planosPagina = [...new Set(linhas.flatMap((c) => planosDaColuna(c.cnc)))];
  const linhasPlano = planosPagina.length
    ? await prisma.planoCorte.findMany({
        where: { cargaId: carga.id, plano: { in: planosPagina }, op: { in: [...new Set(linhas.map((c) => c.codOrdem))] } },
        select: { plano: true, op: true, qtdPrev: true, qtdApont: true },
      })
    : [];
  const corte = new Map(linhasPlano.map((l) => [`${l.op}|${l.plano}`, statusCorte(l.qtdPrev, l.qtdApont)]));
  const cortesDa = (op: string, cnc: string | null) => planosDaColuna(cnc).map((p) => ({ plano: p, st: corte.get(`${op}|${p}`) as StatusCorte | undefined }));

  // Linhas da página agrupadas por código de tarefa e execução, na ordem atual
  const blocos: { tarPai: string; exec: string; linhas: typeof linhas }[] = [];
  for (const c of linhas) {
    const ultimo = blocos[blocos.length - 1];
    if (ultimo && ultimo.tarPai === c.tarPai && ultimo.exec === c.exec) ultimo.linhas.push(c);
    else blocos.push({ tarPai: c.tarPai, exec: c.exec, linhas: [c] });
  }

  const ativos: { rotulo: string; sem: Partial<Params> }[] = [
    ...(q ? [{ rotulo: `Busca: ${q}`, sem: { q: undefined } }] : []),
    ...(tarefa ? [{ rotulo: `Código ${tarefa}`, sem: { tarefa: undefined } }] : []),
    ...(grupo ? [{ rotulo: `Grupo ${grupo}`, sem: { grupo: undefined } }] : []),
    ...(plano ? [{ rotulo: FILTRO_PLANO[plano].rotulo, sem: { plano: undefined } }] : []),
  ];

  const ordemOp = ordem?.startsWith("op-") ? (ordem === "op-asc" ? "ascending" : "descending") : undefined;
  const ordemUsado = ordem?.startsWith("usado-") ? (ordem === "usado-asc" ? "ascending" : "descending") : undefined;

  const exportar: Celula[][] = linhas.map((c) => [
    c.tarPai,
    c.exec,
    c.codOrdem,
    c.codEstrutura,
    c.codigoPrd,
    c.nome,
    c.grupo,
    cortesDa(c.codOrdem, c.cnc)
      .map((x) => `${x.plano} ${x.st ? ROTULO_CORTE[x.st] : "Fora da aba CNC_PCQ"}`)
      .join(" / "),
    c.qtdUsada,
    c.unidade,
    c.apontado,
    c.situacaoRa ?? "",
  ]);

  const opcoesGrupo = grupos.map((g) => ({ valor: g.grupo, rotulo: `${g.grupo} (${num(g._count._all)})` }));
  if (grupo && !opcoesGrupo.some((o) => o.valor === grupo)) opcoesGrupo.unshift({ valor: grupo, rotulo: `${grupo} (0)` });
  const valores: ValoresFiltro = { q, tarefa, grupo, plano, ordem };

  return (
    <>
      <Topo ativo="pendencias" />
      <main className="in">
        <div className="cab-pagina">
          <span className="kicker">Coluna APONTADO = 0 na aba Componentes</span>
          <div className="titulo">
            <h1>Pendências de baixa</h1>
            <p className="resumo">
              {num(total)} componentes sem apontamento
              {filtrado ? ` · de ${num(totalPendentes)} pendentes de baixa` : ""}
            </p>
          </div>
        </div>

        <div className="fixo">
          <FiltrosPendencias
            key={JSON.stringify(valores)}
            valores={valores}
            tarefas={tarefas.map((t) => ({ valor: t.tarPai, rotulo: `${t.tarPai} (${num(t._count._all)})` }))}
            grupos={opcoesGrupo}
            planos={Object.entries(FILTRO_PLANO).map(([k, f]) => ({ valor: k, rotulo: f.rotulo }))}
          />
          <div className="filtros-ativos">
            {ativos.length > 0 && (
              <>
                <span>Filtros ativos:</span>
                {ativos.map((a) => (
                  <Link key={a.rotulo} className="filtro-ativo" href={link(params, a.sem)} aria-label={`Remover filtro ${a.rotulo}`} scroll={false}>
                    {a.rotulo}
                  </Link>
                ))}
                <Link className="btn sec" href="/pendencias">
                  Limpar
                </Link>
              </>
            )}
            <div className="acoes">
              <Exportar
                nome={`pendencias-pagina-${pagina}`}
                cabecalho={[
                  "Tarefa",
                  "Execução",
                  "OP",
                  "Estrutura",
                  "Componente",
                  "Nome",
                  "Grupo",
                  "Plano de corte",
                  "Usado",
                  "Unidade",
                  "Apontado",
                  "Situação da RA",
                ]}
                linhas={exportar}
              />
              <Imprimir />
            </div>
          </div>
        </div>

        <section aria-labelledby="t-lista">
          <div className="section-h">
            <h2 id="t-lista">Componentes sem apontamento</h2>
            <p>Agrupados por código de tarefa e execução. Toque na OP ou no código para copiar.</p>
          </div>
          {linhas.length === 0 ? (
            <div className="card vazio">
              <b>Nenhum componente com esses filtros</b>
              <span>Mude a busca ou remova um filtro.</span>
              <Link className="btn sec" href="/pendencias">
                Limpar
              </Link>
            </div>
          ) : (
            <div className="card tab-wrap">
              <table>
                <thead>
                  <tr>
                    <th aria-sort={ordemOp}>
                      <Link className="ordena" href={link(params, { ordem: ordem === "op-asc" ? "op-desc" : "op-asc", pagina: undefined })} scroll={false}>
                        OP · estrutura
                      </Link>
                    </th>
                    <th>Componente</th>
                    <th>Plano de corte</th>
                    <th className="n" aria-sort={ordemUsado}>
                      <Link
                        className="ordena"
                        href={link(params, { ordem: ordem === "usado-desc" ? "usado-asc" : "usado-desc", pagina: undefined })}
                        scroll={false}
                      >
                        Usado
                      </Link>
                    </th>
                    <th className="n">Apont.</th>
                  </tr>
                </thead>
                {blocos.map((b) => (
                  <tbody key={`${b.tarPai}|${b.exec}|${b.linhas[0].id}`}>
                    <tr className="grupo-cab">
                      <th colSpan={5} scope="rowgroup">
                        <div>
                          <b>{b.tarPai}</b>
                          <b>{b.exec ? `Execução ${b.exec}` : "Sem execução"}</b>
                          <span>{num(totalGrupo.get(`${b.tarPai}|${b.exec}`) ?? b.linhas.length)} componentes</span>
                          <Link href={`/tarefa/${encodeURIComponent(b.tarPai)}${b.exec ? `?exec=${encodeURIComponent(b.exec)}` : ""}`}>
                            Abrir código {b.tarPai} ›
                          </Link>
                        </div>
                      </th>
                    </tr>
                    {b.linhas.map((c) => {
                      const cortes = cortesDa(c.codOrdem, c.cnc);
                      const naoApontados = cortes.filter((x) => x.st === "pendente" || x.st === "parcial").length;
                      const ordemCorte = (x: (typeof cortes)[number]) => (x.st === "pendente" || x.st === "parcial" ? 0 : x.st ? 2 : 1);
                      const celula = (x: (typeof cortes)[number]) => (
                        <span key={x.plano} className="plano-cel">
                          <span className="mono">{x.plano}</span>
                          {x.st ? (
                            <span className={`tag ${CLASSE_CORTE[x.st]}`}>{ROTULO_CORTE[x.st]}</span>
                          ) : (
                            <span className="tag neutro">Fora da aba CNC_PCQ</span>
                          )}
                        </span>
                      );
                      return (
                        <tr key={c.id}>
                          <td>
                            <Copiar valor={c.codOrdem} tipo="OP" />
                            <span className="pend-est mono">{c.codEstrutura}</span>
                          </td>
                          <td>
                            <Copiar valor={c.codigoPrd} tipo="Código" />
                            <span className="pend-grupo">Grupo {c.grupo}</span>
                            <br />
                            {c.nome}
                            {c.situacaoRa && <span className={`item-ra${c.situacaoRa === "RA Pendente" ? " item-ra-pend" : ""}`}>{c.situacaoRa}</span>}
                          </td>
                          <td>
                            {cortes.length === 0 ? (
                              "–"
                            ) : cortes.length === 1 ? (
                              celula(cortes[0])
                            ) : (
                              <details className="plano-resumo">
                                <summary>
                                  {naoApontados > 0 ? (
                                    <span className="tag pend">
                                      {naoApontados} {naoApontados === 1 ? "corte não apontado" : "cortes não apontados"}
                                    </span>
                                  ) : (
                                    <span className="tag ok">Cortes apontados</span>
                                  )}{" "}
                                  {cortes.length} planos
                                </summary>
                                {[...cortes].sort((x, y) => ordemCorte(x) - ordemCorte(y)).map(celula)}
                              </details>
                            )}
                          </td>
                          <td className="n">
                            {num(c.qtdUsada, 3)} {c.unidade}
                          </td>
                          <td className="n">{num(c.apontado, 3)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                ))}
              </table>
            </div>
          )}
          {paginas > 1 && (
            <nav className="paginas" aria-label="Páginas">
              <span>
                Página {num(pagina)} de {num(paginas)} · {num(POR_PAGINA)} por página
              </span>
              <div className="pag-n">
                {pagina > 1 ? (
                  <Link className="btn sec" href={link(params, { pagina: String(pagina - 1) })}>
                    ‹ Anterior
                  </Link>
                ) : (
                  <span className="btn sec" aria-disabled="true">
                    ‹ Anterior
                  </span>
                )}
                {numerosPagina(pagina, paginas).map((n, i) =>
                  n === "…" ? (
                    <span key={`r${i}`}>…</span>
                  ) : (
                    <Link key={n} href={link(params, { pagina: n === 1 ? undefined : String(n) })} aria-current={n === pagina ? "page" : undefined}>
                      {num(n)}
                    </Link>
                  ),
                )}
                {pagina < paginas ? (
                  <Link className="btn sec" href={link(params, { pagina: String(pagina + 1) })}>
                    Próxima ›
                  </Link>
                ) : (
                  <span className="btn sec" aria-disabled="true">
                    Próxima ›
                  </span>
                )}
              </div>
            </nav>
          )}
        </section>
      </main>
      <Rodape arquivo={carga.arquivo} />
    </>
  );
}
