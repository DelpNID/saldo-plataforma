import Link from "next/link";
import { EtiquetaMaterial, EtiquetaSaldo } from "./Etiquetas";
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

const CLASSE_CORTE: Record<StatusCorte, string> = { apontado: "ok", parcial: "parcial", pendente: "pend" };
const MAX_PLANOS = 4;

function rotuloOps(ops: { op: string }[]): string {
  if (ops.length === 0) return "sem OP";
  if (ops.length <= 3) return `OP ${ops.map((o) => o.op).join(", ")}`;
  return `${ops.length} OPs (${ops.slice(0, 2).map((o) => o.op).join(", ")}…)`;
}

/** Estrutura (OP) com seus componentes. Componentes que são estruturas desta execução abrem como filhos. */
export function NoEstrutura({ no, nivel, pai, item, cortes }: { no: NoArvore; nivel: number; pai: string; item?: ItemArvore; cortes?: Cortes }) {
  return (
    <details className="no" open={nivel === 0}>
      <summary>
        <EtiquetaSaldo status={no.status} />
        {item && <EtiquetaMaterial pendentes={item.pendentes} linhas={item.linhas} prefixo="No pai:" />}
        <span className="no-cod mono">{no.codEstrutura}</span>
        <span className="no-nome">{no.nome}</span>
        <span className="no-meta">
          {rotuloOps(no.ops)} · saldo {num(no.efetivada, 2)} de {num(no.planejada, 2)}
          {no.pendentesTotal > 0 ? ` · ${num(no.pendentesTotal)} pendentes de baixa` : ""}
        </span>
      </summary>
      <ul className="itens">
        {no.itens.map((it) => (
          <li key={it.codigoPrd}>
            {it.filho ? <NoEstrutura no={it.filho} nivel={nivel + 1} pai={pai} item={it} cortes={cortes} /> : <Item it={it} pai={pai} cortes={cortes} />}
          </li>
        ))}
      </ul>
    </details>
  );
}

function Item({ it, pai, cortes }: { it: ItemArvore; pai: string; cortes?: Cortes }) {
  const outraTarefa = it.tarFilho !== MATERIAL_DIRETO && it.tarFilho !== pai;
  const variasOps = new Set(it.planos.map((p) => p.op)).size > 1;
  return (
    <div className="item">
      <EtiquetaMaterial pendentes={it.pendentes} linhas={it.linhas} />
      <span className="mono">{it.codigoPrd}</span>
      <span className="item-nome">{it.nome}</span>
      <span className="item-qtd">
        Usado {num(it.qtdUsada, 3)} {it.unidade} · apontado {num(it.apontado, 3)}
      </span>
      {outraTarefa && (
        <Link className="item-link" href={`/tarefa/${encodeURIComponent(it.tarFilho)}`}>
          {it.tarFilho === RETRABALHO ? "Vem do retrabalho ›" : `Fabricado na tarefa ${it.tarFilho} ›`}
        </Link>
      )}
      {it.planos.length > 0 && (
        <ul className="cortes" aria-label="Plano de corte">
          {it.planos.slice(0, MAX_PLANOS).map((p) => (
            <Corte key={chaveCorte(p.op, p.plano)} op={p.op} plano={p.plano} cortes={cortes} unidade={it.unidade} mostrarOp={variasOps} />
          ))}
          {it.planos.length > MAX_PLANOS && <li className="corte-meta">+ {it.planos.length - MAX_PLANOS} planos de corte nas outras OPs</li>}
        </ul>
      )}
      {it.planos.length === 0 && usaPlanoDeCorte(it.nome) && (
        <ul className="cortes" aria-label="Plano de corte">
          <li className="corte">
            <span className="tag neutro">Sem plano de corte</span>
            <span className="corte-meta">coluna CNC vazia: sem CNC ou PA/PC para esta OP na aba CNC_PCQ</span>
          </li>
        </ul>
      )}
    </div>
  );
}

function Corte({ op, plano, cortes, unidade, mostrarOp }: { op: string; plano: string; cortes?: Cortes; unidade: string; mostrarOp: boolean }) {
  const info = cortes?.linha.get(chaveCorte(op, plano));
  const resumo = cortes?.plano.get(plano);
  const rotuloPlano = (
    <span className="tag plano" title={tipoPlano(plano) === "PA/PC" ? "Plano de corte PA/PC" : "Plano de corte CNC"}>
      {tipoPlano(plano) === "Outro" ? `Plano ${plano}` : plano}
    </span>
  );
  if (!info) {
    return (
      <li className="corte">
        {rotuloPlano}
        <span className="tag neutro">Fora da aba CNC_PCQ</span>
        <span className="corte-meta">{mostrarOp ? `OP ${op} · ` : ""}plano informado na coluna CNC, sem linha no controle de CNC</span>
      </li>
    );
  }
  const st = statusCorte(info.qtdPrev, info.qtdApont);
  const partes = [
    `${mostrarOp ? `OP ${op}: ` : ""}corte ${num(info.qtdApont)} de ${num(info.qtdPrev)} pç`,
    info.statusOp ? `OP ${info.statusOp.toLowerCase()}` : "",
    resumo ? `plano com ${num(resumo.cortadas)} de ${num(resumo.ops)} OPs cortadas` : "",
    info.lote ? `lote ${info.lote}` : "",
    info.qtdMpFinal > 0 ? `MP da OP ${num(info.qtdMpFinal, 1)} ${unidade}` : "",
    info.qtdSucata > 0 ? `sucata do plano ${num(info.qtdSucata, 1)} ${unidade}` : "",
    info.criadoEm ? `criado em ${dataCurta(info.criadoEm)}` : "",
  ].filter(Boolean);
  return (
    <li className="corte">
      {rotuloPlano}
      <span className={`tag ${CLASSE_CORTE[st]}`}>{ROTULO_CORTE[st]}</span>
      <span className="corte-meta">{partes.join(" · ")}</span>
    </li>
  );
}
