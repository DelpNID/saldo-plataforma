import Link from "next/link";
import { Rodape, Topo } from "@/components/Topo";
import { BarrasSaldo, LinhaFabric, faltaFabric } from "@/components/Etiquetas";
import { ListaTarefas, type TarefaResumo } from "@/components/ListaTarefas";
import { cargaAtiva, prisma } from "@/lib/db";
import { num, pct } from "@/lib/formato";
import { RETRABALHO, descricaoCurta, situacaoTarefa } from "@/lib/regras";

export const dynamic = "force-dynamic";

export default async function Painel() {
  const carga = await cargaAtiva();
  if (!carga) {
    return (
      <>
        <Topo ativo="painel" />
        <main className="in">
          <div className="card vazio">
            <b>Nenhuma planilha carregada ainda</b>
            <span>Importe a planilha de saldo em Atualizar para os dados aparecerem aqui.</span>
            <Link className="btn sec" href="/importar">
              Ir para Atualizar
            </Link>
          </div>
        </main>
      </>
    );
  }

  const [tarefas, totalComp, pendComp, retrabalho, retrabalhoPend] = await Promise.all([
    prisma.tarefa.findMany({ where: { cargaId: carga.id }, orderBy: { ordem: "asc" } }),
    prisma.componente.count({ where: { cargaId: carga.id } }),
    prisma.componente.count({ where: { cargaId: carga.id, apontado: { lte: 0 } } }),
    prisma.componente.count({ where: { cargaId: carga.id, tarPai: RETRABALHO } }),
    prisma.componente.count({ where: { cargaId: carga.id, tarPai: RETRABALHO, apontado: { lte: 0 } } }),
  ]);

  const avanco = carga.totalPrevisto > 0 ? carga.totalRealizado / carga.totalPrevisto : 0;
  const fabric = carga.totalPrevisto > 0 ? carga.totalEsperado / carga.totalPrevisto : 0;
  const situacoes = tarefas.map((t) => situacaoTarefa(t.avanco));
  const concluidas = situacoes.filter((s) => s === "concluida").length;
  const semAvanco = situacoes.filter((s) => s === "sem-avanco").length;
  const andamento = situacoes.filter((s) => s === "andamento").length;
  const lista: TarefaResumo[] = tarefas.map((t) => ({
    cod: t.codTarefa,
    descricao: descricaoCurta(t.descricao),
    desenho: t.desenho,
    execucoes: t.execucoes,
    execPend: t.execPend,
    previsto: t.qtdPrevisto,
    realizado: t.qtdRealizada,
    avanco: t.avanco,
    fabric: carga.comFabric ? t.avancoFabric : null,
    pendMaterial: t.pendMaterial,
    totalComp: t.totalComp,
    opsTotal: t.opsTotal,
    opsComSaldo: t.opsComSaldo,
  }));

  return (
    <>
      <Topo ativo="painel" />
      <main className="in">
        <Link className="so-celular" href="/gestao">
          <span>Está no celular? Abra a Gestão, feita para a tela pequena.</span>
          <span aria-hidden="true">›</span>
        </Link>
        <div className="cab-pagina">
          <div className="titulo">
            <h1>Saldo {carga.projeto}</h1>
            <span className="kicker">PCP · Centro de custo {carga.centroCusto}</span>
          </div>
        </div>
        <section aria-label="Resumo do projeto">
          <div className="stats">
            <div className="stat destaque">
              <span className="stat-l">Avanço do saldo</span>
              <span className="stat-v">{pct(avanco)}</span>
              <BarrasSaldo saldo={avanco} fabric={carga.comFabric ? fabric : null} />
              {carga.comFabric && <LinhaFabric saldo={avanco} fabric={fabric} falta={faltaFabric(fabric, carga.totalPrevisto, carga.totalRealizado)} />}
              <span className="stat-d">
                {num(carga.totalRealizado, 1)} de {num(carga.totalPrevisto, 1)} previsto
              </span>
            </div>
            <div className="stat">
              <span className="stat-l">Códigos de tarefa</span>
              <span className="stat-v">{num(semAvanco)} sem avanço</span>
              <span className="stat-d">
                {num(andamento)} em andamento · {num(concluidas)} concluídos · {num(tarefas.length)} no total
              </span>
            </div>
            <div className="stat">
              <span className="stat-l">Execuções pendentes</span>
              <span className="stat-v">{num(carga.totalExecPend, 1)}</span>
              <span className="stat-d">de {num(carga.totalExecucoes)} execuções</span>
            </div>
            <div className="stat">
              <span className="stat-l">Pendentes de baixa</span>
              <span className="stat-v">{num(pendComp)}</span>
              <span className="stat-d">
                de {num(totalComp)} componentes · <Link href="/pendencias">ver lista</Link>
              </span>
            </div>
          </div>
        </section>
        <ListaTarefas tarefas={lista}>
          {retrabalho > 0 && (
            <p className="nota">
              <b>Retrabalho:</b> {num(retrabalho)} componentes fora dos códigos de tarefa, {num(retrabalhoPend)} pendentes de baixa.{" "}
              <Link href={`/tarefa/${RETRABALHO}`}>Abrir retrabalho</Link>
            </p>
          )}
        </ListaTarefas>
      </main>
      <Rodape arquivo={carga.arquivo} />
    </>
  );
}
