import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Copiar, type Celula } from "@/components/Acoes";
import { CabecalhoArvore, NoEstrutura, OpsDaEstrutura, chaveCorte, type Cortes } from "@/components/Arvore";
import { ControlesTarefa, TrocaCodigo } from "@/components/ControlesTarefa";
import { Avanco, Comparacao, EtiquetaMaterial, EtiquetaSaldo, EtiquetaSituacao } from "@/components/Etiquetas";
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

  return (
    <div className="legado">
      <div className="fixo com-borda topo-fixo">
        <div className="in cab-pagina compacto">
          <span className="kicker">
            {cod === RETRABALHO ? "Fora dos códigos de tarefa" : `Código de tarefa ${cod}`}
            {tarefa?.desenho ? ` · Desenho ${tarefa.desenho}` : ""}
          </span>
          <div className="titulo">
            <h1>{titulo}</h1>
            <EtiquetaSituacao avanco={avanco} />
            <span className="resumo">
              {pct(avanco)} do saldo subido{fabric !== null ? ` · fabricação ${pct(fabric)}` : ""}
            </span>
          </div>
        </div>
      </div>

      <div className="in pagina">
        <TrocaCodigo anterior={anterior} proximo={proximo} codigos={[...codigos, RETRABALHO]} />

        <section aria-label="Resumo do código de tarefa">
          <div className="stats">
            <div className="stat destaque">
              <span className="stat-l">{fabric !== null ? "Avanço do saldo × fabricação" : "Avanço do saldo"}</span>
              <span className="stat-v">{pct(avanco)}</span>
              {fabric !== null ? (
                <Comparacao saldo={avanco} fabric={fabric} previsto={previsto} realizado={realizado} />
              ) : (
                <span className="barra" role="presentation">
                  <span className={avanco >= 0.9999 ? "concluida" : undefined} style={{ width: `${Math.min(1, avanco) * 100}%` }} />
                </span>
              )}
              <span className="stat-d">
                {num(realizado, 1)} de {num(previsto, 1)} previsto
              </span>
            </div>
            <div className="stat">
              <span className="stat-l">Execuções</span>
              <span className="stat-v">{num(tarefa?.execucoes ?? execs.length)}</span>
              <span className="stat-d">{tarefa ? `${num(tarefa.execPend, 1)} pendentes` : "sem linha no Resumo Geral"}</span>
            </div>
            <div className="stat">
              <span className="stat-l">OPs com saldo</span>
              <span className="stat-v">{num(opsComSaldo)}</span>
              <span className="stat-d">de {num(opsDistintas.length)} OPs</span>
            </div>
            <div className="stat">
              <span className="stat-l">Pendentes de baixa</span>
              <span className="stat-v">{num(pendentes)}</span>
              <span className="stat-d">
                de {num(comps.length)} componentes · <Link href={`/pendencias?tarefa=${encodeURIComponent(cod)}`}>ver lista</Link>
              </span>
              {temRa && (
                <span className="stat-ra" aria-label="Situação da RA dos componentes">
                  <span>
                    RA pendente <b>{num(ra["RA Pendente"] ?? 0)}</b> · RA gerada <b>{num(ra["RA gerada"] ?? 0)}</b>
                  </span>
                  <small>
                    {num(ra["Subconjunto (sem RA)"] ?? 0)} subconjunto (sem RA) · {num(ra["Plano sem RA"] ?? 0)} plano sem RA
                    {outrasRa > 0 ? ` · ${num(outrasRa)} sem situação` : ""}
                  </small>
                </span>
              )}
            </div>
          </div>
        </section>

        <section aria-labelledby="t-origens">
          <div className="section-h">
            <h2 id="t-origens">De onde vem o saldo</h2>
            <p>Tarefas filhas deste código, como na aba Árvore. O avanço soma o saldo das OPs onde cada item entra.</p>
          </div>
          {origens.length === 0 ? (
            <div className="card vazio">
              <b>Este código de tarefa não tem componentes na planilha</b>
            </div>
          ) : (
            <ul className="origem-lista card">
              {origens.map((o) => {
                const linkavel = o.tipo === "outra" || (o.tipo === "retrabalho" && cod !== RETRABALHO);
                const conteudo = (
                  <>
                    <span>
                      <span className="origem-t">{tituloOrigem(o, cod)}</span>
                      <span className="origem-d">{descOrigem(o)}</span>
                    </span>
                    <Avanco valor={o.previsto > 0 ? o.realizado / o.previsto : 0} rotulo={`${num(o.realizado, 1)} de ${num(o.previsto, 1)}`} />
                    <span className="origem-n">
                      {num(o.componentes)} componentes · {num(o.pendentes)} pendentes de baixa
                      {avancoFilha.has(o.tarFilho) ? ` · tarefa ${o.tarFilho} com ${pct(avancoFilha.get(o.tarFilho) ?? 0)}` : ""}
                    </span>
                    <span className="seta" aria-hidden="true">
                      {linkavel ? "›" : ""}
                    </span>
                  </>
                );
                return (
                  <li key={o.tarFilho}>
                    {linkavel ? (
                      <Link className={`origem-linha ${o.tipo}`} href={`/tarefa/${encodeURIComponent(o.tarFilho)}`}>
                        {conteudo}
                      </Link>
                    ) : (
                      <div className={`origem-linha ${o.tipo}`}>{conteudo}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="t-estruturas">
          <div className="section-h">
            <h2 id="t-estruturas">Estruturas por execução</h2>
            <p>Abra cada nível até chegar no componente. Cada estrutura mostra o saldo da OP e o que falta apontar.</p>
          </div>
          <div className="exec-grade">
            {visao === "arvore" && execs.length > 0 && (
              <div className="card exec-painel">
                <h3>Execução · avanço do saldo · pendentes de baixa</h3>
                <ul className="exec-lista" aria-label="Execução">
                  {execs.map((e) => (
                    <li key={e.exec}>
                      <Link
                        className="exec-linha"
                        aria-current={e.exec === execAtual?.exec ? "true" : undefined}
                        href={link({ exec: e.exec, mostrar })}
                        scroll={false}
                      >
                        <b>{rotuloExec(e.exec)}</b>
                        <span className="exec-pct">{pct(avancoDe(e))}</span>
                        <span className="exec-meta">
                          {num(e.estruturas)} estr. · {num(e.pendentes)} pend. · {num(e.realizado, 1)} de {num(e.previsto, 1)}
                        </span>
                        <span className="barra" role="presentation">
                          <span className={avancoDe(e) >= 0.9999 ? "concluida" : undefined} style={{ width: `${Math.min(1, avancoDe(e)) * 100}%` }} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="card exec">
              <div className="ferramentas">
                {visao === "arvore" ? (
                  <p className="exec-cab">
                    {execAtual ? rotuloExec(execAtual.exec) : "Sem estruturas"}
                    {execAtual && (
                      <span className="meta">
                        {pct(avancoDe(execAtual))} do saldo subido ({num(execAtual.realizado, 1)} de {num(execAtual.previsto, 1)}) · {num(execAtual.estruturas)}{" "}
                        estruturas · {num(execAtual.opsSemSaldo)} OPs sem saldo completo · {num(execAtual.pendentes)} pendentes de baixa
                        {planosExec.length > 0 &&
                          ` · ${num(planosExec.length)} ${planosExec.length === 1 ? "plano" : "planos"} de corte` +
                            (cortesPendentes > 0
                              ? ` (${num(cortesPendentes)} ${cortesPendentes === 1 ? "OP" : "OPs"} sem corte apontado)`
                              : ", todos cortados")}
                      </span>
                    )}
                  </p>
                ) : (
                  <p className="exec-cab">
                    Pendências do código {cod}
                    <span className="meta">
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
                  <div className="vazio">
                    <b>Nada {mostrar === "sem-saldo" ? "falta subir saldo" : "pendente"} nesta execução</b>
                    <span>Escolha outra execução ou mude o “Mostrar”.</span>
                  </div>
                ) : (
                  <div className="arvore">
                    <div>
                      <CabecalhoArvore />
                      {raizes.map((r) => (
                        <NoEstrutura key={r.codEstrutura} no={r} nivel={0} pai={cod} cortes={cortes} />
                      ))}
                    </div>
                  </div>
                )
              ) : lista.length === 0 ? (
                <div className="vazio">
                  <b>Nenhuma pendência neste código com esse filtro</b>
                  <span>Mude o “Mostrar” para ver o resto.</span>
                </div>
              ) : (
                <div className="tab-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Execução</th>
                        <th>Estrutura ou componente</th>
                        <th>OP</th>
                        <th>Saldo</th>
                        <th>Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lista.map((l, i) => (
                        <tr key={`${l.exec}-${l.tipo}-${l.codigo}-${i}`}>
                          <td>
                            <b>{l.exec || "–"}</b>
                          </td>
                          <td>
                            <span className="pend-est">
                              {l.tipo === "estrutura" ? "Estrutura" : "Componente"} · <span className="mono">{l.codigo}</span>
                            </span>
                            <b>{l.nome}</b>
                            {l.tipo === "componente" && (
                              <span className="pend-est mono">
                                Usado {num(l.qtdUsada ?? 0, 3)} {l.unidade} · apontado {num(l.apontado ?? 0, 3)}
                              </span>
                            )}
                          </td>
                          <td>
                            <OpsDaEstrutura ops={l.ops} />
                          </td>
                          <td>{l.tipo === "estrutura" ? `${num(l.efetivada ?? 0, 2)} de ${num(l.planejada ?? 0, 2)}` : ""}</td>
                          <td>
                            <span className="no-sit">
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
                    <p className="nota lista-mais">
                      Mostrando {num(MAX_LINHAS_LISTA)} de {num(listaCompleta.length)} linhas.{" "}
                      <Link href={`/pendencias?tarefa=${encodeURIComponent(cod)}`}>Ver todos os componentes pendentes em Pendências ›</Link>
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
