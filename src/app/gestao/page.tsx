import Link from "next/link";
import type { Metadata } from "next";
import { BuscaGestao } from "@/components/BuscaGestao";
import { GraficoEvolucao, type PontoGrafico } from "@/components/GraficoEvolucao";
import { BarrasSaldo, EtiquetaSituacao, LinhaFabric, TextoRitmo, faltaFabric } from "@/components/Etiquetas";
import { cargaAtiva, prisma } from "@/lib/db";
import { dataCurta, num, pct, quando } from "@/lib/formato";
import { atrasoQtd, avancoDe, fabricDe, garantirHistorico, serieDiaria } from "@/lib/kpis";
import { compararCodigo, descricaoCurta, grupoTarefa } from "@/lib/regras";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Gestão" };

const DIAS_GRAFICO = 30;

/** Variação com seta e texto: a cor só reforça (verde melhorou, vermelho piorou). */
function Variacao({ valor, unidade, melhorSeSobe, desde }: { valor: number | null; unidade: "pp" | "n"; melhorSeSobe: boolean; desde?: string }) {
  if (valor === null || !desde) return <span className="g-delta">sem comparação ainda</span>;
  const zero = unidade === "pp" ? Math.abs(valor) < 0.05 : valor === 0;
  if (zero) return <span className="g-delta">= sem mudança desde {desde}</span>;
  const sobe = valor > 0;
  const bom = sobe === melhorSeSobe;
  const texto = unidade === "pp" ? `${num(Math.abs(valor), 1)} p.p.` : num(Math.abs(valor));
  return (
    <span className={`g-delta ${bom ? "g-bom" : "g-ruim"}`}>
      {sobe ? "▲" : "▼"} {sobe ? "+" : "−"}
      {texto} desde {desde}
    </span>
  );
}

export default async function Gestao({ searchParams }: { searchParams: { q?: string } }) {
  const carga = await cargaAtiva();
  if (!carga) {
    return (
      <div className="g-pagina">
        <main className="g-main">
          <div className="card vazio">
            <b>Nenhuma planilha carregada ainda</b>
          </div>
        </main>
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
  const situacoes = [
    { rotulo: "Sem avanço", n: atual.semAvanco, classe: "pend" },
    { rotulo: "Em andamento", n: atual.andamento, classe: "parcial" },
    { rotulo: "Concluída", n: atual.concluidas, classe: "ok" },
  ];

  return (
    <div className="g-pagina">
      <header className="g-topo">
        <div className="g-topo-in">
          <Link href="/gestao" className="g-marca" aria-label="Gestão do saldo, início">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/delp-logo.png" alt="" width={28} height={24} />
            <span>
              <b>Gestão do saldo</b>
              <small>
                {carga.projeto} · atualizado {quando(carga.criadaEm)}
              </small>
            </span>
          </Link>
          <nav className="g-acoes" aria-label="Opções">
            <Link className="g-link" href="/">
              Plataforma
            </Link>
            <form action="/api/sair" method="post">
              <button className="btn-sair" type="submit">
                Sair
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="g-main">
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
        <section className="card g-hero" aria-label="Avanço do saldo">
          <span className="stat-l">Avanço do saldo · {carga.projeto}</span>
          <div className="g-hero-v">
            <b>{pct(avanco)}</b>
            <Variacao valor={ontem ? (avanco - avancoDe(ontem)) * 100 : null} unidade="pp" melhorSeSobe desde={ontem && dataCurta(ontem.dataRef).slice(0, 5)} />
          </div>
          <BarrasSaldo saldo={avanco} fabric={fabric} />
          {fabric !== null && <LinhaFabric saldo={avanco} fabric={fabric} falta={faltaFabric(fabric, carga.totalPrevisto, carga.totalRealizado)} />}
          <span className="stat-d">
            {num(atual.realizado, 1)} de {num(atual.previsto, 1)} previsto · faltam {num(Math.max(0, atual.previsto - atual.realizado), 1)}
          </span>
          {semana && (
            <span className="stat-d">
              Em 7 dias: <Variacao valor={(avanco - avancoDe(semana)) * 100} unidade="pp" melhorSeSobe desde={dataCurta(semana.dataRef).slice(0, 5)} />
            </span>
          )}
        </section>

        <section className="g-kpis" aria-label="Indicadores">
          <div className="card g-kpi">
            <span className="stat-l">Pendentes de baixa</span>
            <b className="g-kpi-v">{num(atual.pendentes)}</b>
            <span className="stat-d">de {num(atual.componentes)} componentes</span>
            <Variacao
              valor={ontem ? atual.pendentes - ontem.pendentes : null}
              unidade="n"
              melhorSeSobe={false}
              desde={ontem && dataCurta(ontem.dataRef).slice(0, 5)}
            />
          </div>
          <div className="card g-kpi">
            <span className="stat-l">Execuções pendentes</span>
            <b className="g-kpi-v">{num(atual.execPend, 1)}</b>
            <span className="stat-d">de {num(atual.execucoes)} execuções</span>
          </div>
          <div className="card g-kpi">
            <span className="stat-l">OPs com saldo</span>
            <b className="g-kpi-v">{num(atual.opsComSaldo)}</b>
            <span className="stat-d">
              de {num(atual.ops)} OPs · {pct(atual.ops > 0 ? atual.opsComSaldo / atual.ops : 0)}
            </span>
          </div>
          <div className="card g-kpi">
            <span className="stat-l">Cortes apontados</span>
            <b className="g-kpi-v">{num(atual.cortesApontados)}</b>
            <span className="stat-d">
              de {num(atual.planos)} OPs em plano CNC/PA · {pct(atual.planos > 0 ? atual.cortesApontados / atual.planos : 0)}
            </span>
          </div>
        </section>

        <div className="g-grade">
          <section className="card g-bloco" aria-labelledby="g-evolucao">
            <h2 id="g-evolucao">Evolução do avanço</h2>
            <p className="nota">Última carga de cada dia, até {DIAS_GRAFICO} dias. Toque na linha para ver o dia.</p>
            <GraficoEvolucao pontos={pontos} />
          </section>

          {fabric !== null && (
            <section className="card g-bloco" aria-labelledby="g-atraso">
              <h2 id="g-atraso">Maior atraso do saldo</h2>
              <p className="nota">
                Códigos com o saldo mais atrás da fabricação (guias com 100%). {num(codigosEmAtraso)} de {num(tarefas.length)} códigos estão atrás.
              </p>
              {maiorAtraso.length === 0 ? (
                <p className="g-vazio">Nenhum código com o saldo atrás da fabricação.</p>
              ) : (
                <ol className="g-top">
                  {maiorAtraso.map((t) => (
                    <li key={t.codTarefa}>
                      <Link href={`/tarefa/${encodeURIComponent(t.codTarefa)}`}>
                        <span className="g-top-t">
                          <b>{t.codTarefa}</b> {descricaoCurta(t.descricao)}
                        </span>
                        <span className="g-top-n">
                          faltam <b>{num(falta(t), 1)}</b> para acompanhar
                        </span>
                        <TextoRitmo curto saldo={t.avanco} fabric={t.avancoFabric} />
                        <span className="g-pct">{pctCodigo(t)}</span>
                      </Link>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          )}

          <section className="card g-bloco" aria-labelledby="g-situacao">
            <h2 id="g-situacao">Situação dos códigos de tarefa</h2>
            <p className="nota">{num(atual.tarefas)} códigos de tarefa no projeto.</p>
            <ul className="g-linhas">
              {situacoes.map((s) => (
                <li key={s.rotulo}>
                  <span className={`tag ${s.classe}`}>{s.rotulo}</span>
                  <b>{num(s.n)}</b>
                  <span className="g-pct">{pct(atual.tarefas > 0 ? s.n / atual.tarefas : 0)}</span>
                  <span className={`barra g-barra-${s.classe}`} role="presentation">
                    <span style={{ width: `${atual.tarefas > 0 ? (s.n / atual.tarefas) * 100 : 0}%` }} />
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="card g-bloco" aria-labelledby="g-grupos">
            <h2 id="g-grupos">Avanço por grupo de código</h2>
            <ul className="g-linhas">
              {porGrupo.map(([g, v]) => (
                <li key={g}>
                  <b className="g-grupo">{g}</b>
                  <b>{pct(avancoDe(v))}</b>
                  <span className="g-pct">
                    {num(v.realizado, 1)} de {num(v.previsto, 1)} · {num(v.codigos)} códigos
                  </span>
                  <BarrasSaldo saldo={avancoDe(v)} fabric={fabric !== null && v.previsto > 0 ? fabricDe(v) : null} />
                  {fabric !== null && v.previsto > 0 && <LinhaFabric saldo={avancoDe(v)} fabric={fabricDe(v)} />}
                </li>
              ))}
            </ul>
          </section>

          <section className="card g-bloco" aria-labelledby="g-saldo">
            <h2 id="g-saldo">Maior saldo a subir</h2>
            <p className="nota">Códigos com mais quantidade prevista ainda sem saldo.</p>
            <ol className="g-top">
              {maiorSaldo.map((t) => (
                <li key={t.codTarefa}>
                  <Link href={`/tarefa/${encodeURIComponent(t.codTarefa)}`}>
                    <span className="g-top-t">
                      <b>{t.codTarefa}</b> {descricaoCurta(t.descricao)}
                    </span>
                    <span className="g-top-n">
                      faltam <b>{num(t.qtdPrevisto - t.qtdRealizada, 1)}</b> de {num(t.qtdPrevisto, 1)}
                    </span>
                    <EtiquetaSituacao avanco={t.avanco} />
                    <span className="g-pct">{pctCodigo(t)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>

          <section className="card g-bloco" aria-labelledby="g-pend">
            <h2 id="g-pend">Mais pendentes de baixa</h2>
            <p className="nota">Componentes com APONTADO = 0 por código de tarefa.</p>
            <ol className="g-top">
              {maisPendentes.map((t) => (
                <li key={t.codTarefa}>
                  <Link href={`/tarefa/${encodeURIComponent(t.codTarefa)}`}>
                    <span className="g-top-t">
                      <b>{t.codTarefa}</b> {descricaoCurta(t.descricao)}
                    </span>
                    <span className="g-top-n">
                      <b>{num(t.pendMaterial)}</b> de {num(t.totalComp)} componentes
                    </span>
                    <EtiquetaSituacao avanco={t.avanco} />
                    <span className="g-pct">{pctCodigo(t)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <p className="nota g-fonte">
          Fonte: {carga.arquivo} · centro de custo {carga.centroCusto}. <Link href="/">Abrir a plataforma completa</Link>
        </p>
      </main>
    </div>
  );
}
