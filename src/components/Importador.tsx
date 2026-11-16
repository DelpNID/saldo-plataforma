"use client";

import { clsx } from "clsx";
import { Check, FileSpreadsheet, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { RespostaLeitor, ResumoLeitura } from "@/lib/leitor.worker";
import { Button, buttonVariants } from "./ui/Button";
import { CLASSE_CAMPO } from "./ui/Campo";

interface Lida {
  nome: string;
  resumo: ResumoLeitura;
  gz: ArrayBuffer;
}

// O erro do envio fica dentro do resumo: a planilha lida continua na tela para tentar de novo
type Fase =
  | { tipo: "inicio" }
  | { tipo: "lendo"; nome: string; desde: number }
  | { tipo: "erroLeitura"; mensagem: string }
  | ({ tipo: "pronto"; erro?: { mensagem: string; senha?: boolean } } & Lida)
  | ({ tipo: "enviando"; desde: number } & Lida)
  | { tipo: "feito"; mensagem: string };

const fmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const n = (v: number) => fmt.format(v);
const LIMITE_ENVIO = 4_400_000;
const ETAPAS = ["Escolher a planilha", "Conferir o resumo", "Atualizado"];

/** Caixas de mensagem nos tokens de estado do Visto (texto + borda; a cor nunca sozinha). */
const ERRO = "rounded-btn border border-danger bg-danger/10 px-3.5 py-2.5 text-sm font-semibold text-delp-red";
const AVISO = "rounded-btn border border-warning-forte bg-warning/10 px-3.5 py-2.5 text-sm font-semibold text-txt";
const APOIO = "text-sm text-txt-2";
const BLOCO = "rounded-card border border-subtle bg-bg shadow-subtle";

function Cronometro({ desde }: { desde: number }) {
  const [, tique] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tique((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="font-mono">{Math.round((Date.now() - desde) / 1000)} s</span>;
}

function Etapas({ atual }: { atual: number }) {
  return (
    <ol className={clsx(BLOCO, "grid grid-cols-1 overflow-hidden sm:grid-cols-3")} aria-label="Passos">
      {ETAPAS.map((t, i) => {
        const feita = i + 1 < atual;
        const corrente = i + 1 === atual;
        return (
          <li
            key={t}
            aria-current={corrente ? "step" : undefined}
            className={clsx(
              "flex min-h-[52px] items-center gap-2.5 border-b-[3px] px-4 py-2 font-semibold",
              i > 0 && "border-t border-t-subtle sm:border-l sm:border-l-subtle sm:border-t-0",
              corrente ? "border-b-delp-red text-txt" : "border-b-transparent",
              feita ? "text-txt" : !corrente && "text-txt-2",
            )}
          >
            <b
              className={clsx(
                "grid h-7 w-7 flex-none place-items-center rounded-full font-mono text-sm",
                feita ? "bg-success-forte text-success-forte-texto" : corrente ? "bg-txt text-bg" : "bg-bg-3 text-txt",
              )}
            >
              {feita ? <Check size={15} aria-label="feito" /> : i + 1}
            </b>
            {t}
          </li>
        );
      })}
    </ol>
  );
}

function Dado({ rotulo, children, destaque }: { rotulo: string; children: ReactNode; destaque?: boolean }) {
  return (
    <div className={clsx("rounded-btn border border-subtle bg-bg-2 px-3.5 py-3", destaque && "col-span-full border-t-[3px] border-t-delp-red")}>
      <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-txt-2">{rotulo}</dt>
      <dd className={clsx("mt-0.5 font-mono font-bold text-txt", destaque ? "text-[30px] leading-tight" : "text-[22px]")}>{children}</dd>
    </div>
  );
}

export function Importador({ habilitada }: { habilitada: boolean }) {
  const router = useRouter();
  const [fase, setFase] = useState<Fase>({ tipo: "inicio" });
  const [senha, setSenha] = useState("");
  const [forcar, setForcar] = useState(false);
  const worker = useRef<Worker | null>(null);
  const campoSenha = useRef<HTMLInputElement>(null);

  useEffect(() => () => worker.current?.terminate(), []);

  const erroSenha = fase.tipo === "pronto" && fase.erro?.senha;
  useEffect(() => {
    if (erroSenha) campoSenha.current?.focus();
  }, [erroSenha]);

  function escolher(arquivo: File | undefined) {
    if (!arquivo) return;
    if (!/\.xlsx$/i.test(arquivo.name)) {
      setFase({ tipo: "erroLeitura", mensagem: "Escolha o arquivo .xlsx da planilha de saldo." });
      return;
    }
    setForcar(false);
    setFase({ tipo: "lendo", nome: arquivo.name, desde: Date.now() });
    worker.current?.terminate();
    const w = new Worker(new URL("../lib/leitor.worker.ts", import.meta.url));
    worker.current = w;
    w.onmessage = (ev: MessageEvent<RespostaLeitor>) => {
      w.terminate();
      worker.current = null;
      if (ev.data.ok) setFase({ tipo: "pronto", nome: arquivo.name, resumo: ev.data.resumo, gz: ev.data.gz });
      else setFase({ tipo: "erroLeitura", mensagem: ev.data.erro });
    };
    w.onerror = () => {
      w.terminate();
      worker.current = null;
      setFase({ tipo: "erroLeitura", mensagem: "O navegador não conseguiu ler a planilha. Tente de novo no Chrome ou no Edge atualizados." });
    };
    arquivo
      .arrayBuffer()
      .then((dados) => w.postMessage({ dados, nome: arquivo.name }, [dados]))
      .catch(() => setFase({ tipo: "erroLeitura", mensagem: "Não consegui abrir o arquivo. Feche a planilha no Excel e tente de novo." }));
  }

  async function enviar() {
    if (fase.tipo !== "pronto") return;
    const lida: Lida = { nome: fase.nome, resumo: fase.resumo, gz: fase.gz };
    setFase({ tipo: "enviando", desde: Date.now(), ...lida });
    try {
      const res = await fetch("/api/importar", {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          "X-Importacao-Senha": encodeURIComponent(senha),
          "X-Arquivo": encodeURIComponent(lida.nome),
          ...(forcar ? { "X-Forcar": "1" } : {}),
        },
        body: lida.gz,
      });
      if (res.redirected && new URL(res.url).pathname === "/login") {
        setFase({ tipo: "pronto", ...lida, erro: { mensagem: "Sua sessão expirou. Entre de novo e repita a importação." } });
        return;
      }
      const corpo = (await res.json().catch(() => ({}))) as { mensagem?: string };
      if (res.ok) {
        setSenha("");
        setFase({ tipo: "feito", mensagem: corpo.mensagem ?? "Plataforma atualizada." });
        // A moldura (seletor de projeto, número de Pendências) vive no layout, que não se refaz
        // sozinho: o refresh traz a carga nova para ela.
        router.refresh();
      } else {
        if (res.status === 401) setSenha("");
        setFase({ tipo: "pronto", ...lida, erro: { mensagem: corpo.mensagem ?? `Falhou (código ${res.status}). Tente de novo.`, senha: res.status === 401 } });
      }
    } catch {
      setFase({ tipo: "pronto", ...lida, erro: { mensagem: "Sem conexão com a plataforma. Confira a internet e tente de novo." } });
    }
  }

  const lida = fase.tipo === "pronto" || fase.tipo === "enviando" ? fase : null;
  const resumo = lida?.resumo ?? null;
  const grande = resumo ? resumo.bytesEnvio > LIMITE_ENVIO : false;
  const travado = !habilitada || !senha || grande || (resumo ? resumo.divergencias.length > 0 && !forcar : true);
  const etapa = fase.tipo === "feito" ? 3 : lida ? 2 : 1;
  const ocupado = fase.tipo === "lendo" || fase.tipo === "enviando";

  return (
    <div className="flex flex-col gap-4">
      <Etapas atual={etapa} />
      {!habilitada && (
        <p className={AVISO} role="note">
          <b>Importação pelo site desligada.</b> Falta cadastrar a senha de importação (<span className="font-mono">IMPORTACAO_SENHA</span>) na
          Vercel. Enquanto isso, a atualização é feita pelo NID com o comando de carga.
        </p>
      )}
      <ol className="flex max-w-[80ch] list-decimal flex-col gap-1 pl-[22px] text-sm text-txt-2">
        <li>
          <b className="text-txt">Atualize e salve</b> a planilha no Excel, para as fórmulas ficarem recalculadas.
        </li>
        <li>
          <b className="text-txt">Escolha o arquivo</b> abaixo. A plataforma lê e mostra um resumo.
        </li>
        <li>
          <b className="text-txt">Confira o resumo</b>, digite a senha de importação e atualize. A troca acontece de uma vez, só no final.
        </li>
      </ol>

      <label
        className={clsx(
          BLOCO,
          "relative flex cursor-pointer flex-col items-center gap-1.5 border-2 border-dashed !border-med px-6 py-7 text-center transition-colors hover:!border-delp-red focus-within:!border-delp-red focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-delp-red",
          ocupado && "cursor-progress opacity-60",
        )}
      >
        <input
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          disabled={ocupado}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          onChange={(e) => {
            escolher(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <FileSpreadsheet size={26} className="text-delp-red" aria-hidden="true" />
        <span className="text-lg font-bold text-txt">
          {fase.tipo === "inicio" || fase.tipo === "feito" ? "Escolher a planilha (.xlsx)" : "Escolher outra planilha"}
        </span>
        <span className={clsx(APOIO, "max-w-[70ch]")}>
          A planilha é lida aqui no seu computador. Só os dados das abas Resumo Geral, Componentes, Dados e CNC_PCQ são enviados.
        </span>
      </label>

      {fase.tipo === "lendo" && (
        <p className={clsx(BLOCO, "flex items-center gap-2.5 px-4 py-3.5 font-semibold text-txt")} role="status">
          <Loader2 size={18} className="animate-spin text-delp-red" aria-hidden="true" />
          <span>
            Lendo <b>{fase.nome}</b>… <Cronometro desde={fase.desde} /> (costuma levar até 1 minuto)
          </span>
        </p>
      )}

      {fase.tipo === "erroLeitura" && (
        <p className={ERRO} role="alert">
          {fase.mensagem}
        </p>
      )}

      {lida && resumo && (
        <section className={clsx(BLOCO, "flex flex-col gap-3.5 p-5")} aria-labelledby="t-resumo">
          <div>
            <h2 id="t-resumo" className="text-[15px] font-semibold leading-tight text-txt">
              Confira antes de atualizar
            </h2>
            <p className={clsx(APOIO, "mt-1")}>
              {lida.nome} · projeto <b className="text-txt">{resumo.projeto}</b> · centro de custo{" "}
              <span className="font-mono">{resumo.centroCusto}</span>
            </p>
          </div>
          <dl className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-2.5">
            <Dado rotulo="Avanço do saldo" destaque>
              {n(resumo.avanco * 100)}%
            </Dado>
            {resumo.fabric !== null && <Dado rotulo="Avanço da fabricação">{n(resumo.fabric * 100)}%</Dado>}
            {resumo.raPendentes !== null && <Dado rotulo="RA pendente">{n(resumo.raPendentes)}</Dado>}
            <Dado rotulo="Códigos de tarefa">{n(resumo.tarefas)}</Dado>
            <Dado rotulo="Componentes">{n(resumo.componentes)}</Dado>
            <Dado rotulo="Pendentes de baixa">{n(resumo.pendentes)}</Dado>
            <Dado rotulo="OPs">{n(resumo.ordens)}</Dado>
            <Dado rotulo="Linhas de plano de corte">{n(resumo.planos)}</Dado>
          </dl>
          {!resumo.temAbaCnc && <p className={AVISO}>A planilha não tem a aba CNC_PCQ: os planos de corte não vão aparecer.</p>}
          {resumo.cncSemControle > 0 && (
            <p className={AVISO}>
              {n(resumo.cncSemControle)} componentes têm plano na coluna CNC sem linha na aba CNC_PCQ. Eles aparecem como “Fora da aba CNC_PCQ”.
            </p>
          )}
          {grande && <p className={ERRO}>O envio passou de 4,4 MB. Avise o NID: a planilha cresceu além do limite da Vercel.</p>}
          {resumo.divergencias.length > 0 && (
            <div className={ERRO} role="alert">
              <p>A soma dos componentes não bate com o Resumo Geral. A planilha parece desatualizada: abra no Excel, salve e escolha de novo.</p>
              <ul className="my-1.5 list-disc pl-5 font-medium">
                {resumo.divergencias.slice(0, 5).map((d) => (
                  <li key={`${d.codTarefa}-${d.campo}`}>
                    {d.codTarefa} · {d.campo}: planilha <span className="font-mono">{n(d.planilha)}</span> · componentes{" "}
                    <span className="font-mono">{n(d.calculado)}</span>
                  </li>
                ))}
              </ul>
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 font-bold text-txt">
                <input type="checkbox" className="h-5 w-5" checked={forcar} onChange={(e) => setForcar(e.target.checked)} /> Atualizar assim mesmo
              </label>
            </div>
          )}
          <form
            className="flex flex-wrap items-center gap-2.5"
            onSubmit={(e) => {
              e.preventDefault();
              void enviar();
            }}
          >
            <label className="sr-only" htmlFor="senha-importacao">
              Senha de importação
            </label>
            <input
              ref={campoSenha}
              id="senha-importacao"
              className={clsx(CLASSE_CAMPO, "!w-auto min-w-0 flex-[0_1_260px]")}
              type="password"
              autoComplete="off"
              placeholder="Senha de importação"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              disabled={!habilitada || fase.tipo === "enviando"}
              aria-invalid={erroSenha ? true : undefined}
              aria-describedby={fase.tipo === "pronto" && fase.erro ? "erro-envio" : undefined}
            />
            <Button type="submit" disabled={travado} loading={fase.tipo === "enviando"}>
              {fase.tipo === "enviando" ? "Atualizando…" : "Atualizar a plataforma"}
            </Button>
            {fase.tipo === "enviando" && (
              <span className={APOIO} role="status">
                Gravando no banco… <Cronometro desde={fase.desde} />
              </span>
            )}
            {habilitada && fase.tipo === "pronto" && !senha && !fase.erro && (
              <span className={APOIO}>Digite a senha de importação para liberar o botão.</span>
            )}
          </form>
          {!habilitada && (
            <p className={ERRO} role="alert">
              Não dá para atualizar por aqui: a importação pelo site está desligada (falta a senha de importação na Vercel). Avise o NID; os dados podem
              ser carregados pelo comando de carga.
            </p>
          )}
          {fase.tipo === "pronto" && fase.erro && (
            <p className={ERRO} id="erro-envio" role="alert">
              {fase.erro.mensagem}
            </p>
          )}
        </section>
      )}

      {fase.tipo === "feito" && (
        <div
          className={clsx(BLOCO, "flex flex-wrap items-center justify-between gap-3 border-l-4 !border-l-success-forte px-5 py-3.5 font-semibold text-txt")}
          role="status"
        >
          <p>{fase.mensagem}</p>
          <a className={buttonVariants.primary} href="/">
            Ver o painel atualizado
          </a>
        </div>
      )}
    </div>
  );
}
