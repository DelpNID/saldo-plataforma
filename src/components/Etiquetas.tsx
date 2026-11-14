import { ROTULO_SALDO, type StatusSaldo } from "@/lib/regras";
import { pct } from "@/lib/formato";

const CLASSE_SALDO: Record<StatusSaldo, string> = { ok: "ok", parcial: "parcial", "sem-saldo": "pend", "sem-dado": "neutro" };

export function EtiquetaSaldo({ status }: { status: StatusSaldo }) {
  return <span className={`tag ${CLASSE_SALDO[status]}`}>{ROTULO_SALDO[status]}</span>;
}

/** Material: todas as linhas apontadas, nenhuma, ou parte delas (quando a peça aparece em mais de uma OP). */
export function EtiquetaMaterial({ pendentes, linhas, prefixo }: { pendentes: number; linhas: number; prefixo?: string }) {
  const p = prefixo ? `${prefixo} ` : "";
  if (pendentes === 0) return <span className="tag ok">{p}Apontado</span>;
  if (pendentes >= linhas) return <span className="tag pend">{p}Não apontado</span>;
  return <span className="tag parcial">{p}Falta em {pendentes} de {linhas} OPs</span>;
}

export function Avanco({ valor, rotulo }: { valor: number; rotulo?: string }) {
  const largura = `${Math.max(0, Math.min(1, valor)) * 100}%`;
  return (
    <div className="avanco">
      <b>{pct(valor)}</b>
      {rotulo ? <small>{rotulo}</small> : <span />}
      <span className="barra" role="presentation">
        <span className={valor >= 0.9999 ? "concluida" : undefined} style={{ width: largura }} />
      </span>
    </div>
  );
}
