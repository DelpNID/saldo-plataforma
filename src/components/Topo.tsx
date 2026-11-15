import Link from "next/link";
import { quando } from "@/lib/formato";

interface Props {
  ativo: "painel" | "pendencias" | "tarefa" | "importar";
  projeto?: string;
  atualizado?: Date;
}

export function Topo({ ativo, projeto, atualizado }: Props) {
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
        <nav className="nav" aria-label="Telas">
          <Link href="/" aria-current={ativo === "painel" ? "page" : undefined}>Painel</Link>
          <Link href="/pendencias" aria-current={ativo === "pendencias" ? "page" : undefined}>Pendências</Link>
          <Link href="/importar" aria-current={ativo === "importar" ? "page" : undefined}>Atualizar</Link>
        </nav>
        <div className="top-dir">
          {projeto && atualizado && (
            <span className="chip" title="Data da última carga da planilha">
              {projeto} · atualizado {quando(atualizado)}
            </span>
          )}
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
