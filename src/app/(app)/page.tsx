import { ChevronRight, Upload } from "lucide-react";
import Link from "next/link";
import { BarrasSaldo, FaixaSituacao, FeitoDoTotal, LinhaFabric, faltaFabric } from "@/components/Etiquetas";
import { ListaTarefas, type TarefaResumo } from "@/components/ListaTarefas";
import { EstadoVazio } from "@/components/layout/EstadoVazio";
import { buttonVariants } from "@/components/ui/Button";
import { TileIndicador } from "@/components/ui/TileIndicador";
import { cargaAtiva, prisma } from "@/lib/db";
import { num, pct } from "@/lib/formato";
import { RETRABALHO, descricaoCurta, situacaoTarefa } from "@/lib/regras";

export const dynamic = "force-dynamic";

/** Link de texto dentro de um bloco: sublinhado, alvo de toque de 44px. */
const LINK_TEXTO = "inline-flex min-h-11 items-center font-semibold text-txt underline underline-offset-2 hover:text-delp-red";

export default async function Painel() {
  const carga = await cargaAtiva();
  if (!carga) {
    return (
      <div className="rounded-card border border-subtle bg-bg shadow-subtle">
        <h1 className="sr-only">Painel</h1>
        <EstadoVazio
          icone={Upload}
          titulo="Nenhuma planilha carregada ainda"
          descricao="Importe a planilha de saldo em Atualizar para os dados aparecerem aqui."
          acao={
            <Link className={buttonVariants.ghost} href="/importar">
              Ir para Atualizar
            </Link>
          }
        />
      </div>
    );
  }

  const [tarefas, totalComp, pendComp, retrabalho, retrabalhoPend] = await Promise.all([
    prisma.tarefa.findMany({ where: { cargaId: carga.id }, orderBy: { ordem: "asc" } }),
    prisma.componente.count({ where: { cargaId: carga.id } }),
    prisma.componente.count({ where: { cargaId: carga.id, apontado: { lte: 0 } } }),
    prisma.componente.count({ where: { cargaId: carga.id, tarPai: RETRABALHO } }),
    prisma.componente.count({ where: { cargaId: carga.id, tarPai: RETRABALHO, apontado: { lte: 0 } } }),
  ]);

  const avanco = carga.totalPrevisto > 0 ? carga.totalRealizado / carga.totalPrevisto : 0;
  const fabric = carga.totalPrevisto > 0 ? carga.totalEsperado / carga.totalPrevisto : 0;
  const situacoes = tarefas.map((t) => situacaoTarefa(t.avanco));
  const concluidas = situacoes.filter((s) => s === "concluida").length;
  const semAvanco = situacoes.filter((s) => s === "sem-avanco").length;
  const andamento = situacoes.filter((s) => s === "andamento").length;
  // Detalhe dos cards (16/11): só o que a carga já traz — execuções feitas = total − pendentes (EXEC. PEND);
  // componentes baixados = total − pendentes de baixa (APONTADO = 0).
  const execFeitas = Math.max(0, carga.totalExecucoes - carga.totalExecPend);
  const codigosExecPend = tarefas.filter((t) => t.execPend > 0).length;
  const codigosPendBaixa = tarefas.filter((t) => t.pendMaterial > 0).length;
  const lista: TarefaResumo[] = tarefas.map((t) => ({
    cod: t.codTarefa,
    descricao: descricaoCurta(t.descricao),
    desenho: t.desenho,
    execucoes: t.execucoes,
    execPend: t.execPend,
    previsto: t.qtdPrevisto,
    realizado: t.qtdRealizada,
    avanco: t.avanco,
    fabric: carga.comFabric ? t.avancoFabric : null,
    pendMaterial: t.pendMaterial,
    totalComp: t.totalComp,
    opsTotal: t.opsTotal,
    opsComSaldo: t.opsComSaldo,
  }));

  return (
    <div className="flex flex-col gap-4">
      {/* A trilha do topo nomeia a tela; o título fica para leitor de tela (regra do Visto). */}
      <h1 className="sr-only">Saldo {carga.projeto}</h1>

      {/* Atalho para a Gestão, feita para a tela pequena: aparece junto com a gaveta (abaixo de 900px). */}
      <Link
        href="/gestao"
        className="flex min-h-11 items-center justify-between gap-2.5 rounded-btn bg-txt px-3.5 py-2.5 font-semibold text-bg shell:hidden"
      >
        <span>Está no celular? Abra a Gestão, feita para a tela pequena.</span>
        <ChevronRight size={18} aria-hidden="true" />
      </Link>

      <section aria-label="Resumo do projeto" className="grade-indicadores">
        <TileIndicador
          rotulo="Avanço do saldo"
          valor={pct(avanco)}
          detalhe={`${num(carga.totalRealizado, 1)} de ${num(carga.totalPrevisto, 1)} previsto · centro de custo ${carga.centroCusto}`}
        >
          <BarrasSaldo saldo={avanco} fabric={carga.comFabric ? fabric : null} />
          {carga.comFabric && <LinhaFabric saldo={avanco} fabric={fabric} falta={faltaFabric(fabric, carga.totalPrevisto, carga.totalRealizado)} />}
        </TileIndicador>
        <TileIndicador
          rotulo="Códigos de tarefa"
          valor={num(semAvanco)}
          sufixo=" sem avanço"
          detalhe={`${num(tarefas.length)} códigos de tarefa no projeto`}
        >
          <FaixaSituacao semAvanco={semAvanco} andamento={andamento} concluidas={concluidas} />
        </TileIndicador>
        <TileIndicador
          rotulo="Execuções pendentes"
          valor={num(carga.totalExecPend, 1)}
          detalhe={`${num(carga.totalExecucoes)} execuções no total`}
        >
          <FeitoDoTotal feito={execFeitas} total={carga.totalExecucoes} rotulo="executadas" casas={1} />
          <p className="text-xs text-txt-2">
            <b className="font-mono font-bold text-txt">{num(codigosExecPend)}</b> de <span className="font-mono">{num(tarefas.length)}</span>{" "}
            códigos de tarefa com execução pendente
          </p>
        </TileIndicador>
        <TileIndicador rotulo="Pendentes de baixa" valor={num(pendComp)} detalhe={`${num(totalComp)} componentes no total`}>
          <FeitoDoTotal feito={Math.max(0, totalComp - pendComp)} total={totalComp} rotulo="já baixados" />
          <p className="text-xs text-txt-2">
            <b className="font-mono font-bold text-txt">{num(codigosPendBaixa)}</b> de <span className="font-mono">{num(tarefas.length)}</span>{" "}
            códigos de tarefa com pendência de baixa
          </p>
          <Link href="/pendencias" className={`${LINK_TEXTO} self-start text-xs`}>
            Ver a lista de pendências
          </Link>
        </TileIndicador>
      </section>

      <ListaTarefas
        tarefas={lista}
        nota={
          retrabalho > 0 && (
            <>
              <b className="font-semibold text-txt">Retrabalho:</b> {num(retrabalho)} componentes fora dos códigos de tarefa,{" "}
              {num(retrabalhoPend)} pendentes de baixa.{" "}
              <Link href={`/tarefa/${RETRABALHO}`} className="font-semibold text-txt underline underline-offset-2 hover:text-delp-red">
                Abrir retrabalho
              </Link>
            </>
          )
        }
      />
    </div>
  );
}
