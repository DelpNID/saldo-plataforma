import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { NoEstrutura, chaveCorte, type Cortes } from "@/components/Arvore";
import { Avanco } from "@/components/Etiquetas";
import { Rodape, Topo } from "@/components/Topo";
import { cargaAtiva, prisma } from "@/lib/db";
import { num, pct } from "@/lib/formato";
import {
  RETRABALHO,
  descricaoCurta,
  montarArvore,
  resumirOrigens,
  planosDaColuna,
  soOQueFalta,
  statusCorte,
  statusSaldo,
  type NoArvore,
  type Origem,
} from "@/lib/regras";

export const dynamic = "force-dynamic";

interface Props {
  params: { cod: string };
  searchParams: { falta?: string; exec?: string };
}

export function generateMetadata({ params }: Props): Metadata {
  return { title: `Tarefa ${decodeURIComponent(params.cod)}` };
}

function tituloOrigem(o: Origem, pai: string): string {
  if (o.tipo === "material") return "Material direto";
  if (o.tipo === "propria") return `Fabricado nesta tarefa (${pai})`;
  if (o.tipo === "retrabalho") return "Retrabalho";
  return `Tarefa ${o.tarFilho}`;
}

function descOrigem(o: Origem): string {
  if (o.tipo === "material") return "Comprados, sem estrutura própria";
  if (o.tipo === "propria") return "Subconjuntos feitos dentro deste código";
  if (o.tipo === "retrabalho") return "Peças que passaram por retrabalho";
  return "Subconjuntos que vêm de outro código de tarefa";
}

export default async function TarefaPage({ params, searchParams }: Props) {
  const cod = decodeURIComponent(params.cod);
  const carga = await cargaAtiva();
  if (!carga) notFound();

  const [tarefa, comps] = await Promise.all([
    prisma.tarefa.findFirst({ where: { cargaId: carga.id, codTarefa: cod } }),
    prisma.componente.findMany({
      where: { cargaId: carga.id, tarPai: cod },
      orderBy: [{ exec: "asc" }, { codEstrutura: "asc" }, { idAtvOrdem: "asc" }],
    }),
  ]);
  if (!tarefa && comps.length === 0) notFound();

  const opsDistintas = [...new Set(comps.map((c) => c.codOrdem))];
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

  const falta = searchParams.falta === "1";
  const execs = montarArvore(comps, (op) => nomeOp.get(op));
  // Só a execução escolhida vai para a tela: a página fica leve mesmo em tarefa com milhares de componentes
  const execAtual = execs.find((e) => e.exec === searchParams.exec) ?? execs.find((e) => e.pendentes > 0 || e.opsSemSaldo > 0) ?? execs[0];
  const raizes = execAtual
    ? falta
      ? execAtual.raizes.map(soOQueFalta).filter((r): r is NoArvore => r !== null)
      : execAtual.raizes
    : [];

  // Planos de corte (CNC e PA/PC) dos materiais da execução aberta
  const paresExec = new Set(
    (execAtual ? comps.filter((c) => c.exec === execAtual.exec && c.cnc) : []).flatMap((c) => planosDaColuna(c.cnc).map((p) => chaveCorte(c.codOrdem, p))),
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

  const linkExec = (exec: string, soFalta: boolean) => {
    const p = new URLSearchParams();
    if (exec) p.set("exec", exec);
    if (soFalta) p.set("falta", "1");
    const s = p.toString();
    return s ? `${base}?${s}` : base;
  };

  const opsComSaldo = new Set(comps.filter((c) => statusSaldo(c.previsto, c.apontado2) === "ok").map((c) => c.codOrdem)).size;
  const pendentes = comps.filter((c) => c.apontado <= 0).length;
  const previsto = tarefa?.qtdPrevisto ?? comps.reduce((s, c) => s + c.previsto, 0);
  const realizado = tarefa?.qtdRealizada ?? comps.reduce((s, c) => s + c.apontado2, 0);
  const avanco = tarefa?.avanco ?? (previsto > 0 ? realizado / previsto : 0);
  const titulo = cod === RETRABALHO ? "Retrabalho" : tarefa ? descricaoCurta(tarefa.descricao) : `Código ${cod}`;
  const base = `/tarefa/${encodeURIComponent(cod)}`;

  return (
    <>
      <Topo ativo="tarefa" projeto={carga.projeto} atualizado={carga.criadaEm} />
      <section className="hero" aria-label="Resumo do código de tarefa">
        <div className="in">
          <Link className="voltar" href="/">‹ Voltar ao painel</Link>
          <span className="kicker">
            {cod === RETRABALHO ? "Fora dos códigos de tarefa" : `Código de tarefa ${cod}`}
            {tarefa?.desenho ? ` · Desenho ${tarefa.desenho}` : ""}
          </span>
          <h1>
            {titulo}
            <em>{pct(avanco)} do saldo subido</em>
          </h1>
          <div className="stats">
            <div className="stat destaque">
              <span className="stat-l">Avanço do saldo</span>
              <span className="stat-v">{pct(avanco)}</span>
              <span className="stat-d">{num(realizado, 1)} de {num(previsto, 1)} previsto</span>
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
                de {num(comps.length)} componentes ·{" "}
                <Link href={`/pendencias?tarefa=${encodeURIComponent(cod)}`}>ver lista</Link>
              </span>
            </div>
          </div>
        </div>
      </section>

      <main className="in">
        <section aria-labelledby="t-origens">
          <div className="section-h">
            <div>
              <h2 id="t-origens">De onde vem o saldo</h2>
              <p>Tarefas filhas deste código, como na aba Árvore. O avanço soma o saldo das OPs onde cada item entra.</p>
            </div>
          </div>
          {origens.length === 0 ? (
            <p className="card vazio">Este código de tarefa não tem componentes na planilha.</p>
          ) : (
            <ul className="origens">
              {origens.map((o) => {
                const conteudo = (
                  <>
                    <span className="origem-t">{tituloOrigem(o, cod)}</span>
                    <span className="origem-d">{descOrigem(o)}</span>
                    <Avanco valor={o.previsto > 0 ? o.realizado / o.previsto : 0} rotulo={`${num(o.realizado, 1)} de ${num(o.previsto, 1)}`} />
                    <span className="origem-d">
                      {num(o.componentes)} componentes · {num(o.pendentes)} pendentes de baixa
                      {avancoFilha.has(o.tarFilho) ? ` · tarefa ${o.tarFilho} com ${pct(avancoFilha.get(o.tarFilho) ?? 0)}` : ""}
                    </span>
                  </>
                );
                const linkavel = o.tipo === "outra" || (o.tipo === "retrabalho" && cod !== RETRABALHO);
                return (
                  <li key={o.tarFilho}>
                    {linkavel ? (
                      <Link className={`origem ${o.tipo}`} href={`/tarefa/${encodeURIComponent(o.tarFilho)}`}>{conteudo}</Link>
                    ) : (
                      <div className={`origem ${o.tipo}`}>{conteudo}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="t-estruturas">
          <div className="section-h">
            <div>
              <h2 id="t-estruturas">Estruturas por execução</h2>
              <p>Abra cada nível até chegar no componente. Cada estrutura mostra o saldo da OP e o que falta apontar.</p>
            </div>
            <div className="chips" role="group" aria-label="O que mostrar">
              <Link className="chip-btn" aria-pressed={!falta} href={linkExec(execAtual?.exec ?? "", false)}>Tudo</Link>
              <Link className="chip-btn" aria-pressed={falta} href={linkExec(execAtual?.exec ?? "", true)}>Só o que falta</Link>
            </div>
          </div>
          {execs.length > 1 && (
            <div className="chips" role="group" aria-label="Execução">
              {execs.map((e) => (
                <Link key={e.exec} className="chip-btn" aria-pressed={e.exec === execAtual?.exec} href={linkExec(e.exec, falta)}>
                  {e.exec ? `Execução ${e.exec}` : "Sem execução"}
                  <span className="n">{e.pendentes > 0 ? `${num(e.pendentes)} pend.` : "ok"}</span>
                </Link>
              ))}
            </div>
          )}
          {execAtual && (
            <div className="card exec">
              <p className="exec-cab">
                {execAtual.exec ? `Execução ${execAtual.exec}` : "Sem execução"}
                <span className="meta">
                  {num(execAtual.estruturas)} estruturas · {num(execAtual.opsSemSaldo)} OPs sem saldo completo · {num(execAtual.pendentes)} pendentes de baixa
                  {planosExec.length > 0 &&
                    ` · ${num(planosExec.length)} ${planosExec.length === 1 ? "plano" : "planos"} de corte` +
                      (cortesPendentes > 0 ? ` (${num(cortesPendentes)} ${cortesPendentes === 1 ? "OP" : "OPs"} sem corte apontado)` : ", todos cortados")}
                </span>
              </p>
              <div className="exec-corpo">
                {raizes.length === 0 ? (
                  <p className="vazio">Nada pendente nesta execução.</p>
                ) : (
                  raizes.map((r) => <NoEstrutura key={r.codEstrutura} no={r} nivel={0} pai={cod} cortes={cortes} />)
                )}
              </div>
            </div>
          )}
        </section>
      </main>
      <Rodape arquivo={carga.arquivo} />
    </>
  );
}
