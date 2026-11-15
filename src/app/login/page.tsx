import type { Metadata } from "next";

export const metadata: Metadata = { title: "Entrar" };

export default function Login({ searchParams }: { searchParams: { erro?: string; volta?: string } }) {
  const configurado = Boolean(process.env.ACESSO_SENHA && process.env.SESSAO_SEGREDO);
  const semConfig = !configurado || searchParams.erro === "config";
  const senhaErrada = !semConfig && Boolean(searchParams.erro);
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
        {semConfig && (
          <p className="erro" role="alert">
            O acesso ainda não foi configurado no servidor. Fale com o responsável pela plataforma.
          </p>
        )}
        <label htmlFor="senha">
          Senha da equipe
          <input
            id="senha"
            name="senha"
            type="password"
            className="campo"
            autoComplete="current-password"
            required
            autoFocus
            aria-invalid={senhaErrada ? true : undefined}
            aria-describedby={senhaErrada ? "senha-erro" : undefined}
          />
        </label>
        {senhaErrada && (
          <p className="erro" id="senha-erro" role="alert">
            Senha incorreta.
          </p>
        )}
        <input type="hidden" name="volta" value={searchParams.volta ?? ""} />
        <button className="btn" type="submit">Entrar</button>
      </form>
    </div>
  );
}
