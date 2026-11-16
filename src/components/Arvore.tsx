import Link from "next/link";
import { Copiar } from "./Acoes";
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

export const CLASSE_CORTE: Record<StatusCorte, string> = { apontado: "ok", parcial: "parcial", pendente: "pend" };
const MAX_PLANOS = 4;

/** OP da estrutura (tocar para copiar). Com mais de uma OP, mostra a primeira e "+N". */
export function OpsDaEstrutura({ ops }: { ops: string[] }) {
  if (ops.length === 0) return <span className="no-op">sem OP</span>;
  return (
    <span className="no-op">
      <Copiar valor={ops[0]} tipo="OP" />
      {ops.length > 1 && <small title={ops.slice(1).join(", ")}>+{ops.length - 1} OPs</small>}
    </span>
  );
}

/** Cabeçalho das colunas da árvore. */
export function CabecalhoArvore() {
  return (
    <div className="arvore-cab" aria-hidden="true">
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
    <details className="no" open={nivel === 0}>
      <summary>
        <span className="no-id">
          <span className="no-cod mono">{no.codEstrutura}</span>
          <span className="no-nome">{no.nome}</span>
        </span>
        <OpsDaEstrutura ops={no.ops.map((o) => o.op)} />
        <span className="no-saldo mono">
          {num(no.efetivada, 2)} de {num(no.planejada, 2)}
        </span>
        <b className="no-pend">{no.pendentesTotal > 0 ? num(no.pendentesTotal) : ""}</b>
        <span className="no-sit">
          <EtiquetaSaldo status={no.status} />
          {item && <EtiquetaMaterial pendentes={item.pendentes} linhas={item.linhas} prefixo="No pai:" />}
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
      <div className="item-cab">
        <span className="rotulo">Componente</span>
        <EtiquetaMaterial pendentes={it.pendentes} linhas={it.linhas} />
        <Copiar valor={it.codigoPrd} tipo="Código" />
        <span className="item-nome">{it.nome}</span>
        <span className="item-qtd">
          Usado {num(it.qtdUsada, 3)} {it.unidade} · apontado {num(it.apontado, 3)}
        </span>
        {Object.keys(it.ra).length > 0 && <span className={`item-ra${it.ra["RA Pendente"] ? " item-ra-pend" : ""}`}>{textoRa(it.ra)}</span>}
        {outraTarefa && (
          <Link className="item-link" href={`/tarefa/${encodeURIComponent(it.tarFilho)}`}>
            {it.tarFilho === RETRABALHO ? "Vem do retrabalho ›" : `Fabricado na tarefa ${it.tarFilho} ›`}
          </Link>
        )}
      </div>
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
            <span className="rotulo">Plano de corte</span>
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
        <span className="rotulo">Plano de corte</span>
        {rotuloPlano}
        <span className="tag neutro">Fora da aba CNC_PCQ</span>
        <span className="corte-meta">{mostrarOp ? `OP ${op} · ` : ""}plano informado na coluna CNC, sem linha no controle de CNC</span>
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
  return (
    <li className="corte">
      <span className="rotulo">Plano de corte</span>
      {rotuloPlano}
      <span className={`tag ${CLASSE_CORTE[st]}`}>{ROTULO_CORTE[st]}</span>
      <span className="corte-meta">{meta}</span>
      <details className="corte-detalhes">
        <summary>Ver detalhes</summary>
        <dl>
          {resumo && (
            <div>
              <dt className="rotulo">Plano</dt>
              <dd>
                {num(resumo.cortadas)} de {num(resumo.ops)} OPs cortadas
              </dd>
            </div>
          )}
          <div>
            <dt className="rotulo">Lote</dt>
            <dd>{info.lote ?? "–"}</dd>
          </div>
          <div>
            <dt className="rotulo">MP da OP</dt>
            <dd>{info.qtdMpFinal > 0 ? `${num(info.qtdMpFinal, 1)} ${unidade}` : "–"}</dd>
          </div>
          <div>
            <dt className="rotulo">Sucata do plano</dt>
            <dd>{info.qtdSucata > 0 ? `${num(info.qtdSucata, 1)} ${unidade}` : "–"}</dd>
          </div>
          <div>
            <dt className="rotulo">Criado em</dt>
            <dd>{info.criadoEm ? dataCurta(info.criadoEm) : "–"}</dd>
          </div>
        </dl>
      </details>
    </li>
  );
}
