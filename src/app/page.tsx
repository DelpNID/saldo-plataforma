import Link from "next/link";
import { Rodape, Topo } from "@/components/Topo";
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
          <p className="card vazio">Nenhuma planilha carregada ainda. Rode a carga diária para os dados aparecerem aqui.</p>
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
  const concluidas = tarefas.filter((t) => situacaoTarefa(t.avanco) === "concluida").length;
  const semAvanco = tarefas.filter((t) => situacaoTarefa(t.avanco) === "sem-avanco").length;
  const lista: TarefaResumo[] = tarefas.map((t) => ({
    cod: t.codTarefa,
    descricao: descricaoCurta(t.descricao),
    desenho: t.desenho,
    execucoes: t.execucoes,
    execPend: t.execPend,
    previsto: t.qtdPrevisto,
    realizado: t.qtdRealizada,
    avanco: t.avanco,
    pendMaterial: t.pendMaterial,
    totalComp: t.totalComp,
    opsTotal: t.opsTotal,
    opsComSaldo: t.opsComSaldo,
  }));

  return (
    <>
      <Topo ativo="painel" projeto={carga.projeto} atualizado={carga.criadaEm} />
      <section className="hero" aria-label="Resumo do projeto">
        <div className="in">
          <span className="kicker">PCP · Centro de custo {carga.centroCusto}</span>
          <h1>
            Saldo {carga.projeto}
            <em>{pct(avanco)} do saldo subido</em>
          </h1>
          <div className="stats">
            <div className="stat destaque">
              <span className="stat-l">Avanço do saldo</span>
              <span className="stat-v">{pct(avanco)}</span>
              <span className="stat-d">{num(carga.totalRealizado, 1)} de {num(carga.totalPrevisto, 1)} previsto</span>
            </div>
            <div className="stat">
              <span className="stat-l">Execuções pendentes</span>
              <span className="stat-v">{num(carga.totalExecPend, 1)}</span>
              <span className="stat-d">de {num(carga.totalExecucoes)} execuções</span>
            </div>
            <div className="stat">
              <span className="stat-l">Códigos de tarefa</span>
              <span className="stat-v">{num(concluidas)} concluídos</span>
              <span className="stat-d">{num(semAvanco)} sem avanço · {num(tarefas.length)} no total</span>
            </div>
            <div className="stat">
              <span className="stat-l">Pendentes de baixa</span>
              <span className="stat-v">{num(pendComp)}</span>
              <span className="stat-d">de {num(totalComp)} componentes · <Link href="/pendencias">ver lista</Link></span>
            </div>
          </div>
        </div>
      </section>

      <main className="in">
        <section aria-labelledby="t-tarefas">
          <div className="section-h">
            <div>
              <h2 id="t-tarefas">Códigos de tarefa</h2>
              <p>Clique num código para abrir as tarefas filhas, as estruturas e os componentes.</p>
            </div>
          </div>
          <ListaTarefas tarefas={lista} />
          {retrabalho > 0 && (
            <p className="nota">
              <b>Retrabalho:</b> {num(retrabalho)} componentes fora dos códigos de tarefa, {num(retrabalhoPend)} pendentes de baixa.{" "}
              <Link href={`/tarefa/${RETRABALHO}`}>Abrir retrabalho</Link>
            </p>
          )}
        </section>
      </main>
      <Rodape arquivo={carga.arquivo} />
    </>
  );
}
