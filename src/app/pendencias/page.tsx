import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@prisma/client";
import { Rodape, Topo } from "@/components/Topo";
import { cargaAtiva, prisma } from "@/lib/db";
import { num } from "@/lib/formato";
import { compararCodigo } from "@/lib/regras";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pendências de baixa" };

const POR_PAGINA = 100;

interface Props {
  searchParams: { tarefa?: string; grupo?: string; q?: string; pagina?: string };
}

function link(base: Props["searchParams"], muda: Partial<Props["searchParams"]>): string {
  const p = new URLSearchParams();
  const v = { ...base, ...muda };
  for (const [k, val] of Object.entries(v)) if (val) p.set(k, val);
  const s = p.toString();
  return s ? `/pendencias?${s}` : "/pendencias";
}

export default async function Pendencias({ searchParams }: Props) {
  const carga = await cargaAtiva();
  if (!carga) {
    return (
      <>
        <Topo ativo="pendencias" />
        <main className="in"><p className="card vazio">Nenhuma planilha carregada ainda.</p></main>
      </>
    );
  }

  const tarefa = searchParams.tarefa?.slice(0, 40) || undefined;
  const grupo = searchParams.grupo?.slice(0, 20) || undefined;
  const q = searchParams.q?.trim().slice(0, 80) || undefined;
  const pagina = Math.max(1, Math.trunc(Number(searchParams.pagina)) || 1);

  const base: Prisma.ComponenteWhereInput = { cargaId: carga.id, apontado: { lte: 0 } };
  const where: Prisma.ComponenteWhereInput = {
    ...base,
    ...(tarefa ? { tarPai: tarefa } : {}),
    ...(grupo ? { grupo } : {}),
    ...(q
      ? {
          OR: [
            { codigoPrd: { contains: q, mode: "insensitive" } },
            { nome: { contains: q, mode: "insensitive" } },
            { codOrdem: { contains: q } },
            { codEstrutura: { contains: q } },
          ],
        }
      : {}),
  };

  const [total, linhas, porTarefa, porGrupo] = await Promise.all([
    prisma.componente.count({ where }),
    prisma.componente.findMany({
      where,
      orderBy: [{ tarPai: "asc" }, { exec: "asc" }, { codOrdem: "asc" }, { idAtvOrdem: "asc" }],
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
    }),
    prisma.componente.groupBy({ by: ["tarPai"], where: base, _count: { _all: true } }),
    prisma.componente.groupBy({ by: ["grupo"], where: { ...base, ...(tarefa ? { tarPai: tarefa } : {}) }, _count: { _all: true } }),
  ]);
  const tarefas = porTarefa.sort((a, b) => compararCodigo(a.tarPai, b.tarPai));
  const grupos = porGrupo.sort((a, b) => b._count._all - a._count._all);
  const paginas = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <>
      <Topo ativo="pendencias" projeto={carga.projeto} atualizado={carga.criadaEm} />
      <section className="hero" aria-label="Resumo das pendências">
        <div className="in">
          <span className="kicker">Coluna APONTADO = 0 na aba Componentes</span>
          <h1>
            Pendências de baixa
            <em>{num(total)} componentes {tarefa || grupo || q ? "no filtro" : "sem apontamento"}</em>
          </h1>
        </div>
      </section>

      <main className="in">
        <section aria-labelledby="t-filtro">
          <h2 id="t-filtro" className="sr">Filtros</h2>
          <form className="filtros" method="get" action="/pendencias">
            <label className="sr" htmlFor="tarefa">Código de tarefa</label>
            <select id="tarefa" name="tarefa" className="campo" defaultValue={tarefa ?? ""}>
              <option value="">Todos os códigos</option>
              {tarefas.map((t) => (
                <option key={t.tarPai} value={t.tarPai}>
                  {t.tarPai} ({num(t._count._all)})
                </option>
              ))}
            </select>
            <label className="sr" htmlFor="q">Buscar</label>
            <input id="q" name="q" className="campo busca" type="search" placeholder="Código, nome, OP ou estrutura" defaultValue={q ?? ""} />
            {grupo && <input type="hidden" name="grupo" value={grupo} />}
            <button className="btn" type="submit">Filtrar</button>
            {(tarefa || grupo || q) && <Link className="btn sec" href="/pendencias">Limpar</Link>}
          </form>
          <div className="chips" role="group" aria-label="Grupo de material">
            <Link className="chip-btn" aria-pressed={!grupo} href={link(searchParams, { grupo: undefined, pagina: undefined })}>
              Todos os grupos
            </Link>
            {grupos.map((g) => (
              <Link key={g.grupo} className="chip-btn" aria-pressed={grupo === g.grupo} href={link(searchParams, { grupo: g.grupo, pagina: undefined })}>
                {g.grupo} <span className="n">{num(g._count._all)}</span>
              </Link>
            ))}
          </div>
        </section>

        <section aria-labelledby="t-lista">
          <div className="section-h">
            <div>
              <h2 id="t-lista">Componentes sem apontamento</h2>
              <p>Página {num(pagina)} de {num(paginas)} · {num(POR_PAGINA)} por página.</p>
            </div>
          </div>
          <div className="card tab-wrap">
            {linhas.length === 0 ? (
              <p className="vazio">Nenhum componente pendente com esse filtro.</p>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Tarefa</th>
                    <th>Exec.</th>
                    <th>OP</th>
                    <th>Estrutura</th>
                    <th>Componente</th>
                    <th>Grupo</th>
                    <th className="n">Usado</th>
                    <th className="n">Apontado</th>
                  </tr>
                </thead>
                <tbody>
                  {linhas.map((c) => (
                    <tr key={c.id}>
                      <td><Link href={`/tarefa/${encodeURIComponent(c.tarPai)}`}>{c.tarPai}</Link></td>
                      <td>{c.exec || "–"}</td>
                      <td className="mono">{c.codOrdem}</td>
                      <td className="mono">{c.codEstrutura}</td>
                      <td>
                        <span className="mono">{c.codigoPrd}</span>
                        <br />
                        {c.nome}
                      </td>
                      <td>{c.grupo}</td>
                      <td className="n">{num(c.qtdUsada, 3)} {c.unidade}</td>
                      <td className="n">{num(c.apontado, 3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {paginas > 1 && (
            <nav className="paginas" aria-label="Páginas">
              {pagina > 1 ? <Link className="btn sec" href={link(searchParams, { pagina: String(pagina - 1) })}>‹ Anterior</Link> : <span />}
              <span>Página {num(pagina)} de {num(paginas)}</span>
              {pagina < paginas ? <Link className="btn sec" href={link(searchParams, { pagina: String(pagina + 1) })}>Próxima ›</Link> : <span />}
            </nav>
          )}
        </section>
      </main>
      <Rodape arquivo={carga.arquivo} />
    </>
  );
}
