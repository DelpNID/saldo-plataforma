import { ChevronRight, Upload } from "lucide-react";
import Link from "next/link";
import { Barra, Comparacao } from "@/components/Etiquetas";
import { ListaTarefas, type TarefaResumo } from "@/components/ListaTarefas";
import { EstadoVazio } from "@/components/layout/EstadoVazio";
import { buttonVariants } from "@/components/ui/Button";
import { TileIndicador } from "@/components/ui/TileIndicador";
import { COR_ASCENT } from "@/lib/cores";
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
          rotulo={carga.comFabric ? "Avanço do saldo × fabricação" : "Avanço do saldo"}
          valor={pct(avanco)}
          detalhe={`${num(carga.totalRealizado, 1)} de ${num(carga.totalPrevisto, 1)} previsto · centro de custo ${carga.centroCusto}`}
        >
          {carga.comFabric ? (
            <Comparacao saldo={avanco} fabric={fabric} previsto={carga.totalPrevisto} realizado={carga.totalRealizado} />
          ) : (
            <Barra valor={avanco} cor={COR_ASCENT.avanco} />
          )}
        </TileIndicador>
        <TileIndicador
          rotulo="Códigos de tarefa"
          valor={num(semAvanco)}
          sufixo=" sem avanço"
          detalhe={`${num(andamento)} em andamento · ${num(concluidas)} concluídos · ${num(tarefas.length)} no total`}
        />
        <TileIndicador
          rotulo="Execuções pendentes"
          valor={num(carga.totalExecPend, 1)}
          detalhe={`de ${num(carga.totalExecucoes)} execuções`}
        />
        <TileIndicador rotulo="Pendentes de baixa" valor={num(pendComp)} detalhe={`de ${num(totalComp)} componentes`}>
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
