import { Upload } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import { BuscaGestao } from "@/components/BuscaGestao";
import { GraficoEvolucao, type PontoGrafico } from "@/components/GraficoEvolucao";
import { Avanco, BarrasSaldo, FaixaSituacao, LinhaFabric, faltaFabric } from "@/components/Etiquetas";
import { CodigosCobrar, type LinhaCobrar } from "@/components/gestao/CodigosCobrar";
import { BarrasLista, FaixaPartes } from "@/components/gestao/Graficos";
import { SaldoPorMes, type MesGrafico } from "@/components/gestao/SaldoPorMes";
import { EstadoVazio } from "@/components/layout/EstadoVazio";
import { Painel } from "@/components/layout/Painel";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { TileIndicador } from "@/components/ui/TileIndicador";
import { COR_ASCENT, ESCALA_VERMELHOS, SELO_TOM } from "@/lib/cores";
import { cargaAtiva, prisma } from "@/lib/db";
import { dataCurta, num, pct, quando } from "@/lib/formato";
import { dadosGestor, faltaParaFabricacao, nomeMes, rankingTags, seriePorMes } from "@/lib/gestor";
import { avancoDe, fabricDe, garantirHistorico, ritmoSaldo, serieDiaria } from "@/lib/kpis";
import { compararCodigo, descricaoCurta, grupoTarefa } from "@/lib/regras";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Gestão (prévia)" };

const DIAS_GRAFICO = 30;

type Variacao = { texto: string; sentido: -1 | 0 | 1; subirEhBom?: boolean };

/** Variação escrita: seta + texto; a cor só reforça (melhorou ou piorou). */
function variacao(valor: number | null, unidade: "pp" | "n", melhorSeSobe: boolean, desde?: string): Variacao {
  if (valor === null || !desde) return { texto: "sem comparação ainda", sentido: 0 };
  const zero = unidade === "pp" ? Math.abs(valor) < 0.05 : valor === 0;
  if (zero) return { texto: `sem mudança desde ${desde}`, sentido: 0 };
  const sobe = valor > 0;
  const texto = unidade === "pp" ? `${num(Math.abs(valor), 1)} p.p.` : num(Math.abs(valor));
  return { texto: `${sobe ? "+" : "−"}${texto} desde ${desde}`, sentido: sobe ? 1 : -1, subirEhBom: melhorSeSobe };
}

function VariacaoNaLinha({ v }: { v: Variacao }) {
  const cor = v.sentido === 0 || v.subirEhBom === undefined ? "text-txt-2" : v.sentido > 0 === v.subirEhBom ? SELO_TOM.success : SELO_TOM.danger;
  return (
    <span className={`font-semibold ${cor}`}>
      {v.sentido > 0 ? "▲ " : v.sentido < 0 ? "▼ " : "= "}
      {v.texto}
    </span>
  );
}

/** Um número grande do bloco de leitura rápida. */
function Destaque({ rotulo, valor, detalhe, alerta }: { rotulo: string; valor: string; detalhe: string; alerta?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-btn border border-subtle bg-bg-2 px-3 py-2.5">
      <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-txt-2">{rotulo}</span>
      <b className={`font-mono text-[26px] font-bold leading-tight ${alerta ? "text-delp-red" : "text-txt"}`}>{valor}</b>
      <span className="text-xs text-txt-2">{detalhe}</span>
    </div>
  );
}

/** As situações da RA (coluna SITUACAO_RA) e o filtro de Pendências de cada uma. */
const RA_NA_TELA: Record<string, { explica: string; filtro: string }> = {
  "RA Pendente": { explica: "a RA ainda está pendente", filtro: "pendente" },
  "RA gerada": { explica: "RA gerada e o componente ainda sem baixa", filtro: "gerada" },
  "Subconjunto (sem RA)": { explica: "subconjunto: não leva RA", filtro: "subconjunto" },
  "Plano sem RA": { explica: "plano de corte sem RA", filtro: "plano" },
};

export default async function Gestao({ searchParams }: { searchParams: { q?: string } }) {
  const carga = await cargaAtiva();
  if (!carga) {
    return (
      <div className="rounded-card border border-subtle bg-bg shadow-subtle">
        <h1 className="sr-only">Gestão do saldo</h1>
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

  const atual = await garantirHistorico(prisma, carga.id);
  // A carga anterior (reserva) também entra no histórico, para a evolução já começar com dois pontos
  const reservas = await prisma.carga.findMany({ where: { ativa: false, projeto: carga.projeto }, select: { id: true } });
  for (const r of reservas) {
    await garantirHistorico(prisma, r.id).catch((e: unknown) => console.error(`[gestao] não consegui registrar o histórico da carga ${r.id}`, e));
  }
  const [historico, tarefas, gestor] = await Promise.all([
    prisma.historico.findMany({ where: { projeto: carga.projeto }, orderBy: { criadoEm: "asc" } }),
    prisma.tarefa.findMany({
      where: { cargaId: carga.id },
      select: {
        codTarefa: true,
        descricao: true,
        desenho: true,
        avanco: true,
        avancoFabric: true,
        qtdPrevisto: true,
        qtdRealizada: true,
        pendMaterial: true,
        totalComp: true,
        execucoes: true,
        execPend: true,
      },
    }),
    dadosGestor(prisma, carga.id),
  ]);

  // ---------- Leitura rápida ----------
  const avanco = avancoDe(atual);
  const fabric = carga.comFabric ? fabricDe({ previsto: carga.totalPrevisto, esperado: carga.totalEsperado }) : null;
  const ritmo = fabric !== null ? ritmoSaldo(avanco, fabric) : null;
  const faltaFab = fabric !== null ? faltaFabric(fabric, carga.totalPrevisto, carga.totalRealizado) : 0;
  const veredito: { tom: BadgeTone; texto: string } =
    ritmo === null
      ? { tom: "neutral", texto: "Planilha sem % de fabricação" }
      : ritmo.ritmo === "atraso"
        ? { tom: "danger", texto: "Saldo atrasado" }
        : ritmo.ritmo === "a-frente"
          ? { tom: "success", texto: "Saldo à frente da fabricação" }
          : { tom: "success", texto: "Saldo acompanha a fabricação" };

  const serie = serieDiaria(historico).slice(-DIAS_GRAFICO);
  const anteriores = serie.filter((p) => p.dataRef < atual.dataRef);
  const ontem = anteriores[anteriores.length - 1];
  const limite7 = new Date(new Date(`${atual.dataRef}T12:00:00Z`).getTime() - 7 * 86400000).toISOString().slice(0, 10);
  const semana = [...anteriores].reverse().find((p) => p.dataRef <= limite7);
  const desdeOntem = ontem && dataCurta(ontem.dataRef).slice(0, 5);
  const pontos: PontoGrafico[] = serie.map((p) => ({
    data: dataCurta(p.dataRef).slice(0, 5),
    avanco: avancoDe(p),
    realizado: p.realizado,
    previsto: p.previsto,
    pendentes: p.pendentes,
  }));
  const meses: MesGrafico[] = seriePorMes(historico).map((m) => ({
    mes: m.mes,
    ...nomeMes(m.mes),
    dia: dataCurta(m.dataRef).slice(0, 5),
    previsto: m.previsto,
    realizado: m.realizado,
    fabric: m.esperado !== null && m.previsto > 0 ? m.esperado / m.previsto : null,
  }));

  const falta = (t: { qtdRealizada: number; qtdPrevisto: number; avancoFabric: number }) =>
    faltaParaFabricacao({ realizado: t.qtdRealizada, esperado: t.avancoFabric * t.qtdPrevisto });
  const codigosAtras = carga.comFabric ? tarefas.filter((t) => falta(t) > 0).length : 0;

  // ---------- Por que está atrasado ----------
  const { etapas, pendenciasRa, porCodigo } = gestor;
  const totalPendentes = pendenciasRa.reduce((s, r) => s + r.pendentes, 0);
  const raPendente = pendenciasRa.find((r) => r.situacao === "RA Pendente")?.pendentes ?? 0;

  // ---------- O que cobrar ----------
  const cobrar: LinhaCobrar[] = tarefas.map((t) => {
    const c = porCodigo.get(t.codTarefa);
    return {
      cod: t.codTarefa,
      descricao: descricaoCurta(t.descricao),
      desenho: t.desenho,
      avanco: t.avanco,
      fabric: carga.comFabric ? t.avancoFabric : null,
      previsto: t.qtdPrevisto,
      realizado: t.qtdRealizada,
      falta: carga.comFabric ? falta(t) : 0,
      pendentes: t.pendMaterial,
      totalComp: t.totalComp,
      raPendente: c?.raPendente ?? 0,
      opsFabSemSaldo: c?.opsFabricadasSemSaldo ?? 0,
    };
  });

  // ---------- Desdobramento ----------
  const tags = rankingTags(gestor.tags, 10);
  const todasTags = [...gestor.tags].filter((t) => t.tag !== "").sort((a, b) => faltaParaFabricacao(b) - faltaParaFabricacao(a));
  const grupos = new Map<string, { previsto: number; realizado: number; esperado: number; codigos: number }>();
  for (const t of tarefas) {
    const g = grupos.get(grupoTarefa(t.codTarefa)) ?? { previsto: 0, realizado: 0, esperado: 0, codigos: 0 };
    g.previsto += t.qtdPrevisto;
    g.realizado += t.qtdRealizada;
    g.esperado += t.avancoFabric * t.qtdPrevisto;
    g.codigos += 1;
    grupos.set(grupoTarefa(t.codTarefa), g);
  }
  const porGrupo = [...grupos.entries()].sort((a, b) => compararCodigo(a[0].replace(".xx", ""), b[0].replace(".xx", "")));

  return (
    <div className="flex flex-col gap-4">
      {/* A trilha do topo nomeia a tela; o título fica para leitor de tela (regra do Visto). */}
      <h1 className="sr-only">Gestão do saldo · {carga.projeto}</h1>

      <BuscaGestao
        comFabric={carga.comFabric}
        inicial={(searchParams.q ?? "").slice(0, 80)}
        codigos={tarefas
          .map((t) => ({
            cod: t.codTarefa,
            descricao: descricaoCurta(t.descricao),
            desenho: t.desenho,
            tags: porCodigo.get(t.codTarefa)?.tags ?? "",
            previsto: t.qtdPrevisto,
            realizado: t.qtdRealizada,
            avanco: t.avanco,
            pendentes: t.pendMaterial,
            componentes: t.totalComp,
            execucoes: t.execucoes,
            execPend: t.execPend,
            fabric: t.avancoFabric,
          }))
          .sort((a, b) => compararCodigo(a.cod, b.cod))}
      />

      {/* 1. Leitura rápida: está ruim ou não, e quanto */}
      <section aria-label="Leitura rápida" className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <Painel titulo={`Saldo × fabricação · ${carga.projeto}`} apoio="Fabricação = guias com 100% (% AVANÇO FABRIC): o saldo que já deveria ter subido.">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <Badge tone={veredito.tom}>{veredito.texto}</Badge>
              <span className="text-xs text-txt-2">
                Atualizado em <span className="font-mono">{quando(carga.criadaEm)}</span>
              </span>
            </div>
            {fabric !== null && ritmo !== null && (
              <p className="text-[15px] leading-snug text-txt">
                {ritmo.ritmo === "atraso" ? (
                  <>
                    O saldo está <b className="text-delp-red">{num(ritmo.pp, 1)} p.p. atrás</b> da fabricação: as guias já fecharam{" "}
                    <b className="font-mono">{pct(fabric)}</b> do previsto e o saldo subido é <b className="font-mono">{pct(avanco)}</b>.
                  </>
                ) : (
                  <>
                    O saldo subido (<b className="font-mono">{pct(avanco)}</b>) acompanha a fabricação (<b className="font-mono">{pct(fabric)}</b>).
                  </>
                )}
              </p>
            )}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <Destaque rotulo="Saldo subido" valor={pct(avanco)} detalhe={`${num(atual.realizado, 1)} de ${num(atual.previsto, 1)}`} />
              {fabric !== null && <Destaque rotulo="Fabricação" valor={pct(fabric)} detalhe={`${num(carga.totalEsperado, 1)} já deveria ter subido`} />}
              {fabric !== null && ritmo !== null && (
                <Destaque
                  rotulo="Atrás da fabricação"
                  valor={ritmo.ritmo === "atraso" ? `${num(ritmo.pp, 1)} p.p.` : "0 p.p."}
                  detalhe={`faltam ${num(faltaFab, 1)} para acompanhar`}
                  alerta={ritmo.ritmo === "atraso"}
                />
              )}
            </div>
            <div className="flex flex-col gap-1">
              <BarrasSaldo saldo={avanco} fabric={fabric} altura="h-2.5" />
              {fabric !== null && <LinhaFabric saldo={avanco} fabric={fabric} />}
            </div>
            <p className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-txt-2">
              <span>
                Desde o dia anterior: <VariacaoNaLinha v={variacao(ontem ? (avanco - avancoDe(ontem)) * 100 : null, "pp", true, desdeOntem)} />
              </span>
              {semana && (
                <span>
                  Em 7 dias: <VariacaoNaLinha v={variacao((avanco - avancoDe(semana)) * 100, "pp", true, dataCurta(semana.dataRef).slice(0, 5))} />
                </span>
              )}
            </p>
            <div className="flex flex-col gap-2 border-t border-subtle pt-3">
              <p className="text-sm text-txt">
                <b>Códigos de tarefa</b>
                {carga.comFabric && (
                  <>
                    {" "}
                    · <b className="font-mono text-delp-red">{num(codigosAtras)}</b> de <span className="font-mono">{num(tarefas.length)}</span> estão atrás da
                    fabricação
                  </>
                )}
              </p>
              <FaixaSituacao semAvanco={atual.semAvanco} andamento={atual.andamento} concluidas={atual.concluidas} />
            </div>
          </div>
        </Painel>

        <Painel titulo="Saldo do mês" apoio="Saldo subido × pendente do projeto, na última atualização de cada mês.">
          <SaldoPorMes meses={meses} desde={dataCurta(historico[0]?.dataRef ?? atual.dataRef).slice(0, 5)} />
        </Painel>
      </section>

      <section aria-label="Indicadores" className="grade-indicadores fluida">
        <TileIndicador
          variante="painel"
          rotulo="Pendentes de baixa"
          valor={num(atual.pendentes)}
          variacaoTexto={variacao(ontem ? atual.pendentes - ontem.pendentes : null, "n", false, desdeOntem)}
          detalhe={`de ${num(atual.componentes)} componentes`}
        />
        <TileIndicador variante="painel" rotulo="RA pendente" valor={num(raPendente)} detalhe="componentes pendentes de baixa com a RA pendente" />
        <TileIndicador
          variante="painel"
          rotulo="OPs fabricadas sem saldo"
          valor={num(etapas.fabricadasSemSaldo)}
          detalhe="todas as atividades apontadas e o saldo não efetivado"
        />
        <TileIndicador variante="painel" rotulo="Execuções pendentes" valor={num(atual.execPend, 1)} detalhe={`de ${num(atual.execucoes)} execuções`} />
        <TileIndicador
          variante="painel"
          rotulo="Cortes apontados"
          valor={num(atual.cortesApontados)}
          detalhe={`de ${num(atual.planos)} OPs em plano CNC/PA · ${pct(atual.planos > 0 ? atual.cortesApontados / atual.planos : 0)}`}
        />
      </section>

      {/* 2. Por que está atrasado */}
      <section aria-label="Por que o saldo está atrasado" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Painel
          titulo="Em que etapa estão as OPs"
          apoio="Cada OP dos componentes numa etapa só. Saldo efetivado = QTDE EFETIVADA ≥ PLANEJADA; as atividades vêm da aba Dados."
        >
          <div className="flex flex-col gap-3">
            {etapas.fabricadasSemSaldo > 0 && (
              <p className="rounded-btn border-l-4 border-delp-red bg-bg-2 px-3.5 py-2.5 text-sm text-txt">
                <b className="font-mono">{num(etapas.fabricadasSemSaldo)}</b> OPs já têm todas as atividades apontadas e o saldo ainda não foi efetivado.
              </p>
            )}
            <FaixaPartes
              total={etapas.total}
              rotuloTotal="OPs dos componentes"
              partes={[
                {
                  rotulo: "Fabricadas sem saldo",
                  explica: "todas as atividades apontadas; saldo não efetivado",
                  n: etapas.fabricadasSemSaldo,
                  cor: ESCALA_VERMELHOS[6],
                  destaque: true,
                },
                { rotulo: "Não iniciadas", explica: "nenhuma atividade apontada", n: etapas.naoIniciadas, cor: ESCALA_VERMELHOS[4] },
                { rotulo: "Em fabricação", explica: "parte das atividades apontada", n: etapas.emFabricacao, cor: "rgb(var(--border-med))" },
                { rotulo: "Com saldo efetivado", n: etapas.comSaldo, cor: ESCALA_VERMELHOS[2] },
                ...(etapas.semAtividade > 0
                  ? [{ rotulo: "Fora da aba Dados", explica: "OP sem atividades na planilha", n: etapas.semAtividade, cor: "rgb(var(--bg-3))" }]
                  : []),
              ]}
            />
          </div>
        </Painel>

        <Painel
          titulo="Pendentes de baixa por situação da RA"
          apoio={`${num(totalPendentes)} componentes com APONTADO = 0. Toque numa situação para abrir a lista.`}
          acao={{ rotulo: "Pendências", href: "/pendencias" }}
        >
          <BarrasLista
            total={totalPendentes}
            itens={pendenciasRa
              .filter((r) => r.pendentes > 0)
              .map((r) => ({
                rotulo: r.situacao || "Sem situação da RA",
                explica: RA_NA_TELA[r.situacao]?.explica,
                n: r.pendentes,
                href: RA_NA_TELA[r.situacao] ? `/pendencias?ra=${RA_NA_TELA[r.situacao].filtro}` : undefined,
              }))}
          />
        </Painel>
      </section>

      {/* 3. O que cobrar */}
      <Painel titulo="Códigos de tarefa para cobrar" apoio="O que mais pesa em cada leitura. Os números saem das mesmas regras do Painel.">
        <CodigosCobrar linhas={cobrar} comFabric={carga.comFabric} />
      </Painel>

      {/* 4. Desdobramento: TAG, evolução e grupos */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start">
        <Painel
          titulo={carga.comFabric ? "Saldo × fabricação por TAG" : "Saldo por TAG"}
          apoio={
            carga.comFabric
              ? `As ${tags.top.length} TAGs mais atrás da fabricação (${num(tags.atrasadas)} de ${num(tags.comTag)} estão atrás). Soma dos componentes das OPs de cada TAG.`
              : "Soma dos componentes das OPs de cada TAG."
          }
        >
          <ol className="flex flex-col">
            {tags.top.map((t) => {
              const s = t.previsto > 0 ? t.realizado / t.previsto : 0;
              const f = carga.comFabric && t.previsto > 0 ? t.esperado / t.previsto : null;
              return (
                <li key={t.tag} className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-x-3 gap-y-1.5 border-t border-subtle py-2.5 first:border-t-0">
                  <b className="min-w-0 break-words font-mono text-sm font-bold text-txt">{t.tag}</b>
                  {f !== null && (
                    <span className="text-xs text-txt-2">
                      faltam <b className="font-mono text-txt">{num(faltaParaFabricacao(t), 1)}</b>
                    </span>
                  )}
                  <span className="col-span-2">
                    <Avanco valor={s} fabric={f} rotulo={`${num(t.realizado, 1)} de ${num(t.previsto, 1)} · ${num(t.ops)} OPs`} />
                  </span>
                </li>
              );
            })}
          </ol>
          {tags.semTag && tags.semTag.previsto > 0 && (
            <p className="mt-2 rounded-btn bg-bg-2 px-3.5 py-2.5 text-xs text-txt">
              <b>Sem TAG:</b> <span className="font-mono">{num(tags.semTag.previsto, 1)}</span> do previsto (
              <span className="font-mono">{pct(carga.totalPrevisto > 0 ? tags.semTag.previsto / carga.totalPrevisto : 0)}</span>) está em{" "}
              <span className="font-mono">{num(tags.semTag.ops)}</span> OPs sem TAG na aba Dados ou fora dela, com{" "}
              <span className="font-mono">{pct(tags.semTag.previsto > 0 ? tags.semTag.realizado / tags.semTag.previsto : 0)}</span> do saldo subido.
            </p>
          )}
          <details className="mt-2 text-sm">
            <summary className="min-h-11 cursor-pointer py-2 font-semibold text-txt hover:text-delp-red">Ver todas as {num(todasTags.length)} TAGs</summary>
            <div className="max-h-96 overflow-auto rounded-btn border border-subtle">
              <table className="w-full text-left text-[13px]">
                <thead className="sticky top-0 bg-bg-2">
                  <tr className="text-[11px] uppercase tracking-[0.08em] text-txt-muted">
                    <th className="px-2.5 py-2 font-semibold">TAG</th>
                    <th className="px-2.5 py-2 text-right font-semibold">Saldo</th>
                    {carga.comFabric && <th className="px-2.5 py-2 text-right font-semibold">Fabric.</th>}
                    {carga.comFabric && <th className="px-2.5 py-2 text-right font-semibold">Faltam</th>}
                    <th className="px-2.5 py-2 text-right font-semibold">OPs</th>
                  </tr>
                </thead>
                <tbody>
                  {todasTags.map((t) => (
                    <tr key={t.tag} className="border-t border-subtle">
                      <td className="break-words px-2.5 py-1.5 font-mono">{t.tag}</td>
                      <td className="px-2.5 py-1.5 text-right font-mono">{pct(t.previsto > 0 ? t.realizado / t.previsto : 0)}</td>
                      {carga.comFabric && <td className="px-2.5 py-1.5 text-right font-mono">{pct(t.previsto > 0 ? t.esperado / t.previsto : 0)}</td>}
                      {carga.comFabric && <td className="px-2.5 py-1.5 text-right font-mono">{num(faltaParaFabricacao(t), 1)}</td>}
                      <td className="px-2.5 py-1.5 text-right font-mono">{num(t.ops)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </Painel>

        <div className="flex min-w-0 flex-col gap-4">
          <Painel titulo="Evolução do avanço" apoio={`Última carga de cada dia, até ${DIAS_GRAFICO} dias. Toque na linha para ver o dia.`}>
            <GraficoEvolucao pontos={pontos} />
          </Painel>

          <Painel titulo="Avanço por grupo de código">
            <ul className="flex flex-col gap-3">
              {porGrupo.map(([g, v]) => (
                <li key={g} className="grid grid-cols-[3rem_minmax(0,1fr)] items-start gap-x-2.5">
                  <b className="pt-0.5 font-mono font-bold text-txt">{g}</b>
                  <Avanco
                    valor={avancoDe(v)}
                    fabric={fabric !== null && v.previsto > 0 ? fabricDe(v) : null}
                    rotulo={`${num(v.realizado, 1)} de ${num(v.previsto, 1)} · ${num(v.codigos)} códigos`}
                  />
                </li>
              ))}
            </ul>
          </Painel>
        </div>
      </div>

      <p className="text-center text-sm text-txt-2">
        Fonte: {carga.arquivo} · centro de custo <span className="font-mono">{carga.centroCusto}</span>.{" "}
        <Link href="/" className="font-semibold text-txt underline underline-offset-2 hover:text-delp-red">
          Abrir o Painel completo
        </Link>
      </p>
    </div>
  );
}
