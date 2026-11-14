import Link from "next/link";
import { EtiquetaMaterial, EtiquetaSaldo } from "./Etiquetas";
import { num } from "@/lib/formato";
import { MATERIAL_DIRETO, RETRABALHO, type ItemArvore, type NoArvore } from "@/lib/regras";

function rotuloOps(ops: { op: string }[]): string {
  if (ops.length === 0) return "sem OP";
  if (ops.length <= 3) return `OP ${ops.map((o) => o.op).join(", ")}`;
  return `${ops.length} OPs (${ops.slice(0, 2).map((o) => o.op).join(", ")}…)`;
}

/** Estrutura (OP) com seus componentes. Componentes que são estruturas desta execução abrem como filhos. */
export function NoEstrutura({ no, nivel, pai, item }: { no: NoArvore; nivel: number; pai: string; item?: ItemArvore }) {
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
            {it.filho ? <NoEstrutura no={it.filho} nivel={nivel + 1} pai={pai} item={it} /> : <Item it={it} pai={pai} />}
          </li>
        ))}
      </ul>
    </details>
  );
}

function Item({ it, pai }: { it: ItemArvore; pai: string }) {
  const outraTarefa = it.tarFilho !== MATERIAL_DIRETO && it.tarFilho !== pai;
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
    </div>
  );
}
