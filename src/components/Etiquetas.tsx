import { ROTULO_SALDO, ROTULO_SITUACAO, rotuloMaterial, situacaoTarefa, type SituacaoTarefa, type StatusSaldo } from "@/lib/regras";
import { pct } from "@/lib/formato";

const CLASSE_SALDO: Record<StatusSaldo, string> = { ok: "ok", parcial: "parcial", "sem-saldo": "pend", "sem-dado": "neutro" };
const CLASSE_SITUACAO: Record<SituacaoTarefa, string> = { concluida: "ok", andamento: "parcial", "sem-avanco": "pend" };

/** Situação do código de tarefa pelo avanço do saldo (mesma regra das contagens do Painel). */
export function EtiquetaSituacao({ avanco }: { avanco: number }) {
  const s = situacaoTarefa(avanco);
  return <span className={`tag ${CLASSE_SITUACAO[s]}`}>{ROTULO_SITUACAO[s]}</span>;
}

export function EtiquetaSaldo({ status }: { status: StatusSaldo }) {
  return <span className={`tag ${CLASSE_SALDO[status]}`}>{ROTULO_SALDO[status]}</span>;
}

/** Material: todas as linhas apontadas, nenhuma, ou parte delas (quando a peça aparece em mais de uma OP). */
export function EtiquetaMaterial({ pendentes, linhas, prefixo }: { pendentes: number; linhas: number; prefixo?: string }) {
  const r = rotuloMaterial(pendentes, linhas);
  return (
    <span className={`tag ${r.classe}`}>
      {prefixo ? `${prefixo} ` : ""}
      {r.texto}
    </span>
  );
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
