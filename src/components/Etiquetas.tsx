import { clsx } from "clsx";
import { ROTULO_SALDO, ROTULO_SITUACAO, rotuloMaterial, situacaoTarefa, type SituacaoTarefa, type StatusSaldo } from "@/lib/regras";
import { num, pct } from "@/lib/formato";
import { atrasoQtd, ritmoSaldo } from "@/lib/kpis";
import { COR_ASCENT, SELO_TOM, TOM_DA_CLASSE } from "@/lib/cores";
import { Badge } from "./ui/Badge";

// Situação: o Badge do Visto (texto + ponto colorido; a cor nunca anda sozinha).
// Barras: a escala de vermelhos (src/lib/cores.ts), sempre com nome e % escritos.

const CLASSE_SALDO: Record<StatusSaldo, keyof typeof TOM_DA_CLASSE> = { ok: "ok", parcial: "parcial", "sem-saldo": "pend", "sem-dado": "neutro" };
const CLASSE_SITUACAO: Record<SituacaoTarefa, keyof typeof TOM_DA_CLASSE> = { concluida: "ok", andamento: "parcial", "sem-avanco": "pend" };

/** Situação do código de tarefa pelo avanço do saldo (mesma regra das contagens do Painel). */
export function EtiquetaSituacao({ avanco }: { avanco: number }) {
  const s = situacaoTarefa(avanco);
  return <Badge tone={TOM_DA_CLASSE[CLASSE_SITUACAO[s]]}>{ROTULO_SITUACAO[s]}</Badge>;
}

export function EtiquetaSaldo({ status }: { status: StatusSaldo }) {
  return <Badge tone={TOM_DA_CLASSE[CLASSE_SALDO[status]]}>{ROTULO_SALDO[status]}</Badge>;
}

/** Material: todas as linhas apontadas, nenhuma, ou parte delas (quando a peça aparece em mais de uma OP). */
export function EtiquetaMaterial({ pendentes, linhas, prefixo }: { pendentes: number; linhas: number; prefixo?: string }) {
  const r = rotuloMaterial(pendentes, linhas);
  return (
    <Badge tone={TOM_DA_CLASSE[r.classe]}>
      {prefixo ? `${prefixo} ` : ""}
      {r.texto}
    </Badge>
  );
}

const largura = (v: number) => `${Math.max(0, Math.min(1, v)) * 100}%`;

/** A trilha e o preenchimento de uma barra de avanço, na cor de gráfico pedida. */
export function Barra({ valor, cor, className }: { valor: number; cor: string; className?: string }) {
  return (
    <span className={clsx("block h-2 overflow-hidden rounded-full bg-bg-3", className)} role="presentation">
      <span className="block h-full rounded-full" style={{ width: largura(valor), background: cor }} />
    </span>
  );
}

/** Atraso, acompanha ou à frente: escrito por extenso, a cor só reforça. */
export function TextoRitmo({ saldo, fabric, falta, curto }: { saldo: number; fabric: number; falta?: number; curto?: boolean }) {
  const { ritmo, pp } = ritmoSaldo(saldo, fabric);
  let texto: string;
  if (ritmo === "atraso") {
    texto = `▼ Atraso de ${num(pp, 1)} p.p.`;
    if (!curto && falta !== undefined && falta > 0) texto += ` · faltam ${num(falta, 1)} para acompanhar a fabricação`;
  } else if (ritmo === "a-frente") texto = curto ? `▲ ${num(pp, 1)} p.p. à frente` : `▲ Saldo ${num(pp, 1)} p.p. à frente da fabricação`;
  else texto = curto ? "= Acompanha" : "= Saldo acompanha a fabricação";
  return (
    <span className={clsx("font-semibold", curto ? "text-xs" : "text-sm", ritmo === "atraso" ? SELO_TOM.danger : SELO_TOM.success)}>
      {texto}
    </span>
  );
}

/**
 * Saldo × Fabricação: duas barras, cada uma com o nome e o % escritos.
 * Fabricação = % AVANÇO FABRIC (guias com 100%): o saldo que já deveria ter subido.
 * Saldo no degrau 5 e Fabricação no 3 da escala de vermelhos (degraus não vizinhos).
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
  const linha = (nome: string, valor: number, cor: string) => (
    <span
      className={clsx(
        "grid min-w-0 items-center",
        compacto ? "grid-cols-[minmax(0,1fr)_auto] gap-x-2 gap-y-px" : "grid-cols-[84px_minmax(0,1fr)_56px] gap-x-2.5",
      )}
    >
      <span className={clsx("font-semibold text-txt-2", compacto ? "col-start-1 row-start-1 text-xs" : "text-[13px]")}>{nome}</span>
      <Barra valor={valor} cor={cor} className={compacto ? "col-span-2 row-start-2 h-[7px]" : "h-2.5"} />
      <b className={clsx("text-right font-mono font-bold text-txt", compacto ? "col-start-2 row-start-1 text-sm" : "text-[15px]")}>{pct(valor)}</b>
    </span>
  );
  return (
    <div className={clsx("flex min-w-0 flex-col", compacto ? "gap-1" : "gap-1.5")}>
      {linha("Saldo", saldo, COR_ASCENT.saldo)}
      {linha("Fabricação", fabric, COR_ASCENT.fabricacao)}
      <TextoRitmo saldo={saldo} fabric={fabric} falta={falta} curto={compacto} />
    </div>
  );
}

/** Avanço do saldo de um código. Com o % de fabricação, vira a comparação Saldo × Fabricação. */
export function Avanco({ valor, rotulo, fabric }: { valor: number; rotulo?: string; fabric?: number | null }) {
  if (fabric !== undefined && fabric !== null) {
    return (
      <div className="flex min-w-0 flex-col gap-1">
        <Comparacao compacto saldo={valor} fabric={fabric} />
        {rotulo && <small className="font-mono text-xs text-txt-2">{rotulo}</small>}
      </div>
    );
  }
  return (
    <div className="grid min-w-0 grid-cols-[auto_1fr] items-baseline gap-x-2.5 gap-y-1">
      <b className="font-mono text-[17px] font-bold text-txt">{pct(valor)}</b>
      {rotulo ? <small className="font-mono text-xs text-txt-2">{rotulo}</small> : <span />}
      <Barra valor={valor} cor={COR_ASCENT.avanco} className="col-span-2" />
    </div>
  );
}
