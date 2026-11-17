"use client";

// "O que cobrar": os códigos de tarefa ordenados pelo que mais pesa, em quatro leituras.
// Cada linha mostra o saldo × fabricação (o mesmo bloco do Painel) e os números que dizem
// o que falta: quantidade atrás da fabricação, pendentes de baixa, RA pendente e OPs já
// fabricadas sem saldo efetivado. A linha leva ao código de tarefa.
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Avanco } from "@/components/Etiquetas";
import { Segmentado } from "@/components/ui/Segmentado";
import { num } from "@/lib/formato";

export interface LinhaCobrar {
  cod: string;
  descricao: string;
  desenho: string;
  avanco: number;
  fabric: number | null;
  previsto: number;
  realizado: number;
  falta: number; // atrás da fabricação (0 sem a coluna % AVANÇO FABRIC)
  pendentes: number;
  totalComp: number;
  raPendente: number;
  opsFabSemSaldo: number;
}

type Leitura = "atraso" | "pendentes" | "ra" | "ops";
const LEITURAS: { id: Leitura; rotulo: string; valor: (l: LinhaCobrar) => number; vazio: string }[] = [
  { id: "atraso", rotulo: "Maior atraso", valor: (l) => l.falta, vazio: "Nenhum código com o saldo atrás da fabricação." },
  { id: "pendentes", rotulo: "Mais pendentes", valor: (l) => l.pendentes, vazio: "Nenhum componente pendente de baixa." },
  { id: "ra", rotulo: "Mais RA pendente", valor: (l) => l.raPendente, vazio: "Nenhum componente pendente com RA pendente." },
  { id: "ops", rotulo: "OPs fabricadas sem saldo", valor: (l) => l.opsFabSemSaldo, vazio: "Nenhuma OP fabricada sem saldo." },
];
const QUANTOS = 10;

function Numero({ rotulo, valor, forte }: { rotulo: string; valor: string; forte?: boolean }) {
  return (
    <span className="flex flex-col leading-tight">
      <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-txt-2">{rotulo}</span>
      <b className={forte ? "font-mono text-[15px] font-bold text-delp-red" : "font-mono text-[15px] font-bold text-txt"}>{valor}</b>
    </span>
  );
}

export function CodigosCobrar({ linhas, comFabric }: { linhas: LinhaCobrar[]; comFabric: boolean }) {
  const opcoes = comFabric ? LEITURAS : LEITURAS.filter((l) => l.id !== "atraso");
  const [leitura, setLeitura] = useState<Leitura>(opcoes[0].id);
  const atual = opcoes.find((o) => o.id === leitura) ?? opcoes[0];
  const top = useMemo(
    () =>
      linhas
        .filter((l) => atual.valor(l) > 0)
        .sort((a, b) => atual.valor(b) - atual.valor(a))
        .slice(0, QUANTOS),
    [linhas, atual],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="max-w-full overflow-x-auto">
        <Segmentado<Leitura> ariaLabel="Ordenar por" valor={atual.id} aoTrocar={setLeitura} opcoes={opcoes.map((o) => ({ id: o.id, rotulo: o.rotulo }))} />
      </div>
      {top.length === 0 ? (
        <p className="rounded-btn bg-bg-2 px-3.5 py-3 text-sm text-txt">{atual.vazio}</p>
      ) : (
        <ol>
          {top.map((l, i) => (
            <li key={l.cod} className="border-t border-subtle first:border-t-0">
              <Link
                href={`/tarefa/${encodeURIComponent(l.cod)}`}
                className="group grid grid-cols-[1.5rem_minmax(0,1fr)_14px] items-start gap-x-3 gap-y-2 rounded-btn py-3 text-txt transition-colors hover:bg-bg-2 lg:grid-cols-[1.5rem_minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.1fr)_14px] lg:items-center"
              >
                <span className="pt-0.5 text-right font-mono text-xs font-bold text-txt-2 lg:pt-0">{i + 1}</span>
                <span className="min-w-0 leading-snug">
                  <b className="font-mono font-bold">{l.cod}</b> <span className="break-words font-semibold">{l.descricao}</span>
                  <span className="block font-mono text-xs text-txt-2">{l.desenho}</span>
                </span>
                <ChevronRight
                  size={14}
                  aria-hidden="true"
                  className="row-span-3 self-center text-border-med group-hover:text-delp-red lg:order-last lg:row-span-1"
                />
                <span className="col-start-2 min-w-0 lg:col-start-auto">
                  <Avanco valor={l.avanco} fabric={l.fabric} rotulo={`${num(l.realizado, 1)} de ${num(l.previsto, 1)}`} />
                </span>
                <span className="col-start-2 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-4 lg:col-start-auto lg:grid-cols-2">
                  {comFabric && <Numero rotulo="Atrás da fabric." valor={num(l.falta, 1)} forte={atual.id === "atraso"} />}
                  <Numero rotulo="Pendentes de baixa" valor={`${num(l.pendentes)}`} forte={atual.id === "pendentes"} />
                  <Numero rotulo="RA pendente" valor={num(l.raPendente)} forte={atual.id === "ra"} />
                  <Numero rotulo="OPs fabr. s/ saldo" valor={num(l.opsFabSemSaldo)} forte={atual.id === "ops"} />
                </span>
              </Link>
            </li>
          ))}
        </ol>
      )}
      <p className="text-xs text-txt-2">
        Os {QUANTOS} primeiros em “{atual.rotulo.toLowerCase()}”. Toque num código para ver as execuções, as estruturas e os componentes.
      </p>
    </div>
  );
}
