import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { Copiar } from "./Acoes";
import { EtiquetaMaterial, EtiquetaSaldo } from "./Etiquetas";
import { Badge } from "./ui/Badge";
import { TOM_DA_CLASSE } from "@/lib/cores";
import { dataCurta, num } from "@/lib/formato";
import {
  MATERIAL_DIRETO,
  RETRABALHO,
  ROTULO_CORTE,
  statusCorte,
  tipoPlano,
  usaPlanoDeCorte,
  type ItemArvore,
  type NoArvore,
  type StatusCorte,
  textoRa,
} from "@/lib/regras";

/** Linha da aba CNC_PCQ: a OP dentro do plano de corte. */
export interface InfoCorte {
  plano: string;
  op: string;
  qtdPrev: number;
  qtdApont: number;
  statusOp: string;
  lote: string | null;
  criadoEm: string | null;
  qtdSucata: number;
  qtdMpFinal: number;
}

/** Resumo do plano inteiro (todas as OPs que ele corta). */
export interface ResumoPlano {
  ops: number;
  cortadas: number;
}

export interface Cortes {
  linha: Map<string, InfoCorte>; // chave "OP|PLANO"
  plano: Map<string, ResumoPlano>;
}

export const chaveCorte = (op: string, plano: string) => `${op}|${plano}`;

export const CLASSE_CORTE: Record<StatusCorte, "ok" | "parcial" | "pend"> = { apontado: "ok", parcial: "parcial", pendente: "pend" };
const MAX_PLANOS = 4;
/** Recuo de cada nível da árvore (px). */
const RECUO = 14;

/** As colunas da árvore: estrutura, OP, saldo, pendentes, situação. */
const GRADE_ARVORE = "grid grid-cols-[minmax(0,1fr)_100px_64px_60px_178px] items-center gap-2.5";
/** Rótulo micro-caps (régua TITULO_SECAO do Visto, em 11px). */
const ROTULO = "text-[11px] font-bold uppercase tracking-[0.08em] text-txt-2";

/** OP da estrutura (tocar para copiar). Com mais de uma OP, mostra a primeira e "+N". */
export function OpsDaEstrutura({ ops }: { ops: string[] }) {
  if (ops.length === 0) return <span className="no-op text-sm text-txt-2">sem OP</span>;
  return (
    <span className="no-op flex flex-col items-start leading-tight">
      <Copiar valor={ops[0]} tipo="OP" />
      {ops.length > 1 && (
        <small className="text-xs text-txt-2" title={ops.slice(1).join(", ")}>
          +{ops.length - 1} OPs
        </small>
      )}
    </span>
  );
}

/** Cabeçalho das colunas da árvore. */
export function CabecalhoArvore() {
  return (
    <div className={`${GRADE_ARVORE} border-b border-med px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-txt-muted`} aria-hidden="true">
      <span>Estrutura</span>
      <span>OP</span>
      <span>Saldo</span>
      <span>Pend.</span>
      <span>Situação</span>
    </div>
  );
}

/** Estrutura (OP) com seus componentes. Componentes que são estruturas desta execução abrem como filhos. */
export function NoEstrutura({ no, nivel, pai, item, cortes }: { no: NoArvore; nivel: number; pai: string; item?: ItemArvore; cortes?: Cortes }) {
  return (
    // data-no: o "Expandir/Recolher tudo" (ControlesTarefa) acha os nós por aqui.
    <details data-no open={nivel === 0}>
      <summary
        className={`${GRADE_ARVORE} min-h-12 cursor-pointer list-none border-b border-subtle px-4 py-1 transition-colors hover:bg-bg-2 [&::-webkit-details-marker]:hidden`}
      >
        <span className="grid min-w-0 grid-cols-[22px_minmax(0,1fr)] items-center leading-tight" style={{ paddingLeft: nivel * RECUO }}>
          <ChevronRight
            size={16}
            aria-hidden="true"
            className="row-span-2 text-txt-2 transition-transform [details[open]>summary_&]:rotate-90"
          />
          <span className="font-mono text-[13px] text-txt-2">{no.codEstrutura}</span>
          <span className="col-start-2 break-words font-semibold text-txt">{no.nome}</span>
        </span>
        <OpsDaEstrutura ops={no.ops.map((o) => o.op)} />
        <span className="font-mono text-sm text-txt">
          {num(no.efetivada, 2)} de {num(no.planejada, 2)}
        </span>
        <b className="font-mono text-sm font-bold text-txt">{no.pendentesTotal > 0 ? num(no.pendentesTotal) : ""}</b>
        <span className="flex flex-col items-start gap-1">
          <EtiquetaSaldo status={no.status} />
          {item && <EtiquetaMaterial pendentes={item.pendentes} linhas={item.linhas} prefixo="No pai:" />}
        </span>
      </summary>
      <ul className="flex flex-col">
        {no.itens.map((it) => (
          <li key={it.codigoPrd}>
            {it.filho ? (
              <NoEstrutura no={it.filho} nivel={nivel + 1} pai={pai} item={it} cortes={cortes} />
            ) : (
              <Item it={it} pai={pai} cortes={cortes} nivel={nivel + 1} />
            )}
          </li>
        ))}
      </ul>
    </details>
  );
}

function Item({ it, pai, cortes, nivel }: { it: ItemArvore; pai: string; cortes?: Cortes; nivel: number }) {
  const outraTarefa = it.tarFilho !== MATERIAL_DIRETO && it.tarFilho !== pai;
  const variasOps = new Set(it.planos.map((p) => p.op)).size > 1;
  return (
    <div className="flex flex-col gap-2 border-b border-subtle bg-bg-2/60 py-2.5 pr-4" style={{ paddingLeft: 34 + nivel * RECUO }}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className={ROTULO}>Componente</span>
        <EtiquetaMaterial pendentes={it.pendentes} linhas={it.linhas} />
        <Copiar valor={it.codigoPrd} tipo="Código" />
        <span className="min-w-0 flex-[1_1_260px] break-words font-semibold text-txt">{it.nome}</span>
        <span className="font-mono text-sm text-txt">
          Usado {num(it.qtdUsada, 3)} {it.unidade} · apontado {num(it.apontado, 3)}
        </span>
        {Object.keys(it.ra).length > 0 && (
          <span className={`text-[13px] font-semibold ${it.ra["RA Pendente"] ? "text-delp-red" : "text-txt-2"}`}>{textoRa(it.ra)}</span>
        )}
        {outraTarefa && (
          <Link
            className="inline-flex min-h-11 items-center text-sm font-semibold text-delp-red hover:underline"
            href={`/tarefa/${encodeURIComponent(it.tarFilho)}`}
          >
            {it.tarFilho === RETRABALHO ? "Vem do retrabalho ›" : `Fabricado na tarefa ${it.tarFilho} ›`}
          </Link>
        )}
      </div>
      {it.planos.length > 0 && (
        <ul className="flex flex-col gap-1.5 border-t border-subtle pt-2" aria-label="Plano de corte">
          {it.planos.slice(0, MAX_PLANOS).map((p) => (
            <Corte key={chaveCorte(p.op, p.plano)} op={p.op} plano={p.plano} cortes={cortes} unidade={it.unidade} mostrarOp={variasOps} />
          ))}
          {it.planos.length > MAX_PLANOS && (
            <li className="text-sm text-txt-2">+ {it.planos.length - MAX_PLANOS} planos de corte nas outras OPs</li>
          )}
        </ul>
      )}
      {it.planos.length === 0 && usaPlanoDeCorte(it.nome) && (
        <ul className="flex flex-col gap-1.5 border-t border-subtle pt-2" aria-label="Plano de corte">
          <li className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
            <span className={ROTULO}>Plano de corte</span>
            <Badge tone="neutral">Sem plano de corte</Badge>
            <span className="text-sm text-txt-2">coluna CNC vazia: sem CNC ou PA/PC para esta OP na aba CNC_PCQ</span>
          </li>
        </ul>
      )}
    </div>
  );
}

/** O número do plano de corte: selo neutro em mono, com o tipo (CNC ou PA/PC) no title. */
function SeloPlano({ plano }: { plano: string }) {
  return (
    <span title={tipoPlano(plano) === "PA/PC" ? "Plano de corte PA/PC" : "Plano de corte CNC"}>
      <Badge tone="neutral">
        <span className="font-mono">{tipoPlano(plano) === "Outro" ? `Plano ${plano}` : plano}</span>
      </Badge>
    </span>
  );
}

function Corte({ op, plano, cortes, unidade, mostrarOp }: { op: string; plano: string; cortes?: Cortes; unidade: string; mostrarOp: boolean }) {
  const info = cortes?.linha.get(chaveCorte(op, plano));
  const resumo = cortes?.plano.get(plano);
  if (!info) {
    return (
      <li className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
        <span className={ROTULO}>Plano de corte</span>
        <SeloPlano plano={plano} />
        <Badge tone="neutral">Fora da aba CNC_PCQ</Badge>
        <span className="text-sm text-txt-2">{mostrarOp ? `OP ${op} · ` : ""}plano informado na coluna CNC, sem linha no controle de CNC</span>
      </li>
    );
  }
  const st = statusCorte(info.qtdPrev, info.qtdApont);
  const meta = [
    `${mostrarOp ? `OP ${op}: ` : ""}corte ${num(info.qtdApont)} de ${num(info.qtdPrev)} pç`,
    info.statusOp ? `OP ${info.statusOp.toLowerCase()}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const dado = (rotulo: string, valor: string) => (
    <div>
      <dt className={ROTULO}>{rotulo}</dt>
      <dd className="font-mono text-sm font-semibold text-txt">{valor}</dd>
    </div>
  );
  return (
    <li className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
      <span className={ROTULO}>Plano de corte</span>
      <SeloPlano plano={plano} />
      <Badge tone={TOM_DA_CLASSE[CLASSE_CORTE[st]]}>{ROTULO_CORTE[st]}</Badge>
      <span className="font-mono text-sm text-txt">{meta}</span>
      <details className="w-full">
        <summary className="inline-flex min-h-11 cursor-pointer items-center text-sm font-semibold text-txt underline underline-offset-2">
          Ver detalhes
        </summary>
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-x-4 gap-y-2 pt-1">
          {resumo && dado("Plano", `${num(resumo.cortadas)} de ${num(resumo.ops)} OPs cortadas`)}
          {dado("Lote", info.lote ?? "–")}
          {dado("MP da OP", info.qtdMpFinal > 0 ? `${num(info.qtdMpFinal, 1)} ${unidade}` : "–")}
          {dado("Sucata do plano", info.qtdSucata > 0 ? `${num(info.qtdSucata, 1)} ${unidade}` : "–")}
          {dado("Criado em", info.criadoEm ? dataCurta(info.criadoEm) : "–")}
        </dl>
      </details>
    </li>
  );
}
