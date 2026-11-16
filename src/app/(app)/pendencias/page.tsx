import { clsx } from "clsx";
import { ChevronLeft, ChevronRight, SearchX, Upload, X } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { Copiar, Exportar, Imprimir, type Celula } from "@/components/Acoes";
import { CLASSE_CORTE } from "@/components/Arvore";
import { EstadoVazio } from "@/components/layout/EstadoVazio";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { TOM_DA_CLASSE } from "@/lib/cores";
import { FiltrosPendencias, type ValoresFiltro } from "@/components/FiltrosPendencias";
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
      <div className="rounded-card border border-subtle bg-bg shadow-subtle">
        <h1 className="sr-only">Pendências de baixa</h1>
        <EstadoVazio
          icone={Upload}
          titulo="Nenhuma planilha carregada ainda"
          acao={
            <Link className={buttonVariants.ghost} href="/importar">
              Ir para Atualizar
            </Link>
          }
        />
      </div>
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
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));

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

  /** Cabeçalho de tabela na régua do Visto: cinza, nunca vermelho. */
  const CAB = "px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-txt-muted";
  const ORDENA = "inline-flex min-h-11 items-center text-[11px] font-semibold uppercase tracking-[0.1em] text-txt-muted hover:text-txt";
  const BOTAO_PAG = `${buttonVariants.ghost} !min-w-11 !px-3 !text-[13px]`;
  const seta = (s?: string) => (s === "ascending" ? " ↑" : s === "descending" ? " ↓" : "");
  const seloCorte = (st: StatusCorte | null | undefined) =>
    st ? <Badge tone={TOM_DA_CLASSE[CLASSE_CORTE[st]]}>{ROTULO_CORTE[st]}</Badge> : <Badge tone="neutral">Fora da aba CNC_PCQ</Badge>;

  return (
    <div className="flex flex-col gap-4">
      {/* A trilha do topo nomeia a tela; o título fica para leitor de tela (regra do Visto). */}
      <h1 className="sr-only">Pendências de baixa</h1>

      {/* Filtros e filtros ativos parados ao rolar, abaixo do topo de 64px (como o .fixo de antes). */}
      <div className="sticky top-16 z-10 -mx-4 flex flex-col gap-2 border-b border-subtle bg-bg-2 px-4 py-2.5 md:-mx-6 md:px-6 print:hidden">
        <FiltrosPendencias
          key={JSON.stringify(valores)}
          valores={valores}
          tarefas={tarefas.map((t) => ({ valor: t.tarPai, rotulo: `${t.tarPai} (${num(t._count._all)})` }))}
          grupos={opcoesGrupo}
          planos={Object.entries(FILTRO_PLANO).map(([k, f]) => ({ valor: k, rotulo: f.rotulo }))}
        />
        <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-txt">
          {ativos.length > 0 && (
            <>
              <span>Filtros ativos:</span>
              {ativos.map((a) => (
                <Link
                  key={a.rotulo}
                  href={link(params, a.sem)}
                  aria-label={`Remover filtro ${a.rotulo}`}
                  scroll={false}
                  className="inline-flex min-h-11 items-center gap-2 rounded-pill border border-txt bg-txt px-3.5 text-sm font-semibold text-bg transition-colors hover:border-delp-red-dark hover:bg-delp-red-dark hover:text-white"
                >
                  {a.rotulo}
                  <X size={14} aria-hidden="true" />
                </Link>
              ))}
              <Link className={`${buttonVariants.ghost} !px-3.5 !text-[13px]`} href="/pendencias">
                Limpar
              </Link>
            </>
          )}
          <div className="ml-auto flex flex-wrap gap-2">
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

      <section aria-labelledby="t-lista" className="flex flex-col gap-3">
        <div>
          <h2 id="t-lista" className="text-[15px] font-semibold leading-tight text-txt">
            Componentes sem apontamento
          </h2>
          <p className="mt-1 max-w-[70ch] text-xs leading-snug text-txt-2">
            Agrupados por código de tarefa e execução. Toque na OP ou no código para copiar.
          </p>
        </div>
        {linhas.length === 0 ? (
          <div className="rounded-card border border-subtle bg-bg shadow-subtle">
            <EstadoVazio
              icone={SearchX}
              titulo="Nenhum componente com esses filtros"
              descricao="Mude a busca ou remova um filtro."
              acao={
                <Link className={buttonVariants.ghost} href="/pendencias">
                  Limpar
                </Link>
              }
            />
          </div>
        ) : (
          // A tabela rola de lado dentro do próprio bloco (a página não rola de lado no celular).
          <div className="overflow-x-auto rounded-card border border-subtle bg-bg shadow-subtle print:overflow-visible print:border-0 print:shadow-none">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-med">
                  <th className={CAB} aria-sort={ordemOp}>
                    <Link className={ORDENA} href={link(params, { ordem: ordem === "op-asc" ? "op-desc" : "op-asc", pagina: undefined })} scroll={false}>
                      OP · estrutura{seta(ordemOp)}
                    </Link>
                  </th>
                  <th className={CAB}>Componente</th>
                  <th className={CAB}>Plano de corte</th>
                  <th className={clsx(CAB, "!text-right")} aria-sort={ordemUsado}>
                    <Link
                      className={ORDENA}
                      href={link(params, { ordem: ordem === "usado-desc" ? "usado-asc" : "usado-desc", pagina: undefined })}
                      scroll={false}
                    >
                      Usado{seta(ordemUsado)}
                    </Link>
                  </th>
                  <th className={clsx(CAB, "!text-right")}>Apont.</th>
                </tr>
              </thead>
              {blocos.map((b) => (
                <tbody key={`${b.tarPai}|${b.exec}|${b.linhas[0].id}`}>
                  <tr className="border-b border-subtle bg-bg-2">
                    <th colSpan={5} scope="rowgroup" className="px-4 py-1 text-left font-normal">
                      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-txt">
                        <b className="font-mono font-bold">{b.tarPai}</b>
                        <b className="font-semibold">{b.exec ? `Execução ${b.exec}` : "Sem execução"}</b>
                        <span className="text-sm text-txt-2">
                          <span className="font-mono">{num(totalGrupo.get(`${b.tarPai}|${b.exec}`) ?? b.linhas.length)}</span> componentes
                        </span>
                        <Link
                          className="ml-auto inline-flex min-h-11 items-center text-sm font-semibold text-txt underline underline-offset-2 hover:text-delp-red"
                          href={`/tarefa/${encodeURIComponent(b.tarPai)}${b.exec ? `?exec=${encodeURIComponent(b.exec)}` : ""}`}
                        >
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
                      <span key={x.plano} className="flex flex-wrap items-center gap-2 whitespace-nowrap font-semibold [&+&]:mt-1.5">
                        <span className="font-mono text-sm">{x.plano}</span>
                        {seloCorte(x.st)}
                      </span>
                    );
                    return (
                      <tr key={c.id} className="border-b border-subtle align-top">
                        <td className="px-3.5 py-1.5">
                          <Copiar valor={c.codOrdem} tipo="OP" />
                          <span className="block font-mono text-sm text-txt-2">{c.codEstrutura}</span>
                        </td>
                        <td className="px-3.5 py-1.5 leading-snug text-txt">
                          <Copiar valor={c.codigoPrd} tipo="Código" />
                          <span className="ml-2 text-sm text-txt-2">Grupo {c.grupo}</span>
                          <span className="block">{c.nome}</span>
                          {c.situacaoRa && (
                            <span className={clsx("block text-[13px] font-semibold", c.situacaoRa === "RA Pendente" ? "text-delp-red" : "text-txt-2")}>
                              {c.situacaoRa}
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-1.5">
                          {cortes.length === 0 ? (
                            "–"
                          ) : cortes.length === 1 ? (
                            celula(cortes[0])
                          ) : (
                            <details>
                              <summary className="inline-flex min-h-11 cursor-pointer flex-wrap items-center gap-1.5 rounded-btn border border-med px-2.5 py-1 text-sm font-semibold text-txt [&::-webkit-details-marker]:hidden">
                                {naoApontados > 0 ? (
                                  <Badge tone="danger">
                                    {naoApontados} {naoApontados === 1 ? "corte não apontado" : "cortes não apontados"}
                                  </Badge>
                                ) : (
                                  <Badge tone="success">Cortes apontados</Badge>
                                )}{" "}
                                <span className="font-mono">{cortes.length}</span> planos
                              </summary>
                              <div className="pt-2">{[...cortes].sort((x, y) => ordemCorte(x) - ordemCorte(y)).map(celula)}</div>
                            </details>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3.5 py-1.5 text-right font-mono text-sm">
                          {num(c.qtdUsada, 3)} {c.unidade}
                        </td>
                        <td className="whitespace-nowrap px-3.5 py-1.5 text-right font-mono text-sm">{num(c.apontado, 3)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              ))}
            </table>
          </div>
        )}
        {paginas > 1 && (
          <nav className="flex flex-wrap items-center justify-between gap-2.5 text-sm text-txt-2 print:hidden" aria-label="Páginas">
            <span>
              Página <span className="font-mono">{num(pagina)}</span> de <span className="font-mono">{num(paginas)}</span> ·{" "}
              <span className="font-mono">{num(POR_PAGINA)}</span> por página
            </span>
            <div className="flex flex-wrap items-center gap-1.5">
              {pagina > 1 ? (
                <Link className={BOTAO_PAG} href={link(params, { pagina: String(pagina - 1) })}>
                  <ChevronLeft size={15} aria-hidden="true" />
                  Anterior
                </Link>
              ) : (
                <span className={`${BOTAO_PAG} pointer-events-none opacity-45`} aria-disabled="true">
                  <ChevronLeft size={15} aria-hidden="true" />
                  Anterior
                </span>
              )}
              {numerosPagina(pagina, paginas).map((n, i) =>
                n === "…" ? (
                  <span key={`r${i}`} className="px-1">
                    …
                  </span>
                ) : (
                  <Link
                    key={n}
                    href={link(params, { pagina: n === 1 ? undefined : String(n) })}
                    aria-current={n === pagina ? "page" : undefined}
                    className={clsx(
                      "inline-flex min-h-11 min-w-11 items-center justify-center rounded-btn border px-2.5 font-mono text-[13px] font-semibold",
                      n === pagina ? "border-txt bg-txt text-bg" : "border-med bg-bg text-txt hover:border-txt-muted",
                    )}
                  >
                    {num(n)}
                  </Link>
                ),
              )}
              {pagina < paginas ? (
                <Link className={BOTAO_PAG} href={link(params, { pagina: String(pagina + 1) })}>
                  Próxima
                  <ChevronRight size={15} aria-hidden="true" />
                </Link>
              ) : (
                <span className={`${BOTAO_PAG} pointer-events-none opacity-45`} aria-disabled="true">
                  Próxima
                  <ChevronRight size={15} aria-hidden="true" />
                </span>
              )}
            </div>
          </nav>
        )}
      </section>
    </div>
  );
}
