"use client";

// "Como estava o saldo no mês": a rosca do mês escolhido (saldo subido × pendente, e a fabricação
// no anel de dentro) e, quando já houver mais de um mês, uma barra por mês para comparar.
// Cada mês é a última atualização feita no mês (o histórico guarda um resumo por carga).
import { useState } from "react";
import { Segmentado } from "@/components/ui/Segmentado";
import { COR_ASCENT } from "@/lib/cores";
import { pct } from "@/lib/formato";
import { LegendaRosca, RoscaSaldo } from "./Graficos";

export interface MesGrafico {
  mes: string; // AAAA-MM
  curto: string; // "nov/26"
  longo: string; // "novembro de 2026"
  dia: string; // "16/11" (a carga usada)
  previsto: number;
  realizado: number;
  fabric: number | null;
}

const saldoDe = (m: MesGrafico) => (m.previsto > 0 ? m.realizado / m.previsto : 0);

export function SaldoPorMes({ meses, desde }: { meses: MesGrafico[]; desde: string }) {
  const [escolhido, setEscolhido] = useState(meses[meses.length - 1]?.mes ?? "");
  const m = meses.find((x) => x.mes === escolhido) ?? meses[meses.length - 1];
  if (!m) return <p className="rounded-btn bg-bg-2 px-3.5 py-3 text-sm text-txt">Ainda não há atualização registrada.</p>;
  const saldo = saldoDe(m);

  return (
    <div className="flex flex-col gap-3">
      {meses.length > 1 && (
        <div className="max-w-full overflow-x-auto">
          <Segmentado ariaLabel="Mês" valor={m.mes} aoTrocar={setEscolhido} opcoes={meses.map((x) => ({ id: x.mes, rotulo: x.curto }))} />
        </div>
      )}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <RoscaSaldo saldo={saldo} fabric={m.fabric} rotulo={`Saldo de ${m.longo}`} />
        <div className="flex min-w-[200px] flex-1 flex-col gap-2">
          <p className="text-sm text-txt">
            <b className="capitalize">{m.longo}</b> <span className="text-txt-2">· atualização de {m.dia}</span>
          </p>
          <LegendaRosca saldo={saldo} fabric={m.fabric} previsto={m.previsto} realizado={m.realizado} />
        </div>
      </div>

      {meses.length > 1 ? (
        <div className="flex flex-col gap-1.5" aria-label="Saldo subido por mês">
          <div className="flex h-24 items-end gap-2">
            {meses.map((x) => {
              const s = saldoDe(x);
              return (
                <button
                  key={x.mes}
                  type="button"
                  onClick={() => setEscolhido(x.mes)}
                  aria-pressed={x.mes === m.mes}
                  className="group relative flex h-full min-w-11 flex-1 flex-col justify-end rounded-t-[4px] bg-bg-2"
                  title={`${x.longo}: ${pct(s)} subido${x.fabric !== null ? ` · fabricação ${pct(x.fabric)}` : ""}`}
                >
                  <span
                    className="block w-full rounded-t-[4px]"
                    style={{ height: `${Math.max(2, s * 100)}%`, background: COR_ASCENT.saldo, opacity: x.mes === m.mes ? 1 : 0.55 }}
                  />
                  {x.fabric !== null && (
                    <span
                      className="absolute inset-x-0 block h-0.5"
                      style={{ bottom: `${x.fabric * 100}%`, background: COR_ASCENT.fabricacao }}
                      aria-hidden="true"
                    />
                  )}
                </button>
              );
            })}
          </div>
          <div className="flex gap-2 text-center font-mono text-[11px] text-txt-2">
            {meses.map((x) => (
              <span key={x.mes} className="min-w-11 flex-1">
                {x.curto}
                <b className="block text-txt">{pct(saldoDe(x))}</b>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-txt-2">
          O histórico começou em <span className="font-mono">{desde}</span>. A partir do próximo mês, cada mês ganha a sua barra aqui para comparar.
        </p>
      )}
    </div>
  );
}
