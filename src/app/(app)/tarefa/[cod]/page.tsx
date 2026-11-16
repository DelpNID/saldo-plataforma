import { clsx } from "clsx";
import { ChevronRight, ListChecks, PackageOpen } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { type Celula } from "@/components/Acoes";
import { CabecalhoArvore, NoEstrutura, OpsDaEstrutura, chaveCorte, type Cortes } from "@/components/Arvore";
import { ControlesTarefa, TrocaCodigo } from "@/components/ControlesTarefa";
import { Avanco, Barra, Comparacao, EtiquetaMaterial, EtiquetaSaldo, EtiquetaSituacao } from "@/components/Etiquetas";
import { FichaParada } from "@/components/FichaParada";
import { EstadoVazio } from "@/components/layout/EstadoVazio";
import { Painel } from "@/components/layout/Painel";
import { TileIndicador } from "@/components/ui/TileIndicador";
import { COR_ASCENT } from "@/lib/cores";
import { cargaAtiva, prisma } from "@/lib/db";
import { avancoDe } from "@/lib/kpis";
import { num, pct } from "@/lib/formato";
import {
  RETRABALHO,
  ROTULO_SALDO,
  SITUACOES_RA,
  compararCodigo,
  contarRa,
  descOrigem,
  descricaoCurta,
  filtrarArvore,
  filtroMostrar,
  montarArvore,
  pendenciasDoCodigo,
  planosDaColuna,
  resumirOrigens,
  rotuloMaterial,
  statusCorte,
  statusSaldo,
  tituloOrigem,
  type FiltroMostrar,
  type NoArvore,
} from "@/lib/regras";

export const dynamic = "force-dynamic";

const MAX_LINHAS_LISTA = 300; // "Pendências do código": o resto fica na tela Pendências, já filtrada

interface Props {
  params: { cod: string };
  searchParams: { exec?: string; visao?: string; mostrar?: string };
}

export function generateMetadata({ params }: Props): Metadata {
  return { title: `Tarefa ${decodeURIComponent(params.cod)}` };
}

const rotuloExec = (exec: string) => (exec ? `Execução ${exec}` : "Sem execução");

/** Árvore filtrada em linhas, para o Exportar. */
function linhasDaArvore(exec: string, raizes: NoArvore[]): Celula[][] {
  const out: Celula[][] = [];
  const visitar = (no: NoArvore, nivel: number, pai?: { pendentes: number; linhas: number }) => {
    const situacao = ROTULO_SALDO[no.status] + (pai ? ` · No pai: ${rotuloMaterial(pai.pendentes, pai.linhas).texto}` : "");
    out.push([
      exec,
      nivel,
      "Estrutura",
      no.codEstrutura,
      no.nome,
      no.ops.map((o) => o.op).join(" "),
      `${num(no.efetivada, 2)} de ${num(no.planejada, 2)}`,
      no.pendentesTotal,
      situacao,
      "",
    ]);
    for (const it of no.itens) {
      if (it.filho) visitar(it.filho, nivel + 1, it);
      else
        out.push([
          exec,
          nivel + 1,
          "Componente",
          it.codigoPrd,
          it.nome,
          "",
          `Usado ${num(it.qtdUsada, 3)} ${it.unidade} · apontado ${num(it.apontado, 3)}`,
          it.pendentes,
          rotuloMaterial(it.pendentes, it.linhas).texto,
          it.planos.map((p) => p.plano).join(" "),
        ]);
    }
  };
  for (const r of raizes) visitar(r, 1);
  return out;
}

export default async function TarefaPage({ params, searchParams }: Props) {
  const cod = decodeURIComponent(params.cod);
  const carga = await cargaAtiva();
  if (!carga) notFound();

  const [tarefa, comps, codigosProjeto] = await Promise.all([
    prisma.tarefa.findFirst({ where: { cargaId: carga.id, codTarefa: cod } }),
    prisma.componente.findMany({
      where: { cargaId: carga.id, tarPai: cod },
      orderBy: [{ exec: "asc" }, { codEstrutura: "asc" }, { idAtvOrdem: "asc" }],
    }),
    prisma.tarefa.findMany({ where: { cargaId: carga.id }, select: { codTarefa: true }, orderBy: { ordem: "asc" } }),
  ]);
  if (!tarefa && comps.length === 0) notFound();

  const opsDistintas = [...new Set(comps.map((c) => c.codOrdem))];
  // Situação da RA dos componentes do código (coluna SITUACAO_RA)
  const ra = contarRa(comps);
  const temRa = Object.keys(ra).length > 0;
  const outrasRa = comps.length - (SITUACOES_RA as readonly string[]).reduce((s, k) => s + (ra[k] ?? 0), 0);
  // % AVANÇO FABRIC do Resumo Geral (planilhas antigas não têm)
  const fabric = carga.comFabric && tarefa ? tarefa.avancoFabric : null;
  const origens = resumirOrigens(cod, comps);
  const outras = origens.filter((o) => o.tipo === "outra").map((o) => o.tarFilho);
  const [ordens, tarefasFilhas] = await Promise.all([
    prisma.ordem.findMany({ where: { cargaId: carga.id, op: { in: opsDistintas } }, select: { op: true, descricao: true } }),
    outras.length
      ? prisma.tarefa.findMany({ where: { cargaId: carga.id, codTarefa: { in: outras } }, select: { codTarefa: true, avanco: true } })
      : Promise.resolve([]),
  ]);
  const nomeOp = new Map(ordens.map((o) => [o.op, o.descricao]));
  const avancoFilha = new Map(tarefasFilhas.map((t) => [t.codTarefa, t.avanco]));

  const visao = searchParams.visao === "lista" ? "lista" : "arvore";
  const mostrar: FiltroMostrar = filtroMostrar(searchParams.mostrar);
  const execs = montarArvore(comps, (op) => nomeOp.get(op));
  // Só a execução escolhida vai para a árvore: a página fica leve mesmo em tarefa com milhares de componentes
  const execAtual = execs.find((e) => e.exec === searchParams.exec) ?? execs.find((e) => e.pendentes > 0 || e.opsSemSaldo > 0) ?? execs[0];
  const raizes = visao === "arvore" && execAtual ? execAtual.raizes.map((r) => filtrarArvore(r, mostrar)).filter((r): r is NoArvore => r !== null) : [];
  const listaCompleta = visao === "lista" ? pendenciasDoCodigo(execs, mostrar) : [];
  const lista = listaCompleta.slice(0, MAX_LINHAS_LISTA);

  // Planos de corte (CNC e PA/PC) dos materiais da execução aberta
  const paresExec = new Set(
    (visao === "arvore" && execAtual ? comps.filter((c) => c.exec === execAtual.exec && c.cnc) : []).flatMap((c) =>
      planosDaColuna(c.cnc).map((p) => chaveCorte(c.codOrdem, p)),
    ),
  );
  const planosExec = [...new Set([...paresExec].map((k) => k.slice(k.indexOf("|") + 1)))];
  const linhasPlano = planosExec.length
    ? await prisma.planoCorte.findMany({
        where: { cargaId: carga.id, plano: { in: planosExec } },
        select: { plano: true, op: true, qtdPrev: true, qtdApont: true, statusOp: true, lote: true, criadoEm: true, qtdSucata: true, qtdMpFinal: true },
      })
    : [];
  const cortes: Cortes = { linha: new Map(), plano: new Map() };
  for (const l of linhasPlano) {
    cortes.linha.set(chaveCorte(l.op, l.plano), l);
    const r = cortes.plano.get(l.plano) ?? { ops: 0, cortadas: 0 };
    r.ops += 1;
    if (statusCorte(l.qtdPrev, l.qtdApont) === "apontado") r.cortadas += 1;
    cortes.plano.set(l.plano, r);
  }
  let cortesPendentes = 0;
  for (const k of paresExec) {
    const l = cortes.linha.get(k);
    if (!l || statusCorte(l.qtdPrev, l.qtdApont) !== "apontado") cortesPendentes += 1;
  }

  const opsComSaldo = new Set(comps.filter((c) => statusSaldo(c.previsto, c.apontado2) === "ok").map((c) => c.codOrdem)).size;
  const pendentes = comps.filter((c) => c.apontado <= 0).length;
  const previsto = tarefa?.qtdPrevisto ?? comps.reduce((s, c) => s + c.previsto, 0);
  const realizado = tarefa?.qtdRealizada ?? comps.reduce((s, c) => s + c.apontado2, 0);
  const avanco = tarefa?.avanco ?? (previsto > 0 ? realizado / previsto : 0);
  const titulo = cod === RETRABALHO ? "Retrabalho" : tarefa ? descricaoCurta(tarefa.descricao) : `Código ${cod}`;

  // Navegação: anterior e próximo na ordem dos códigos (a mesma do Painel)
  const codigos = codigosProjeto.map((t) => t.codTarefa).sort(compararCodigo);
  const pos = codigos.indexOf(cod);
  const anterior = pos > 0 ? codigos[pos - 1] : undefined;
  const proximo = pos >= 0 && pos < codigos.length - 1 ? codigos[pos + 1] : undefined;

  const base = `/tarefa/${encodeURIComponent(cod)}`;
  const link = (p: { exec?: string; visao?: string; mostrar?: FiltroMostrar }) => {
    const q = new URLSearchParams();
    if (p.visao === "lista") q.set("visao", "lista");
    else if (p.exec) q.set("exec", p.exec);
    if (p.mostrar && p.mostrar !== "tudo") q.set("mostrar", p.mostrar);
    const s = q.toString();
    return s ? `${base}?${s}` : base;
  };
  const hrefMostrar = Object.fromEntries((["tudo", "nao-baixado", "sem-saldo"] as const).map((m) => [m, link({ exec: execAtual?.exec, visao, mostrar: m })]));

  const exportar =
    visao === "arvore"
      ? {
          nome: `tarefa-${cod}-execucao-${execAtual?.exec || "sem"}`,
          cabecalho: ["Execução", "Nível", "Tipo", "Código", "Nome", "OP", "Saldo / quantidade", "Pendentes", "Situação", "Plano de corte"],
          linhas: execAtual ? linhasDaArvore(execAtual.exec, raizes) : [],
        }
      : {
          nome: `tarefa-${cod}-pendencias`,
          cabecalho: ["Execução", "Tipo", "Código", "Nome", "OP", "Saldo", "Situação"],
          linhas: lista.map((l) => [
            l.exec,
            l.tipo === "estrutura" ? "Estrutura" : "Componente",
            l.codigo,
            l.nome,
            l.ops.join(" "),
            l.tipo === "estrutura" ? `${num(l.efetivada ?? 0, 2)} de ${num(l.planejada ?? 0, 2)}` : "",
            l.tipo === "estrutura"
              ? ROTULO_SALDO[l.status ?? "sem-dado"] + (l.pai ? ` · No pai: ${rotuloMaterial(l.pai.pendentes, l.pai.linhas).texto}` : "")
              : rotuloMaterial(l.pendentes, l.linhas).texto,
          ]),
        };

  /** Cabeçalho de tabela na régua do Visto: cinza, nunca vermelho. */
  const CAB = "px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.1em] text-txt-muted";
  const ehAtual = (e: (typeof execs)[number]) => e.exec === execAtual?.exec;
  const comLista = visao === "arvore" && execs.length > 0;

  return (
    <div className="flex flex-col gap-4">
      <TrocaCodigo anterior={anterior} proximo={proximo} codigos={[...codigos, RETRABALHO]} />

      {/* Cabeçalho da ficha, parado ao rolar logo abaixo do topo (como o .fixo de antes). */}
      <FichaParada>
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-txt-2">
          {cod === RETRABALHO ? (
            "Fora dos códigos de tarefa"
          ) : (
            <>
              Código de tarefa <span className="font-mono">{cod}</span>
            </>
          )}
          {tarefa?.desenho ? (
            <>
              {" "}
              · Desenho <span className="font-mono">{tarefa.desenho}</span>
            </>
          ) : null}
        </p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-2xl font-bold leading-tight text-txt">{titulo}</h1>
          <EtiquetaSituacao avanco={avanco} />
          <span className="text-sm font-semibold text-txt">
            <span className="font-mono">{pct(avanco)}</span> do saldo subido
            {fabric !== null ? (
              <>
                {" "}
                · fabricação <span className="font-mono">{pct(fabric)}</span>
              </>
            ) : null}
          </span>
        </div>
      </FichaParada>

      <section aria-label="Resumo do código de tarefa" className="grade-indicadores">
        <TileIndicador
          rotulo={fabric !== null ? "Avanço do saldo × fabricação" : "Avanço do saldo"}
          valor={pct(avanco)}
          detalhe={`${num(realizado, 1)} de ${num(previsto, 1)} previsto`}
        >
          {fabric !== null ? (
            <Comparacao saldo={avanco} fabric={fabric} previsto={previsto} realizado={realizado} />
          ) : (
            <Barra valor={avanco} cor={COR_ASCENT.avanco} />
          )}
        </TileIndicador>
        <TileIndicador
          rotulo="Execuções"
          valor={num(tarefa?.execucoes ?? execs.length)}
          detalhe={tarefa ? `${num(tarefa.execPend, 1)} pendentes` : "sem linha no Resumo Geral"}
        />
        <TileIndicador rotulo="OPs com saldo" valor={num(opsComSaldo)} detalhe={`de ${num(opsDistintas.length)} OPs`} />
        <TileIndicador rotulo="Pendentes de baixa" valor={num(pendentes)} detalhe={`de ${num(comps.length)} componentes`}>
          <Link
            href={`/pendencias?tarefa=${encodeURIComponent(cod)}`}
            className="inline-flex min-h-11 items-center self-start text-xs font-semibold text-txt underline underline-offset-2 hover:text-delp-red"
          >
            Ver a lista de pendências
          </Link>
          {temRa && (
            <span className="flex flex-col gap-px border-t border-subtle pt-1.5 text-sm text-txt" aria-label="Situação da RA dos componentes">
              <span>
                RA pendente <b className="font-mono">{num(ra["RA Pendente"] ?? 0)}</b> · RA gerada{" "}
                <b className="font-mono">{num(ra["RA gerada"] ?? 0)}</b>
              </span>
              <small className="text-xs text-txt-2">
                {num(ra["Subconjunto (sem RA)"] ?? 0)} subconjunto (sem RA) · {num(ra["Plano sem RA"] ?? 0)} plano sem RA
                {outrasRa > 0 ? ` · ${num(outrasRa)} sem situação` : ""}
              </small>
            </span>
          )}
        </TileIndicador>
      </section>

      <Painel
        titulo="De onde vem o saldo"
        apoio="Tarefas filhas deste código, como na aba Árvore. O avanço soma o saldo das OPs onde cada item entra."
      >
        {origens.length === 0 ? (
          <EstadoVazio icone={PackageOpen} titulo="Este código de tarefa não tem componentes na planilha" />
        ) : (
          <ul className="-mx-4 -mb-4 flex flex-col border-t border-subtle">
            {origens.map((o, i) => {
              const linkavel = o.tipo === "outra" || (o.tipo === "retrabalho" && cod !== RETRABALHO);
              const classe = clsx(
                "grid min-h-[52px] grid-cols-2 items-center gap-x-3.5 gap-y-1.5 px-4 py-2 text-txt shell:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1.2fr)_14px]",
                linkavel && "group transition-colors hover:bg-bg-2",
                i > 0 && "border-t border-subtle",
              );
              const conteudo = (
                <>
                  <span className="min-w-0 leading-tight">
                    <span className="block font-semibold">{tituloOrigem(o, cod)}</span>
                    <span className="block text-sm text-txt-2">{descOrigem(o)}</span>
                  </span>
                  <Avanco valor={o.previsto > 0 ? o.realizado / o.previsto : 0} rotulo={`${num(o.realizado, 1)} de ${num(o.previsto, 1)}`} />
                  <span className="col-span-2 text-sm text-txt shell:col-span-1">
                    <span className="font-mono">{num(o.componentes)}</span> componentes ·{" "}
                    <span className="font-mono">{num(o.pendentes)}</span> pendentes de baixa
                    {avancoFilha.has(o.tarFilho) ? ` · tarefa ${o.tarFilho} com ${pct(avancoFilha.get(o.tarFilho) ?? 0)}` : ""}
                  </span>
                  {linkavel ? (
                    <ChevronRight size={16} aria-hidden="true" className="hidden text-border-med group-hover:text-delp-red shell:block" />
                  ) : (
                    <span className="hidden shell:block" />
                  )}
                </>
              );
              return (
                <li key={o.tarFilho}>
                  {linkavel ? (
                    <Link className={classe} href={`/tarefa/${encodeURIComponent(o.tarFilho)}`}>
                      {conteudo}
                    </Link>
                  ) : (
                    <div className={classe}>{conteudo}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Painel>

      <section aria-labelledby="t-estruturas" className="flex flex-col gap-3">
        <div>
          <h2 id="t-estruturas" className="text-[15px] font-semibold leading-tight text-txt">
            Estruturas por execução
          </h2>
          <p className="mt-1 max-w-[70ch] text-xs leading-snug text-txt-2">
            Abra cada nível até chegar no componente. Cada estrutura mostra o saldo da OP e o que falta apontar.
          </p>
        </div>
        {/* Anatomia da Bancada do Visto, adaptada (design §6.4): a lista de execuções para ao rolar
            logo abaixo do cabeçalho da ficha; a árvore rola com a página. */}
        <div className="flex flex-col gap-4 duascol:grid duascol:grid-cols-[280px_minmax(0,1fr)] duascol:items-start duascol:gap-0 duascol:rounded-card duascol:border duascol:border-subtle duascol:bg-bg duascol:shadow-subtle">
          {comLista && (
            <div
              className="flex flex-col overflow-hidden rounded-card border border-subtle bg-bg shadow-subtle duascol:sticky duascol:rounded-none duascol:rounded-l-card duascol:border-0 duascol:border-r duascol:shadow-none print:static"
              style={{ top: "calc(4rem + var(--cab-ficha, 0px) + 0.75rem)" }}
            >
              <h3 className="border-b border-subtle px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-txt-2">
                Execução · avanço do saldo · pendentes de baixa
              </h3>
              <ul className="max-h-[420px] overflow-y-auto duascol:max-h-[calc(100dvh-4rem-var(--cab-ficha,0px)-6rem)] print:max-h-none" aria-label="Execução">
                {execs.map((e) => (
                  <li key={e.exec}>
                    <Link
                      aria-current={ehAtual(e) ? "true" : undefined}
                      href={link({ exec: e.exec, mostrar })}
                      scroll={false}
                      className={clsx(
                        "grid min-h-11 grid-cols-[1fr_auto] items-center gap-x-2.5 gap-y-1 border-b border-l-4 border-b-subtle py-2 pl-3 pr-4 text-txt transition-colors hover:bg-bg-2",
                        ehAtual(e) ? "border-l-delp-red bg-bg-2" : "border-l-transparent",
                      )}
                    >
                      <b className="font-semibold">{rotuloExec(e.exec)}</b>
                      <span className="font-mono font-bold">{pct(avancoDe(e))}</span>
                      <span className="col-span-2 text-[13px] text-txt-2">
                        <span className="font-mono">{num(e.estruturas)}</span> estr. · <span className="font-mono">{num(e.pendentes)}</span> pend. ·{" "}
                        <span className="font-mono">
                          {num(e.realizado, 1)} de {num(e.previsto, 1)}
                        </span>
                      </span>
                      <Barra valor={avancoDe(e)} cor={COR_ASCENT.avanco} className="col-span-2 h-1.5" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div
            className={clsx(
              "min-w-0 overflow-hidden rounded-card border border-subtle bg-bg shadow-subtle duascol:rounded-none duascol:border-0 duascol:shadow-none",
              !comLista && "duascol:col-span-2",
            )}
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-subtle px-4 py-3">
              {visao === "arvore" ? (
                <p className="flex flex-[1_1_260px] flex-col leading-tight">
                  <span className="text-lg font-bold text-txt">{execAtual ? rotuloExec(execAtual.exec) : "Sem estruturas"}</span>
                  {execAtual && (
                    <span className="text-sm text-txt-2">
                      {pct(avancoDe(execAtual))} do saldo subido ({num(execAtual.realizado, 1)} de {num(execAtual.previsto, 1)}) ·{" "}
                      {num(execAtual.estruturas)} estruturas · {num(execAtual.opsSemSaldo)} OPs sem saldo completo · {num(execAtual.pendentes)}{" "}
                      pendentes de baixa
                      {planosExec.length > 0 &&
                        ` · ${num(planosExec.length)} ${planosExec.length === 1 ? "plano" : "planos"} de corte` +
                          (cortesPendentes > 0
                            ? ` (${num(cortesPendentes)} ${cortesPendentes === 1 ? "OP" : "OPs"} sem corte apontado)`
                            : ", todos cortados")}
                    </span>
                  )}
                </p>
              ) : (
                <p className="flex flex-[1_1_260px] flex-col leading-tight">
                  <span className="text-lg font-bold text-txt">Pendências do código {cod}</span>
                  <span className="text-sm text-txt-2">
                    {num(pendentes)} pendentes de baixa · {num(opsComSaldo)} de {num(opsDistintas.length)} OPs com saldo
                    {listaCompleta.length > MAX_LINHAS_LISTA && ` · mostrando ${num(MAX_LINHAS_LISTA)} de ${num(listaCompleta.length)} linhas`}
                  </span>
                </p>
              )}
              <ControlesTarefa
                visao={visao}
                mostrar={mostrar}
                hrefVisao={{ arvore: link({ exec: execAtual?.exec, mostrar }), lista: link({ visao: "lista", mostrar }) }}
                hrefMostrar={hrefMostrar}
                exportar={exportar}
              />
            </div>

            {visao === "arvore" ? (
              raizes.length === 0 ? (
                <EstadoVazio
                  icone={ListChecks}
                  titulo={`Nada ${mostrar === "sem-saldo" ? "falta subir saldo" : "pendente"} nesta execução`}
                  descricao="Escolha outra execução ou mude o “Mostrar”."
                />
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[620px]">
                    <CabecalhoArvore />
                    {raizes.map((r) => (
                      <NoEstrutura key={r.codEstrutura} no={r} nivel={0} pai={cod} cortes={cortes} />
                    ))}
                  </div>
                </div>
              )
            ) : lista.length === 0 ? (
              <EstadoVazio icone={ListChecks} titulo="Nenhuma pendência neste código com esse filtro" descricao="Mude o “Mostrar” para ver o resto." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-med">
                      <th className={CAB}>Execução</th>
                      <th className={CAB}>Estrutura ou componente</th>
                      <th className={CAB}>OP</th>
                      <th className={CAB}>Saldo</th>
                      <th className={CAB}>Situação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lista.map((l, i) => (
                      <tr key={`${l.exec}-${l.tipo}-${l.codigo}-${i}`} className="border-b border-subtle align-top">
                        <td className="px-3.5 py-2">
                          <b className="font-mono">{l.exec || "–"}</b>
                        </td>
                        <td className="px-3.5 py-2 leading-tight">
                          <span className="block text-sm text-txt-2">
                            {l.tipo === "estrutura" ? "Estrutura" : "Componente"} · <span className="font-mono">{l.codigo}</span>
                          </span>
                          <b className="font-semibold text-txt">{l.nome}</b>
                          {l.tipo === "componente" && (
                            <span className="block font-mono text-sm text-txt-2">
                              Usado {num(l.qtdUsada ?? 0, 3)} {l.unidade} · apontado {num(l.apontado ?? 0, 3)}
                            </span>
                          )}
                        </td>
                        <td className="px-3.5 py-2">
                          <OpsDaEstrutura ops={l.ops} />
                        </td>
                        <td className="whitespace-nowrap px-3.5 py-2 font-mono text-sm">
                          {l.tipo === "estrutura" ? `${num(l.efetivada ?? 0, 2)} de ${num(l.planejada ?? 0, 2)}` : ""}
                        </td>
                        <td className="px-3.5 py-2">
                          <span className="flex flex-col items-start gap-1">
                            {l.tipo === "estrutura" ? (
                              <>
                                <EtiquetaSaldo status={l.status ?? "sem-dado"} />
                                {l.pai && <EtiquetaMaterial pendentes={l.pai.pendentes} linhas={l.pai.linhas} prefixo="No pai:" />}
                              </>
                            ) : (
                              <EtiquetaMaterial pendentes={l.pendentes} linhas={l.linhas} />
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {listaCompleta.length > MAX_LINHAS_LISTA && (
                  <p className="px-4 py-3 text-sm text-txt-2">
                    Mostrando {num(MAX_LINHAS_LISTA)} de {num(listaCompleta.length)} linhas.{" "}
                    <Link
                      href={`/pendencias?tarefa=${encodeURIComponent(cod)}`}
                      className="font-semibold text-txt underline underline-offset-2 hover:text-delp-red"
                    >
                      Ver todos os componentes pendentes em Pendências ›
                    </Link>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
