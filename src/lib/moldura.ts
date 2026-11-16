// Os dados que a moldura (barra lateral e topo) mostra em toda tela logada:
// o projeto no seletor e o número de Pendências na barra.
// Só servidor. Mesma consulta que o antigo Topo.tsx fazia a cada página.
import type { ProjetoOpcao } from "@/components/SeletorProjeto";
import { cargaAtiva, prisma } from "@/lib/db";
import { num, pct, quando } from "@/lib/formato";

export async function dadosDaMoldura(): Promise<{ projetos: ProjetoOpcao[]; pendentes: number }> {
  const [cargas, ativa] = await Promise.all([
    prisma.carga.findMany({ where: { ativa: true }, orderBy: { id: "desc" } }),
    cargaAtiva(),
  ]);
  const pendentesPorCarga = await Promise.all(
    cargas.map((c) => prisma.componente.count({ where: { cargaId: c.id, apontado: { lte: 0 } } })),
  );
  const projetos = cargas.map((c, i) => ({
    id: c.id,
    nome: c.projeto,
    centroCusto: c.centroCusto,
    avanco: pct(c.totalPrevisto > 0 ? c.totalRealizado / c.totalPrevisto : 0),
    pendentes: num(pendentesPorCarga[i]),
    atualizado: quando(c.criadaEm),
  }));
  const iAtiva = ativa ? cargas.findIndex((c) => c.id === ativa.id) : -1;
  return {
    projetos,
    pendentes: iAtiva >= 0 ? pendentesPorCarga[iAtiva] : 0,
  };
}
