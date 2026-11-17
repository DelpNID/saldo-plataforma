import { clsx } from "clsx";
import { ChevronLeft, ChevronRight, Download, SearchX, Upload, X } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { Copiar, Imprimir } from "@/components/Acoes";
import { FiltrosOps, type ValoresFiltroOps } from "@/components/gestao/FiltrosOps";
import { EstadoVazio } from "@/components/layout/EstadoVazio";
import { buttonVariants } from "@/components/ui/Button";
import { cargaAtiva, prisma } from "@/lib/db";
import { num } from "@/lib/formato";
import { CAMINHO_OPS, SEM_TAG, filtrarOps, lerFiltroOps, opsFabricadasSemSaldo, ordenarOps, type OpSemSaldo } from "@/lib/gestor";
import { compararCodigo, descricaoCurta } from "@/lib/regras";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "OPs fabricadas sem saldo" };

const POR_PAGINA = 100;

interface Props {
  searchParams: { q?: string; codigo?: string; tag?: string; pagina?: string };
}

type Params = Props["searchParams"];
function link(base: Params, muda: Partial<Params>, caminho = CAMINHO_OPS): string {
  const p = new URLSearchParams();
  for (const [k, val] of Object.entries({ ...base, ...muda })) if (val) p.set(k, val);
  const s = p.toString();
  return s ? `${caminho}?${s}` : caminho;
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

/** Um número do resumo do topo. */
function Resumo({ rotulo, valor, detalhe }: { rotulo: string; valor: string; detalhe?: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-btn border border-subtle bg-bg-2 px-3 py-2.5">
      <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-txt-2">{rotulo}</span>
      <b className="whitespace-nowrap font-mono text-[22px] font-bold leading-tight text-txt">{valor}</b>
      {detalhe && <span className="text-xs text-txt-2">{detalhe}</span>}
    </div>
  );
}

export default async function OpsSemSaldo({ searchParams }: Props) {
  const carga = await cargaAtiva();
  if (!carga) {
    return (
      <div className="rounded-card border border-subtle bg-bg shadow-subtle">
        <h1 className="sr-only">OPs fabricadas sem saldo</h1>
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

  const filtro = lerFiltroOps(searchParams);
  const pagina = Math.max(1, Math.trunc(Number(searchParams.pagina)) || 1);
  const params: Params = { q: filtro.q, codigo: filtro.codigo, tag: filtro.tag };

  const [todas, tarefas] = await Promise.all([
    opsFabricadasSemSaldo(prisma, carga.id),
    prisma.tarefa.findMany({ where: { cargaId: carga.id }, select: { codTarefa: true, descricao: true } }),
  ]);
  const descricaoDe = new Map(tarefas.map((t) => [t.codTarefa, descricaoCurta(t.descricao)]));

  // Opções dos filtros com a contagem do total (o código, dentro da TAG escolhida; a TAG, dentro do código)
  const contar = (lista: OpSemSaldo[], chave: (o: OpSemSaldo) => string) => {
    const m = new Map<string, number>();
    for (const o of lista) m.set(chave(o), (m.get(chave(o)) ?? 0) + 1);
    return m;
  };
  const porCodigo = contar(filtrarOps(todas, { tag: filtro.tag }), (o) => o.cod);
  const porTag = contar(filtrarOps(todas, { codigo: filtro.codigo }), (o) => o.tag || SEM_TAG);
  const opcoesCodigo = [...porCodigo.entries()].sort((a, b) => compararCodigo(a[0], b[0])).map(([c, n]) => ({ valor: c, rotulo: `${c} (${num(n)})` }));
  const opcoesTag = [...porTag.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([t, n]) => ({ valor: t, rotulo: `${t} (${num(n)})` }));

  const lista = ordenarOps(filtrarOps(todas, filtro), compararCodigo);
  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const daPagina = lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const codigos = new Set(lista.map((o) => o.cod)).size;
  const pendentes = lista.reduce((s, o) => s + o.pendentes, 0);
  const totalPorCodigo = contar(lista, (o) => o.cod);

  // Linhas da página agrupadas por código de tarefa, na ordem da lista
  const blocos: { cod: string; linhas: OpSemSaldo[] }[] = [];
  for (const o of daPagina) {
    const ultimo = blocos[blocos.length - 1];
    if (ultimo && ultimo.cod === o.cod) ultimo.linhas.push(o);
    else blocos.push({ cod: o.cod, linhas: [o] });
  }

  const ativos: { rotulo: string; sem: Partial<Params> }[] = [
    ...(filtro.q ? [{ rotulo: `Busca: ${filtro.q}`, sem: { q: undefined } }] : []),
    ...(filtro.codigo ? [{ rotulo: `Código ${filtro.codigo}`, sem: { codigo: undefined } }] : []),
    ...(filtro.tag ? [{ rotulo: `TAG ${filtro.tag}`, sem: { tag: undefined } }] : []),
  ];
  const valores: ValoresFiltroOps = { q: filtro.q, codigo: filtro.codigo, tag: filtro.tag };

  /** Cabeçalho de tabela na régua do Visto: cinza, nunca vermelho. */
  const CAB = "px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-txt-muted";
  const BOTAO_PAG = `${buttonVariants.ghost} !min-w-11 !px-3 !text-[13px]`;
  const BOTAO_FERRAMENTA = `${buttonVariants.ghost} !px-3.5 !text-[13px] print:hidden`;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="sr-only">OPs fabricadas sem saldo</h1>

      {/* Filtros parados ao rolar, abaixo do topo de 64px (como em Pendências). */}
      <div className="sticky top-16 z-10 -mx-4 flex flex-col gap-2 border-b border-subtle bg-bg-2 px-4 py-2.5 md:-mx-6 md:px-6 print:hidden">
        <FiltrosOps key={JSON.stringify(valores)} valores={valores} codigos={opcoesCodigo} tags={opcoesTag} />
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
              <Link className={`${buttonVariants.ghost} !px-3.5 !text-[13px]`} href={CAMINHO_OPS}>
                Limpar
              </Link>
            </>
          )}
          <div className="ml-auto flex flex-wrap gap-2">
            <a className={BOTAO_FERRAMENTA} href={link(params, {}, `${CAMINHO_OPS}/exportar`)} download>
              <Download size={15} aria-hidden="true" />
              Exportar tudo ({num(lista.length)})
            </a>
            <Imprimir />
          </div>
        </div>
      </div>

      <section aria-label="Resumo" className="flex flex-col gap-3 rounded-card border border-subtle bg-bg p-4 shadow-subtle">
        <div>
          <h2 className="text-[15px] font-semibold leading-tight text-txt">OPs fabricadas sem saldo</h2>
          <p className="mt-1 max-w-[80ch] text-xs leading-snug text-txt-2">
            OPs com todas as atividades apontadas na aba Dados e o saldo ainda não efetivado (QTDE EFETIVADA menor que a PLANEJADA). Efetivar o saldo destas OPs
            sobe o saldo do código de tarefa.{" "}
            <Link href="/gestao" className="font-semibold text-txt underline underline-offset-2 hover:text-delp-red">
              Voltar à Gestão
            </Link>
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <Resumo rotulo="OPs" valor={num(lista.length)} detalhe={ativos.length ? `de ${num(todas.length)} no projeto` : "no projeto"} />
          <Resumo rotulo="Códigos de tarefa" valor={num(codigos)} />
          <Resumo rotulo="Componentes pendentes de baixa" valor={num(pendentes)} detalhe="nestas OPs" />
        </div>
      </section>

      <section aria-labelledby="t-ops" className="flex flex-col gap-3">
        <div>
          <h2 id="t-ops" className="text-[15px] font-semibold leading-tight text-txt">
            Lista para cobrança
          </h2>
          <p className="mt-1 max-w-[70ch] text-xs leading-snug text-txt-2">Agrupada por código de tarefa. Toque na OP para copiar.</p>
        </div>
        {lista.length === 0 ? (
          <div className="rounded-card border border-subtle bg-bg shadow-subtle">
            <EstadoVazio
              icone={SearchX}
              titulo={todas.length === 0 ? "Nenhuma OP fabricada sem saldo" : "Nenhuma OP com esses filtros"}
              descricao={todas.length === 0 ? undefined : "Mude a busca ou remova um filtro."}
              acao={
                todas.length === 0 ? undefined : (
                  <Link className={buttonVariants.ghost} href={CAMINHO_OPS}>
                    Limpar
                  </Link>
                )
              }
            />
          </div>
        ) : (
          // A tabela rola de lado dentro do próprio bloco (a página não rola de lado no celular).
          <div className="overflow-x-auto rounded-card border border-subtle bg-bg shadow-subtle print:overflow-visible print:border-0 print:shadow-none">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-med">
                  <th className={CAB}>OP · descrição</th>
                  <th className={CAB}>TAG</th>
                  <th className={clsx(CAB, "!text-right")}>Saldo da OP</th>
                  <th className={clsx(CAB, "!text-right")}>Atividades</th>
                  <th className={clsx(CAB, "!text-right")}>Horas</th>
                  <th className={clsx(CAB, "!text-right")}>Pendentes de baixa</th>
                </tr>
              </thead>
              {blocos.map((b) => (
                <tbody key={`${b.cod}|${b.linhas[0].op}`}>
                  <tr className="border-b border-subtle bg-bg-2">
                    <th colSpan={6} scope="rowgroup" className="px-4 py-1 text-left font-normal">
                      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-txt">
                        <b className="font-mono font-bold">{b.cod}</b>
                        <span className="font-semibold">{descricaoDe.get(b.cod) ?? ""}</span>
                        <span className="text-sm text-txt-2">
                          <span className="font-mono">{num(totalPorCodigo.get(b.cod) ?? b.linhas.length)}</span> OPs
                        </span>
                        <Link
                          className="ml-auto inline-flex min-h-11 items-center text-sm font-semibold text-txt underline underline-offset-2 hover:text-delp-red"
                          href={`/tarefa/${encodeURIComponent(b.cod)}`}
                        >
                          Abrir código {b.cod} ›
                        </Link>
                      </div>
                    </th>
                  </tr>
                  {b.linhas.map((o) => (
                    <tr key={`${o.cod}|${o.op}`} className="border-b border-subtle align-top">
                      <td className="px-3.5 py-1.5 leading-snug">
                        <Copiar valor={o.op} tipo="OP" />
                        <span className="block min-w-[14rem] text-sm text-txt">{o.descricao}</span>
                      </td>
                      <td className="px-3.5 py-1.5 font-mono text-sm text-txt">{o.tag || <span className="text-txt-2">sem TAG</span>}</td>
                      <td className="whitespace-nowrap px-3.5 py-1.5 text-right font-mono text-sm">
                        <b className="text-delp-red">{num(o.efetivada, 2)}</b> de {num(o.planejada, 2)}
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-1.5 text-right font-mono text-sm">
                        {num(o.atividades)} de {num(o.atividades)}
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-1.5 text-right font-mono text-sm">
                        {num(o.horasApontadas, 1)} de {num(o.horasPrevistas, 1)} h
                      </td>
                      <td className="whitespace-nowrap px-3.5 py-1.5 text-right font-mono text-sm">
                        {num(o.pendentes)} de {num(o.componentes)}
                      </td>
                    </tr>
                  ))}
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
