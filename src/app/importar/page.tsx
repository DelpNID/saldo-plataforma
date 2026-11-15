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
      <Topo ativo="importar" projeto={carga?.projeto} atualizado={carga?.criadaEm} />
      <section className="hero" aria-label="Atualizar dados">
        <div className="in">
          <span className="kicker">Atualizar dados</span>
          <h1>
            Importar a planilha de saldo
            <em>{carga ? `Última carga em ${quando(carga.criadaEm)}` : "Nenhuma planilha carregada ainda"}</em>
          </h1>
          {carga && <p className="lede">Arquivo atual: {carga.arquivo} · projeto {carga.projeto}</p>}
          <ol className="passos">
            <li><b>Atualize e salve</b> a planilha no Excel, para as fórmulas ficarem recalculadas.</li>
            <li><b>Escolha o arquivo</b> abaixo. A plataforma lê e mostra um resumo.</li>
            <li><b>Confira o resumo</b>, digite a senha de importação e atualize. A troca acontece de uma vez, só no final.</li>
          </ol>
        </div>
      </section>
      <main className="in">
        {!habilitada && (
          <p className="nota">
            <b>Importação desligada.</b> Para ligar, cadastre a variável <span className="mono">IMPORTACAO_SENHA</span> na Vercel e publique de novo.
          </p>
        )}
        <Importador habilitada={habilitada} />
      </main>
      <Rodape arquivo={carga?.arquivo} />
    </>
  );
}
