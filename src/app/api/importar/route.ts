// Recebe a planilha já lida no navegador (JSON compactado), confere e troca os dados da plataforma.
// Proteções: sessão da equipe (middleware + aqui), senha de importação própria, limite de tamanho,
// validação do formato e a mesma conferência de totais do comando `npm run carga`.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { z } from "zod";
import { prepararCarga, type PlanilhaJson } from "@/lib/carga";
import { prisma } from "@/lib/db";
import { gravarCarga } from "@/lib/gravarCarga";
import { COOKIE, sessaoValida } from "@/lib/sessao";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const LIMITE_ENVIO = 4_400_000; // a Vercel aceita até 4,5 MB por envio
const LIMITE_JSON = 250_000_000;

const Registro = z.record(z.string(), z.unknown());
const Entrada = z.object({
  arquivo: z.string().min(1).max(300),
  centroCusto: z.string().max(100),
  totais: z.object({ execucoes: z.unknown(), execPend: z.unknown(), qtdPrevisto: z.unknown(), qtdRealizada: z.unknown() }),
  tarefas: z.array(Registro).min(1).max(10_000),
  componentes: z.array(Registro).min(1).max(1_000_000),
  ordens: z.array(Registro).max(1_000_000),
  planos: z.array(Registro).max(500_000).optional(),
});

function iguais(a: string, b: string): boolean {
  return timingSafeEqual(createHash("sha256").update(a).digest(), createHash("sha256").update(b).digest());
}

function resposta(status: number, mensagem: string, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ mensagem, ...extra }, { status });
}

function decodificar(v: string | null): string {
  if (!v) return "";
  try {
    return decodeURIComponent(v);
  } catch {
    return "";
  }
}

export async function POST(req: Request) {
  if (!(await sessaoValida(cookies().get(COOKIE)?.value, process.env.SESSAO_SEGREDO))) {
    return resposta(401, "Sua sessão expirou. Entre de novo e repita a importação.");
  }
  const senhaImportacao = process.env.IMPORTACAO_SENHA;
  if (!senhaImportacao) return resposta(503, "A importação pelo site está desligada: falta cadastrar IMPORTACAO_SENHA na Vercel.");

  const senha = decodificar(req.headers.get("x-importacao-senha"));
  if (!senha || senha.length > 200 || !iguais(senha, senhaImportacao)) {
    await new Promise((r) => setTimeout(r, 800)); // freia tentativa repetida
    return resposta(401, "Senha de importação incorreta.");
  }

  const corpo = Buffer.from(await req.arrayBuffer());
  if (corpo.length === 0) return resposta(400, "Nenhum dado recebido.");
  if (corpo.length > LIMITE_ENVIO) return resposta(413, "O envio passou de 4,4 MB. Avise o NID.");

  let json: PlanilhaJson;
  try {
    const texto = gunzipSync(corpo, { maxOutputLength: LIMITE_JSON }).toString("utf-8");
    const p = Entrada.safeParse(JSON.parse(texto));
    if (!p.success) return resposta(400, "Os dados recebidos não têm o formato da planilha de saldo.");
    json = p.data as PlanilhaJson;
  } catch {
    return resposta(400, "Não consegui abrir os dados enviados. Escolha a planilha de novo.");
  }

  const arquivo = decodificar(req.headers.get("x-arquivo")).slice(0, 300) || json.arquivo;
  const c = prepararCarga({ ...json, arquivo });
  if (c.divergencias.length > 0 && req.headers.get("x-forcar") !== "1") {
    return resposta(422, "A soma dos componentes não bate com o Resumo Geral. Abra a planilha no Excel, salve e escolha de novo.", {
      divergencias: c.divergencias.slice(0, 20),
    });
  }

  try {
    const inicio = Date.now();
    const r = await gravarCarga(prisma, c, arquivo);
    console.info(
      `[importar] carga ${r.cargaId} ativa · ${arquivo} · ${r.tarefas} tarefas · ${r.componentes} componentes · ${r.planos} planos · ${Date.now() - inicio} ms` +
        (c.divergencias.length ? ` · forçada com ${c.divergencias.length} divergências` : ""),
    );
    const pct = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 }).format(r.avanco * 100);
    return resposta(200, `Plataforma atualizada com ${arquivo}: ${pct}% do saldo subido, ${r.pendentes.toLocaleString("pt-BR")} pendentes de baixa.`, {
      cargaId: r.cargaId,
    });
  } catch (e) {
    console.error("[importar] falha ao gravar a carga", e);
    return resposta(500, "Não consegui gravar os dados. Nada foi trocado: a plataforma continua com a carga anterior. Tente de novo.");
  }
}
