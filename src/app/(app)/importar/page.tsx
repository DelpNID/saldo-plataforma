import type { Metadata } from "next";
import { Importador } from "@/components/Importador";
import { cargaAtiva } from "@/lib/db";
import { quando } from "@/lib/formato";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Atualizar dados" };

export default async function Importar() {
  const carga = await cargaAtiva();
  const habilitada = Boolean(process.env.IMPORTACAO_SENHA);
  return (
    <div className="flex flex-col gap-4">
      {/* A trilha do topo nomeia a tela; o título fica para leitor de tela (regra do Visto). */}
      <h1 className="sr-only">Importar a planilha de saldo</h1>
      <p className="text-sm text-txt-2">
        {carga ? (
          <>
            Última carga em <span className="font-mono font-semibold text-txt">{quando(carga.criadaEm)}</span> · arquivo atual {carga.arquivo} · projeto{" "}
            {carga.projeto}
          </>
        ) : (
          "Nenhuma planilha carregada ainda"
        )}
      </p>
      <Importador habilitada={habilitada} />
    </div>
  );
}
