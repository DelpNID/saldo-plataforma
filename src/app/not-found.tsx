import Link from "next/link";

export default function NaoEncontrado() {
  return (
    <div className="login-wrap">
      <div className="card login">
        <span className="kicker">Subida de saldo</span>
        <h1>Não encontrado</h1>
        <p>Esse código não existe na planilha carregada.</p>
        <Link className="btn" href="/">Voltar ao painel</Link>
      </div>
    </div>
  );
}
