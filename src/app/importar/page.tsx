import type { Metadata } from "next";
import { Importador } from "@/components/Importador";
import { Rodape, Topo } from "@/components/Topo";
import { cargaAtiva } from "@/lib/db";
import { quando } from "@/lib/formato";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Atualizar dados" };

export default async function Importar() {
  const carga = await cargaAtiva();
  const habilitada = Boolean(process.env.IMPORTACAO_SENHA);
  return (
    <>
      <Topo ativo="importar" />
      <main className="in">
        <div className="cab-pagina">
          <span className="kicker">Atualizar dados</span>
          <div className="titulo">
            <h1>Importar a planilha de saldo</h1>
            <p className="resumo">{carga ? `Última carga em ${quando(carga.criadaEm)}` : "Nenhuma planilha carregada ainda"}</p>
          </div>
          {carga && (
            <p className="nota">
              Arquivo atual: {carga.arquivo} · projeto {carga.projeto}
            </p>
          )}
        </div>
        <Importador habilitada={habilitada} />
      </main>
      <Rodape arquivo={carga?.arquivo} />
    </>
  );
}
