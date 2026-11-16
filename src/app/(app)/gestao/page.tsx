import { Upload } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BuscaGestao } from "@/components/BuscaGestao";
import { GraficoEvolucao, type PontoGrafico } from "@/components/GraficoEvolucao";
import { Barra, Comparacao, EtiquetaSituacao, TextoRitmo } from "@/components/Etiquetas";
import { EstadoVazio } from "@/components/layout/EstadoVazio";
import { Painel } from "@/components/layout/Painel";
import { Badge } from "@/components/ui/Badge";
import { buttonVariants } from "@/components/ui/Button";
import { TileIndicador } from "@/components/ui/TileIndicador";
import { COR_ASCENT, SELO_TOM, TOM_DA_CLASSE } from "@/lib/cores";
import { cargaAtiva, prisma } from "@/lib/db";
import { dataCurta, num, pct, quando } from "@/lib/formato";
import { atrasoQtd, avancoDe, fabricDe, garantirHistorico, serieDiaria } from "@/lib/kpis";
import { compararCodigo, descricaoCurta, grupoTarefa } from "@/lib/regras";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Gestão" };

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

/** A mesma variação dentro de uma frase ("Em 7 dias: ▲ +2,1 p.p. desde 09/11"). */
function VariacaoNaLinha({ v }: { v: Variacao }) {
  const cor = v.sentido === 0 || v.subirEhBom === undefined ? "text-txt-2" : (v.sentido > 0) === v.subirEhBom ? SELO_TOM.success : SELO_TOM.danger;
  return (
    <span className={`font-semibold ${cor}`}>
      {v.sentido > 0 ? "▲ " : v.sentido < 0 ? "▼ " : "= "}
      {v.texto}
    </span>
  );
}

/** Uma linha das listas "maior atraso / maior saldo / mais pendentes": leva ao código de tarefa. */
function ItemTop({ cod, descricao, meta, selo, percentual }: { cod: string; descricao: string; meta: ReactNode; selo: ReactNode; percentual: string }) {
  return (
    <li className="border-t border-subtle first:border-t-0">
      <Link
        href={`/tarefa/${encodeURIComponent(cod)}`}
        className="grid min-h-11 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-1 py-2.5 text-txt transition-colors hover:bg-bg-2"
      >
        <span className="col-span-2 break-words text-[15px] leading-snug">
          <b className="font-mono font-bold">{cod}</b> {descricao}
        </span>
        <span className="text-sm text-txt">{meta}</span>
        <span className="justify-self-end">{selo}</span>
        <span className="col-span-2 font-mono text-[13px] text-txt-2">{percentual}</span>
      </Link>
    </li>
  );
}

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
  const [historico, tarefas] = await Promise.all([
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
  ]);

  // Série: última carga de cada dia. Comparações: o dia anterior com carga e o ponto de ~7 dias atrás.
  const serie = serieDiaria(historico).slice(-DIAS_GRAFICO);
  const anteriores = serie.filter((p) => p.dataRef < atual.dataRef);
  const ontem = anteriores[anteriores.length - 1];
  const limite7 = new Date(new Date(`${atual.dataRef}T12:00:00Z`).getTime() - 7 * 86400000).toISOString().slice(0, 10);
  const semana = [...anteriores].reverse().find((p) => p.dataRef <= limite7);

  const avanco = avancoDe(atual);
  const pontos: PontoGrafico[] = serie.map((p) => ({
    data: dataCurta(p.dataRef).slice(0, 5),
    avanco: avancoDe(p),
    realizado: p.realizado,
    previsto: p.previsto,
    pendentes: p.pendentes,
  }));

  // Avanço por grupo de código (1.xx, 2.xx...)
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

  const maiorSaldo = [...tarefas].sort((a, b) => b.qtdPrevisto - b.qtdRealizada - (a.qtdPrevisto - a.qtdRealizada)).slice(0, 5);
  const maisPendentes = [...tarefas].sort((a, b) => b.pendMaterial - a.pendMaterial).slice(0, 5);
  // Saldo × Fabricação: quanto o saldo está atrás das guias que já fecharam 100%
  const fabric = carga.comFabric ? fabricDe({ previsto: carga.totalPrevisto, esperado: carga.totalEsperado }) : null;
  const falta = (t: { qtdRealizada: number; qtdPrevisto: number; avancoFabric: number }) =>
    atrasoQtd({ realizado: t.qtdRealizada, esperado: t.avancoFabric * t.qtdPrevisto });
  const maiorAtraso = carga.comFabric
    ? tarefas
        .filter((t) => falta(t) > 0)
        .sort((a, b) => falta(b) - falta(a))
        .slice(0, 5)
    : [];
  const codigosEmAtraso = carga.comFabric ? tarefas.filter((t) => falta(t) > 0).length : 0;
  const pctCodigo = (t: { avanco: number; avancoFabric: number }) =>
    carga.comFabric ? `saldo ${pct(t.avanco)} · fabric. ${pct(t.avancoFabric)}` : pct(t.avanco);
  // Situação como desenho: a escala de vermelhos (concluídos [2], andamento [4], sem avanço [6]), sempre com o rótulo escrito.
  const situacoes = [
    { rotulo: "Sem avanço", n: atual.semAvanco, classe: "pend" as const, cor: COR_ASCENT.semAvanco },
    { rotulo: "Em andamento", n: atual.andamento, classe: "parcial" as const, cor: COR_ASCENT.andamento },
    { rotulo: "Concluída", n: atual.concluidas, classe: "ok" as const, cor: COR_ASCENT.concluida },
  ];
  const desdeOntem = ontem && dataCurta(ontem.dataRef).slice(0, 5);

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

      {/* O indicador principal em linha própria (como era antes): a comparação Saldo × Fabricação precisa
          de largura, e na faixa fluida (base de 152px) a barra sumia. Revisão final, 16/11. */}
      <section aria-label="Avanço do saldo">
        <TileIndicador
          variante="painel"
          rotulo={`${fabric !== null ? "Avanço do saldo × fabricação" : "Avanço do saldo"} · ${carga.projeto}`}
          valor={pct(avanco)}
          variacaoTexto={variacao(ontem ? (avanco - avancoDe(ontem)) * 100 : null, "pp", true, desdeOntem)}
          detalhe={`${num(atual.realizado, 1)} de ${num(atual.previsto, 1)} previsto · faltam ${num(Math.max(0, atual.previsto - atual.realizado), 1)}`}
        >
          <div className="mt-1.5">
            {fabric !== null ? (
              <Comparacao saldo={avanco} fabric={fabric} previsto={carga.totalPrevisto} realizado={carga.totalRealizado} />
            ) : (
              <Barra valor={avanco} cor={COR_ASCENT.avanco} className="h-2.5" />
            )}
          </div>
          {semana && (
            <p className="mt-1 text-xs text-txt-2">
              Em 7 dias: <VariacaoNaLinha v={variacao((avanco - avancoDe(semana)) * 100, "pp", true, dataCurta(semana.dataRef).slice(0, 5))} />
            </p>
          )}
          {/* No celular a data da carga não cabe no seletor do topo: fica aqui, onde o gestor olha primeiro. */}
          <p className="mt-1 text-xs text-txt-2">
            Atualizado em <span className="font-mono">{quando(carga.criadaEm)}</span>
          </p>
        </TileIndicador>
      </section>

      {/* Faixa de indicadores do Dashboard do Visto (variante fluida: os cards ocupam a largura que houver). */}
      <section aria-label="Indicadores" className="grade-indicadores fluida">
        <TileIndicador
          variante="painel"
          rotulo="Pendentes de baixa"
          valor={num(atual.pendentes)}
          variacaoTexto={variacao(ontem ? atual.pendentes - ontem.pendentes : null, "n", false, desdeOntem)}
          detalhe={`de ${num(atual.componentes)} componentes`}
        />
        <TileIndicador variante="painel" rotulo="Execuções pendentes" valor={num(atual.execPend, 1)} detalhe={`de ${num(atual.execucoes)} execuções`} />
        <TileIndicador
          variante="painel"
          rotulo="OPs com saldo"
          valor={num(atual.opsComSaldo)}
          detalhe={`de ${num(atual.ops)} OPs · ${pct(atual.ops > 0 ? atual.opsComSaldo / atual.ops : 0)}`}
        />
        <TileIndicador
          variante="painel"
          rotulo="Cortes apontados"
          valor={num(atual.cortesApontados)}
          detalhe={`de ${num(atual.planos)} OPs em plano CNC/PA · ${pct(atual.planos > 0 ? atual.cortesApontados / atual.planos : 0)}`}
        />
      </section>

      {/* Corpo + trilho de 340px a partir de duascol (anatomia do Dashboard do Visto); no celular, coluna única. */}
      <div className="grid grid-cols-1 gap-4 duascol:grid-cols-[minmax(0,1fr)_340px] duascol:items-start">
        <div className="flex min-w-0 flex-col gap-4">
          <Painel titulo="Evolução do avanço" apoio={`Última carga de cada dia, até ${DIAS_GRAFICO} dias. Toque na linha para ver o dia.`}>
            <GraficoEvolucao pontos={pontos} />
          </Painel>

          <Painel titulo={fabric !== null ? "Saldo × fabricação por grupo de código" : "Avanço por grupo de código"}>
            <ul className="flex flex-col gap-3">
              {porGrupo.map(([g, v]) => (
                <li key={g} className="grid grid-cols-[auto_auto_minmax(0,1fr)] items-baseline gap-x-2.5 gap-y-1">
                  <b className="min-w-11 font-mono font-bold text-txt">{g}</b>
                  <b className="font-mono font-bold text-txt">{pct(avancoDe(v))}</b>
                  <span className="text-[13px] text-txt-2">
                    <span className="font-mono">
                      {num(v.realizado, 1)} de {num(v.previsto, 1)}
                    </span>{" "}
                    · {num(v.codigos)} códigos
                  </span>
                  <span className="col-span-3">
                    {fabric !== null ? (
                      <Comparacao compacto saldo={avancoDe(v)} fabric={fabricDe(v)} />
                    ) : (
                      <Barra valor={avancoDe(v)} cor={COR_ASCENT.avanco} />
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </Painel>
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          {fabric !== null && (
            <Painel
              titulo="Maior atraso do saldo"
              apoio={`Códigos com o saldo mais atrás da fabricação (guias com 100%). ${num(codigosEmAtraso)} de ${num(tarefas.length)} códigos estão atrás.`}
            >
              {maiorAtraso.length === 0 ? (
                <p className="rounded-btn bg-bg-2 px-3.5 py-3 text-sm text-txt">Nenhum código com o saldo atrás da fabricação.</p>
              ) : (
                <ol>
                  {maiorAtraso.map((t) => (
                    <ItemTop
                      key={t.codTarefa}
                      cod={t.codTarefa}
                      descricao={descricaoCurta(t.descricao)}
                      meta={
                        <>
                          faltam <b className="font-mono">{num(falta(t), 1)}</b> para acompanhar
                        </>
                      }
                      selo={<TextoRitmo curto saldo={t.avanco} fabric={t.avancoFabric} />}
                      percentual={pctCodigo(t)}
                    />
                  ))}
                </ol>
              )}
            </Painel>
          )}

          <Painel titulo="Situação dos códigos de tarefa" apoio={`${num(atual.tarefas)} códigos de tarefa no projeto.`}>
            <ul className="flex flex-col gap-3">
              {situacoes.map((s) => (
                <li key={s.rotulo} className="grid grid-cols-[auto_auto_minmax(0,1fr)] items-baseline gap-x-2.5 gap-y-1">
                  <Badge tone={TOM_DA_CLASSE[s.classe]}>{s.rotulo}</Badge>
                  <b className="font-mono font-bold text-txt">{num(s.n)}</b>
                  <span className="font-mono text-[13px] text-txt-2">{pct(atual.tarefas > 0 ? s.n / atual.tarefas : 0)}</span>
                  <Barra valor={atual.tarefas > 0 ? s.n / atual.tarefas : 0} cor={s.cor} className="col-span-3" />
                </li>
              ))}
            </ul>
          </Painel>

          <Painel titulo="Maior saldo a subir" apoio="Códigos com mais quantidade prevista ainda sem saldo.">
            <ol>
              {maiorSaldo.map((t) => (
                <ItemTop
                  key={t.codTarefa}
                  cod={t.codTarefa}
                  descricao={descricaoCurta(t.descricao)}
                  meta={
                    <>
                      faltam <b className="font-mono">{num(t.qtdPrevisto - t.qtdRealizada, 1)}</b> de{" "}
                      <span className="font-mono">{num(t.qtdPrevisto, 1)}</span>
                    </>
                  }
                  selo={<EtiquetaSituacao avanco={t.avanco} />}
                  percentual={pctCodigo(t)}
                />
              ))}
            </ol>
          </Painel>

          <Painel titulo="Mais pendentes de baixa" apoio="Componentes com APONTADO = 0 por código de tarefa.">
            <ol>
              {maisPendentes.map((t) => (
                <ItemTop
                  key={t.codTarefa}
                  cod={t.codTarefa}
                  descricao={descricaoCurta(t.descricao)}
                  meta={
                    <>
                      <b className="font-mono">{num(t.pendMaterial)}</b> de <span className="font-mono">{num(t.totalComp)}</span> componentes
                    </>
                  }
                  selo={<EtiquetaSituacao avanco={t.avanco} />}
                  percentual={pctCodigo(t)}
                />
              ))}
            </ol>
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
