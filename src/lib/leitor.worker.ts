/// <reference lib="webworker" />
// Lê a planilha no navegador, fora da tela, para a página não travar.
// Devolve um resumo para conferir e o JSON da carga já compactado (gzip) para enviar.
import { prepararCarga } from "./carga";
import { abasDoArquivo } from "./lerXlsx";
import { ErroPlanilha, lerPlanilha } from "./planilha";

export interface ResumoLeitura {
  projeto: string;
  centroCusto: string;
  tarefas: number;
  componentes: number;
  ordens: number;
  planos: number;
  pendentes: number;
  avanco: number;
  divergencias: { codTarefa: string; campo: string; planilha: number; calculado: number }[];
  cncSemControle: number;
  temAbaCnc: boolean;
  bytesEnvio: number;
}

export type RespostaLeitor = { ok: true; resumo: ResumoLeitura; gz: ArrayBuffer } | { ok: false; erro: string };

const ctx = self as unknown as DedicatedWorkerGlobalScope;

ctx.onmessage = async (ev: MessageEvent<{ dados: ArrayBuffer; nome: string }>) => {
  try {
    const json = lerPlanilha(abasDoArquivo(ev.data.dados), ev.data.nome);
    const c = prepararCarga(json);
    const gz = await new Response(new Blob([JSON.stringify(json)]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer();
    const resumo: ResumoLeitura = {
      projeto: c.projeto,
      centroCusto: c.centroCusto,
      tarefas: c.tarefas.length,
      componentes: c.componentes.length,
      ordens: c.ordens.length,
      planos: c.planos.length,
      pendentes: c.componentes.filter((x) => x.apontado <= 0).length,
      avanco: c.totais.previsto > 0 ? c.totais.realizado / c.totais.previsto : 0,
      divergencias: c.divergencias.slice(0, 20),
      cncSemControle: c.cncSemControle,
      temAbaCnc: (json.planos?.length ?? 0) > 0,
      bytesEnvio: gz.byteLength,
    };
    const r: RespostaLeitor = { ok: true, resumo, gz };
    ctx.postMessage(r, [gz]);
  } catch (e) {
    const erro = e instanceof ErroPlanilha ? e.message : "Não consegui ler a planilha. Confira se é a planilha de saldo salva pelo Excel.";
    if (!(e instanceof ErroPlanilha)) console.error("[importar] falha na leitura", e);
    const r: RespostaLeitor = { ok: false, erro };
    ctx.postMessage(r);
  }
};
