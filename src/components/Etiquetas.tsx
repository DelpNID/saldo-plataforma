import { ROTULO_SALDO, ROTULO_SITUACAO, rotuloMaterial, situacaoTarefa, type SituacaoTarefa, type StatusSaldo } from "@/lib/regras";
import { num, pct } from "@/lib/formato";
import { atrasoQtd, ritmoSaldo } from "@/lib/kpis";

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

const largura = (v: number) => `${Math.max(0, Math.min(1, v)) * 100}%`;

/** Atraso, acompanha ou à frente: escrito por extenso, a cor só reforça. */
export function TextoRitmo({ saldo, fabric, falta, curto }: { saldo: number; fabric: number; falta?: number; curto?: boolean }) {
  const { ritmo, pp } = ritmoSaldo(saldo, fabric);
  let texto: string;
  if (ritmo === "atraso") {
    texto = `▼ Atraso de ${num(pp, 1)} p.p.`;
    if (!curto && falta !== undefined && falta > 0) texto += ` · faltam ${num(falta, 1)} para acompanhar a fabricação`;
  } else if (ritmo === "a-frente") texto = curto ? `▲ ${num(pp, 1)} p.p. à frente` : `▲ Saldo ${num(pp, 1)} p.p. à frente da fabricação`;
  else texto = curto ? "= Acompanha" : "= Saldo acompanha a fabricação";
  return <span className={`ritmo ritmo-${ritmo}`}>{texto}</span>;
}

/**
 * Saldo × Fabricação: duas barras, cada uma com o nome e o % escritos.
 * Fabricação = % AVANÇO FABRIC (guias com 100%): o saldo que já deveria ter subido.
 */
export function Comparacao({
  saldo,
  fabric,
  previsto,
  realizado,
  compacto,
}: {
  saldo: number;
  fabric: number;
  previsto?: number;
  realizado?: number;
  compacto?: boolean;
}) {
  const falta = previsto !== undefined && realizado !== undefined ? atrasoQtd({ realizado, esperado: fabric * previsto }) : undefined;
  return (
    <div className={compacto ? "cmp cmp-c" : "cmp"}>
      <span className="cmp-n">Saldo</span>
      <span className="barra cmp-saldo" role="presentation">
        <span style={{ width: largura(saldo) }} />
      </span>
      <b className="cmp-v">{pct(saldo)}</b>
      <span className="cmp-n">Fabricação</span>
      <span className="barra cmp-fab" role="presentation">
        <span style={{ width: largura(fabric) }} />
      </span>
      <b className="cmp-v">{pct(fabric)}</b>
      <TextoRitmo saldo={saldo} fabric={fabric} falta={falta} curto={compacto} />
    </div>
  );
}

/** Avanço do saldo de um código. Com o % de fabricação, vira a comparação Saldo × Fabricação. */
export function Avanco({ valor, rotulo, fabric }: { valor: number; rotulo?: string; fabric?: number | null }) {
  if (fabric !== undefined && fabric !== null) {
    return (
      <div className="avanco avanco-cmp">
        <Comparacao compacto saldo={valor} fabric={fabric} />
        {rotulo && <small>{rotulo}</small>}
      </div>
    );
  }
  return (
    <div className="avanco">
      <b>{pct(valor)}</b>
      {rotulo ? <small>{rotulo}</small> : <span />}
      <span className="barra" role="presentation">
        <span className={valor >= 0.9999 ? "concluida" : undefined} style={{ width: largura(valor) }} />
      </span>
    </div>
  );
}
