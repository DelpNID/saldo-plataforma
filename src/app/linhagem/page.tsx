import Link from "next/link";
import type { Metadata } from "next";
import { Avanco } from "@/components/Etiquetas";
import { Linhagem, type DesenhoLinhagem } from "@/components/Linhagem";
import { Rodape, Topo } from "@/components/Topo";
import { cargaAtiva, prisma } from "@/lib/db";
import { num } from "@/lib/formato";
import { agregarOrigens, compararCodigo, descricaoCurta, situacaoTarefa, tituloOrigem, type GrupoOrigem } from "@/lib/regras";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Linhagem" };

export default async function LinhagemPage({ searchParams }: { searchParams: { abrir?: string } }) {
  const carga = await cargaAtiva();
  if (!carga) {
    return (
      <>
        <Topo ativo="linhagem" />
        <main className="in">
          <div className="card vazio">
            <b>Nenhuma planilha carregada ainda</b>
            <Link className="btn sec" href="/importar">
              Ir para Atualizar
            </Link>
          </div>
        </main>
      </>
    );
  }

  // Tarefas filhas de todos os códigos de uma vez: o mesmo agrupamento de "De onde vem o saldo", somado no banco
  const [tarefas, grupos, gruposPend] = await Promise.all([
    prisma.tarefa.findMany({ where: { cargaId: carga.id }, orderBy: { ordem: "asc" } }),
    prisma.componente.groupBy({ by: ["tarPai", "tarFilho"], where: { cargaId: carga.id }, _sum: { previsto: true, apontado2: true }, _count: { _all: true } }),
    prisma.componente.groupBy({ by: ["tarPai", "tarFilho"], where: { cargaId: carga.id, apontado: { lte: 0 } }, _count: { _all: true } }),
  ]);
  const pendentes = new Map(gruposPend.map((g) => [`${g.tarPai}|${g.tarFilho}`, g._count._all]));
  const porPai = new Map<string, GrupoOrigem[]>();
  for (const g of grupos) {
    const l = porPai.get(g.tarPai) ?? [];
    l.push({
      tarFilho: g.tarFilho,
      previsto: g._sum.previsto ?? 0,
      realizado: g._sum.apontado2 ?? 0,
      componentes: g._count._all,
      pendentes: pendentes.get(`${g.tarPai}|${g.tarFilho}`) ?? 0,
    });
    porPai.set(g.tarPai, l);
  }

  // Desenho › códigos, na ordem dos códigos
  const ordenadas = [...tarefas].sort((a, b) => compararCodigo(a.codTarefa, b.codTarefa));
  const mapa = new Map<string, DesenhoLinhagem>();
  for (const t of ordenadas) {
    const desenho = t.desenho || "Sem desenho";
    const d = mapa.get(desenho) ?? { desenho, codigos: [] };
    d.codigos.push({
      cod: t.codTarefa,
      descricao: descricaoCurta(t.descricao),
      avanco: t.avanco,
      previsto: t.qtdPrevisto,
      realizado: t.qtdRealizada,
      filhas: agregarOrigens(t.codTarefa, porPai.get(t.codTarefa) ?? []).map((o) => ({ ...o, titulo: tituloOrigem(o, t.codTarefa) })),
    });
    mapa.set(desenho, d);
  }

  const avanco = carga.totalPrevisto > 0 ? carga.totalRealizado / carga.totalPrevisto : 0;
  const situacoes = tarefas.map((t) => situacaoTarefa(t.avanco));
  const semAvanco = situacoes.filter((s) => s === "sem-avanco").length;
  const andamento = situacoes.filter((s) => s === "andamento").length;
  const concluidas = situacoes.filter((s) => s === "concluida").length;

  return (
    <>
      <Topo ativo="linhagem" />
      <main className="in">
        <div className="cab-pagina">
          <span className="kicker">Projeto › desenho › código de tarefa › tarefas filhas</span>
          <div className="titulo">
            <h1>Linhagem dos códigos de tarefa</h1>
            <p className="nota">Clique num código para abrir o detalhamento.</p>
          </div>
        </div>
        <Linhagem
          desenhos={[...mapa.values()]}
          total={tarefas.length}
          abrir={(searchParams.abrir ?? "")
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean)
            .slice(0, 20)}
        >
          <div className="card lin-projeto">
            <span>
              <span className="rotulo">Projeto</span>
              <br />
              <b className="lin-projeto-n">{carga.projeto}</b>
              <br />
              <span className="nota mono">Centro de custo {carga.centroCusto}</span>
            </span>
            <Avanco valor={avanco} rotulo={`${num(carga.totalRealizado, 1)} de ${num(carga.totalPrevisto, 1)} previsto`} />
            <span className="origem-n">
              {num(tarefas.length)} códigos de tarefa · {num(semAvanco)} sem avanço · {num(andamento)} em andamento · {num(concluidas)} concluídos
            </span>
          </div>
        </Linhagem>
      </main>
      <Rodape arquivo={carga.arquivo} />
    </>
  );
}
