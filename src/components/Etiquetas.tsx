import { clsx } from "clsx";
import { ROTULO_SALDO, ROTULO_SITUACAO, rotuloMaterial, situacaoTarefa, type SituacaoTarefa, type StatusSaldo } from "@/lib/regras";
import { num, pct } from "@/lib/formato";
import { atrasoQtd, ritmoSaldo } from "@/lib/kpis";
import { COR_ASCENT, SELO_TOM, TOM_DA_CLASSE } from "@/lib/cores";
import { Badge } from "./ui/Badge";

// Situação: o Badge do Visto (texto + ponto colorido; a cor nunca anda sozinha).
// Barras: a escala de vermelhos (src/lib/cores.ts); a da fabricação sempre com a legenda escrita.

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
export function TextoRitmo({
  saldo,
  fabric,
  falta,
  curto,
  className,
}: {
  saldo: number;
  fabric: number;
  falta?: number;
  curto?: boolean;
  /** Troca o tamanho do texto ("" herda o de quem está em volta, como na LinhaFabric). */
  className?: string;
}) {
  const { ritmo, pp } = ritmoSaldo(saldo, fabric);
  let texto: string;
  if (ritmo === "atraso") {
    texto = `▼ Atraso de ${num(pp, 1)} p.p.`;
    if (!curto && falta !== undefined && falta > 0) texto += ` · faltam ${num(falta, 1)} para acompanhar a fabricação`;
  } else if (ritmo === "a-frente") texto = curto ? `▲ ${num(pp, 1)} p.p. à frente` : `▲ Saldo ${num(pp, 1)} p.p. à frente da fabricação`;
  else texto = curto ? "= Acompanha" : "= Saldo acompanha a fabricação";
  return (
    <span className={clsx("font-semibold", className ?? (curto ? "text-xs" : "text-sm"), ritmo === "atraso" ? SELO_TOM.danger : SELO_TOM.success)}>
      {texto}
    </span>
  );
}

/**
 * Barra do saldo e, logo embaixo, a barra da fabricação — no mesmo lugar da barra de antes.
 * Fabricação = % AVANÇO FABRIC (guias com 100%): o saldo que já deveria ter subido.
 * Com a fabricação, Saldo no degrau 5 e Fabricação no 3 da escala de vermelhos (degraus não
 * vizinhos); a legenda da fabricação vem escrita na LinhaFabric.
 * Decisão da main (commit 3797179, 16/11): os blocos ficam como eram e só ganham a fabricação.
 */
export function BarrasSaldo({ saldo, fabric, altura }: { saldo: number; fabric?: number | null; altura?: string }) {
  const comFabric = fabric !== undefined && fabric !== null;
  return (
    <span className="flex min-w-0 flex-col gap-1">
      <Barra valor={saldo} cor={comFabric ? COR_ASCENT.saldo : COR_ASCENT.avanco} className={altura} />
      {comFabric && <Barra valor={fabric} cor={COR_ASCENT.fabricacao} className={altura} />}
    </span>
  );
}

/**
 * Linha curta embaixo das barras: "■ Fabricação 88,4% · ▼ Atraso de 38,7 p.p.".
 * Com `falta` (nos blocos de destaque), acrescenta quanto falta subir para acompanhar a fabricação.
 */
export function LinhaFabric({ saldo, fabric, falta, pequena }: { saldo: number; fabric: number; falta?: number; pequena?: boolean }) {
  return (
    <span className={clsx("flex flex-wrap items-baseline gap-x-2.5 text-txt-2", pequena ? "text-[13px]" : "text-sm")}>
      <span>
        <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm align-[-1px]" style={{ background: COR_ASCENT.fabricacao }} aria-hidden="true" />
        Fabricação <b className="font-mono font-bold text-txt">{pct(fabric)}</b>
      </span>
      <TextoRitmo saldo={saldo} fabric={fabric} falta={falta} curto={falta === undefined} className="" />
    </span>
  );
}

/** Quanto falta subir para o realizado alcançar a fabricação (para a LinhaFabric dos destaques). */
export const faltaFabric = (fabric: number, previsto: number, realizado: number) => atrasoQtd({ realizado, esperado: fabric * previsto });

/**
 * A situação dos códigos numa barra só, dividida em Sem avanço, Em andamento e Concluída, com o número e a
 * parte do total escritos embaixo (degraus 6, 4 e 2 da escala de vermelhos: não vizinhos; o 2 sempre com rótulo).
 */
export function FaixaSituacao({ semAvanco, andamento, concluidas }: { semAvanco: number; andamento: number; concluidas: number }) {
  const total = semAvanco + andamento + concluidas;
  const parte = (n: number) => (total > 0 ? n / total : 0);
  const partes = [
    { rotulo: "Sem avanço", n: semAvanco, cor: COR_ASCENT.semAvanco },
    { rotulo: "Em andamento", n: andamento, cor: COR_ASCENT.andamento },
    { rotulo: "Concluída", n: concluidas, cor: COR_ASCENT.concluida },
  ];
  return (
    <div className="flex flex-col gap-2">
      <span className="flex h-2 overflow-hidden rounded-full bg-bg-3" role="presentation">
        {partes
          .filter((p) => p.n > 0)
          .map((p) => (
            <span key={p.rotulo} data-parte={p.rotulo} className="block h-full" style={{ width: largura(parte(p.n)), background: p.cor }} />
          ))}
      </span>
      <ul className="flex flex-col gap-1 text-xs text-txt-2">
        {partes.map((p) => (
          <li key={p.rotulo} className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: p.cor }} aria-hidden="true" />
            <span className="min-w-0 flex-1">{p.rotulo}</span>
            <b className="font-mono font-bold text-txt">{num(p.n)}</b>
            <span className="w-12 text-right font-mono">{pct(parte(p.n))}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** O que já foi feito de um total: a barra e "X <rótulo> · Y% do total". */
export function FeitoDoTotal({ feito, total, rotulo, casas = 0 }: { feito: number; total: number; rotulo: string; casas?: number }) {
  const parte = total > 0 ? feito / total : 0;
  return (
    <div className="flex flex-col gap-1.5">
      <Barra valor={parte} cor={COR_ASCENT.avanco} />
      <span className="text-xs text-txt-2">
        <b className="font-mono font-bold text-txt">{num(feito, casas)}</b> {rotulo} · <span className="font-mono">{pct(parte)}</span> do total
      </span>
    </div>
  );
}

/** Avanço do saldo de um código: %, "x de y" e a barra. Com o % de fabricação, ganha a barra e a linha da fabricação. */
export function Avanco({ valor, rotulo, fabric }: { valor: number; rotulo?: string; fabric?: number | null }) {
  return (
    <div className="grid min-w-0 grid-cols-[auto_1fr] items-baseline gap-x-2.5 gap-y-1">
      <b className="font-mono text-[17px] font-bold text-txt">{pct(valor)}</b>
      {rotulo ? <small className="font-mono text-xs text-txt-2">{rotulo}</small> : <span />}
      <span className="col-span-2">
        <BarrasSaldo saldo={valor} fabric={fabric} />
      </span>
      {fabric !== undefined && fabric !== null && (
        <span className="col-span-2">
          <LinhaFabric pequena saldo={valor} fabric={fabric} />
        </span>
      )}
    </div>
  );
}
