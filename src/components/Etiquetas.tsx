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

/** Barra do saldo e, embaixo dela, a barra da fabricação. Entra no mesmo lugar da barra de antes. */
export function BarrasSaldo({ saldo, fabric }: { saldo: number; fabric?: number | null }) {
  return (
    <>
      <span className="barra" role="presentation">
        <span style={{ width: largura(saldo) }} />
      </span>
      {fabric !== undefined && fabric !== null && (
        <span className="barra barra-fab" role="presentation">
          <span style={{ width: largura(fabric) }} />
        </span>
      )}
    </>
  );
}

/**
 * Linha curta embaixo das barras: "■ Fabricação 88,4% · ▼ Atraso de 38,7 p.p.".
 * Fabricação = % AVANÇO FABRIC (guias com 100%): o saldo que já deveria ter subido.
 * Com `falta`, acrescenta quanto falta subir para acompanhar a fabricação.
 */
export function LinhaFabric({ saldo, fabric, falta }: { saldo: number; fabric: number; falta?: number }) {
  return (
    <span className="fab-linha">
      <span>
        <i className="leg-fab" aria-hidden="true" />
        Fabricação <b>{pct(fabric)}</b>
      </span>
      <TextoRitmo saldo={saldo} fabric={fabric} falta={falta} curto={falta === undefined} />
    </span>
  );
}

/** Falta subir para acompanhar a fabricação (para a LinhaFabric dos blocos de destaque). */
export const faltaFabric = (fabric: number, previsto: number, realizado: number) => atrasoQtd({ realizado, esperado: fabric * previsto });

/** Avanço do saldo de um código: %, "x de y" e a barra. Com o % de fabricação, ganha a barra e a linha da fabricação. */
export function Avanco({ valor, rotulo, fabric }: { valor: number; rotulo?: string; fabric?: number | null }) {
  return (
    <div className="avanco">
      <b>{pct(valor)}</b>
      {rotulo ? <small>{rotulo}</small> : <span />}
      <BarrasSaldo saldo={valor} fabric={fabric} />
      {fabric !== undefined && fabric !== null && <LinhaFabric saldo={valor} fabric={fabric} />}
    </div>
  );
}
