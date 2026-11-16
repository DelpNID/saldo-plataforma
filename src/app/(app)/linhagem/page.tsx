import Link from "next/link";
import type { Metadata } from "next";
import { Upload } from "lucide-react";
import { Avanco } from "@/components/Etiquetas";
import { EstadoVazio } from "@/components/layout/EstadoVazio";
import { buttonVariants } from "@/components/ui/Button";
import { Linhagem, type DesenhoLinhagem } from "@/components/Linhagem";
import { cargaAtiva, prisma } from "@/lib/db";
import { num } from "@/lib/formato";
import { agregarOrigens, compararCodigo, descricaoCurta, situacaoTarefa, tituloOrigem, type GrupoOrigem } from "@/lib/regras";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Linhagem" };

export default async function LinhagemPage({ searchParams }: { searchParams: { abrir?: string } }) {
  const carga = await cargaAtiva();
  if (!carga) {
    return (
      <div className="rounded-card border border-subtle bg-bg shadow-subtle">
        <h1 className="sr-only">Linhagem dos códigos de tarefa</h1>
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
      fabric: carga.comFabric ? t.avancoFabric : null,
    });
    mapa.set(desenho, d);
  }

  // Filhas de todo código que tem componentes (inclui o RETRABALHO), para descer a linhagem
  const filhasPorCodigo = Object.fromEntries(
    [...porPai.entries()].map(([pai, gs]) => [pai, agregarOrigens(pai, gs).map((o) => ({ ...o, titulo: tituloOrigem(o, pai) }))]),
  );
  const avancoPorCodigo = Object.fromEntries(
    tarefas.map((t) => [
      t.codTarefa,
      { avanco: t.avanco, previsto: t.qtdPrevisto, realizado: t.qtdRealizada, fabric: carga.comFabric ? t.avancoFabric : null },
    ]),
  );

  const avanco = carga.totalPrevisto > 0 ? carga.totalRealizado / carga.totalPrevisto : 0;
  const situacoes = tarefas.map((t) => situacaoTarefa(t.avanco));
  const semAvanco = situacoes.filter((s) => s === "sem-avanco").length;
  const andamento = situacoes.filter((s) => s === "andamento").length;
  const concluidas = situacoes.filter((s) => s === "concluida").length;

  return (
    <div className="flex flex-col gap-3">
      {/* A trilha do topo nomeia a tela; o título fica para leitor de tela (regra do Visto). */}
      <h1 className="sr-only">Linhagem dos códigos de tarefa</h1>
      <Linhagem
          desenhos={[...mapa.values()]}
          filhasPorCodigo={filhasPorCodigo}
          avancoPorCodigo={avancoPorCodigo}
          total={tarefas.length}
          abrir={(searchParams.abrir ?? "")
            .split(",")
            .map((c) => c.trim())
            .filter(Boolean)
            .slice(0, 20)}
        >
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-card border border-subtle bg-bg p-4 shadow-subtle">
            <span className="flex flex-col leading-tight">
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-txt-2">Projeto</span>
              <b className="text-[22px] font-bold text-txt">{carga.projeto}</b>
              <span className="font-mono text-sm text-txt-2">Centro de custo {carga.centroCusto}</span>
            </span>
            <span className="min-w-[220px] max-w-[320px] flex-[1_1_220px]">
              <Avanco valor={avanco} rotulo={`${num(carga.totalRealizado, 1)} de ${num(carga.totalPrevisto, 1)} previsto`} />
            </span>
            <span className="flex-[1_1_240px] text-sm text-txt">
              <span className="font-mono">{num(tarefas.length)}</span> códigos de tarefa · <span className="font-mono">{num(semAvanco)}</span> sem
              avanço · <span className="font-mono">{num(andamento)}</span> em andamento · <span className="font-mono">{num(concluidas)}</span>{" "}
              concluídos
            </span>
          </div>
      </Linhagem>
    </div>
  );
}
