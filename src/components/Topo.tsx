import Link from "next/link";
import { prisma } from "@/lib/db";
import { num, pct, quando } from "@/lib/formato";
import { SeletorProjeto, type ProjetoOpcao } from "./SeletorProjeto";

interface Props {
  ativo: "painel" | "linhagem" | "pendencias" | "tarefa" | "importar";
}

async function projetos(): Promise<ProjetoOpcao[]> {
  const cargas = await prisma.carga.findMany({ where: { ativa: true }, orderBy: { id: "desc" } });
  return Promise.all(
    cargas.map(async (c) => ({
      id: c.id,
      nome: c.projeto,
      centroCusto: c.centroCusto,
      avanco: pct(c.totalPrevisto > 0 ? c.totalRealizado / c.totalPrevisto : 0),
      pendentes: num(await prisma.componente.count({ where: { cargaId: c.id, apontado: { lte: 0 } } })),
      atualizado: quando(c.criadaEm),
    })),
  );
}

/** Barra superior: marca, projeto (com a data da última carga), menu e Sair. */
export async function Topo({ ativo }: Props) {
  const opcoes = await projetos();
  return (
    <header className="topbar">
      <div className="in">
        <Link href="/" className="brand-lock" aria-label="Delp · Subida de saldo, ir para o painel">
          <span className="logo-fb">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/delp-logo.png" alt="" width={32} height={27} />
            <span className="word">delp</span>
          </span>
          <span className="brand-div" />
          <span className="brand-sub">
            Paixão em fabricar<b>Subida de saldo</b>
          </span>
        </Link>
        {opcoes.length > 0 && <SeletorProjeto atualId={opcoes[0].id} opcoes={opcoes} />}
        <div className="top-dir">
          <nav className="nav" aria-label="Telas">
            <Link href="/" aria-current={ativo === "painel" ? "page" : undefined}>Painel</Link>
            <Link href="/linhagem" aria-current={ativo === "linhagem" ? "page" : undefined}>Linhagem</Link>
            <Link href="/pendencias" aria-current={ativo === "pendencias" ? "page" : undefined}>Pendências</Link>
            <Link href="/importar" aria-current={ativo === "importar" ? "page" : undefined}>Atualizar</Link>
            <Link href="/gestao">Gestão</Link>
          </nav>
          <form action="/api/sair" method="post">
            <button className="btn-sair" type="submit">Sair</button>
          </form>
        </div>
      </div>
    </header>
  );
}

export function Rodape({ arquivo }: { arquivo?: string }) {
  return (
    <footer className="in foot">
      <span><b>Delp</b> · Divulgação interna</span>
      <span>{arquivo ? `Fonte: ${arquivo}` : "Fonte: planilha de saldo"}</span>
    </footer>
  );
}
