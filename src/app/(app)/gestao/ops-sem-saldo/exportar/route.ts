// Exporta a lista inteira de OPs fabricadas sem saldo (com os filtros do endereço) em CSV
// para o Excel. A rota fica atrás da sessão como as telas (middleware).
import { cargaAtiva, prisma } from "@/lib/db";
import { BOM, montarCsv } from "@/lib/csv";
import { CABECALHO_OPS, filtrarOps, lerFiltroOps, linhaExportOp, opsFabricadasSemSaldo, ordenarOps } from "@/lib/gestor";
import { compararCodigo } from "@/lib/regras";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const carga = await cargaAtiva();
  if (!carga) return new Response("Nenhuma planilha carregada.", { status: 404 });
  const sp = new URL(req.url).searchParams;
  const filtro = lerFiltroOps({ q: sp.get("q") ?? undefined, codigo: sp.get("codigo") ?? undefined, tag: sp.get("tag") ?? undefined });
  const lista = ordenarOps(filtrarOps(await opsFabricadasSemSaldo(prisma, carga.id), filtro), compararCodigo);
  const nome = `ops-fabricadas-sem-saldo${filtro.codigo ? `-${filtro.codigo}` : ""}.csv`.replace(/[^\w.-]/g, "_");
  return new Response(BOM + montarCsv(CABECALHO_OPS, lista.map(linhaExportOp)), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nome}"`,
      "Cache-Control": "no-store",
    },
  });
}
