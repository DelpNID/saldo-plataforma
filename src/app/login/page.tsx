import type { Metadata } from "next";

export const metadata: Metadata = { title: "Entrar" };

export default function Login({ searchParams }: { searchParams: { erro?: string; volta?: string } }) {
  const configurado = Boolean(process.env.ACESSO_SENHA && process.env.SESSAO_SEGREDO);
  return (
    <div className="login-wrap">
      <form className="card login" action="/api/login" method="post">
        <span className="logo-fb">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/delp-logo.png" alt="" width={32} height={27} />
          <span className="word">delp</span>
        </span>
        <span className="kicker">PCP · Subida de saldo</span>
        <h1>Entrar</h1>
        {!configurado || searchParams.erro === "config" ? (
          <p className="erro" role="alert">O acesso ainda não foi configurado no servidor. Fale com o responsável pela plataforma.</p>
        ) : searchParams.erro ? (
          <p className="erro" role="alert">Senha incorreta. Confira com o responsável e tente de novo.</p>
        ) : null}
        <label htmlFor="senha">
          Senha da equipe
          <input id="senha" name="senha" type="password" className="campo" autoComplete="current-password" required autoFocus />
        </label>
        <input type="hidden" name="volta" value={searchParams.volta ?? ""} />
        <button className="btn" type="submit">Entrar</button>
      </form>
    </div>
  );
}
