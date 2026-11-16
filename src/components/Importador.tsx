"use client";

import { useEffect, useRef, useState } from "react";
import type { RespostaLeitor, ResumoLeitura } from "@/lib/leitor.worker";

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

function Cronometro({ desde }: { desde: number }) {
  const [, tique] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tique((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return <span className="mono">{Math.round((Date.now() - desde) / 1000)} s</span>;
}

function Etapas({ atual }: { atual: number }) {
  return (
    <ol className="etapas card" aria-label="Passos">
      {ETAPAS.map((t, i) => (
        <li key={t} className={`etapa${i + 1 < atual ? " feita" : ""}`} aria-current={i + 1 === atual ? "step" : undefined}>
          <b>{i + 1}</b>
          {t}
        </li>
      ))}
    </ol>
  );
}

export function Importador({ habilitada }: { habilitada: boolean }) {
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
    <div className="importador">
      <Etapas atual={etapa} />
      {!habilitada && (
        <p className="aviso" role="note">
          <b>Importação pelo site desligada.</b> Falta cadastrar a senha de importação (<span className="mono">IMPORTACAO_SENHA</span>) na Vercel. Enquanto
          isso, a atualização é feita pelo NID com o comando de carga.
        </p>
      )}
      <ol className="passos">
        <li>
          <b>Atualize e salve</b> a planilha no Excel, para as fórmulas ficarem recalculadas.
        </li>
        <li>
          <b>Escolha o arquivo</b> abaixo. A plataforma lê e mostra um resumo.
        </li>
        <li>
          <b>Confira o resumo</b>, digite a senha de importação e atualize. A troca acontece de uma vez, só no final.
        </li>
      </ol>

      <label className={`arquivo card${ocupado ? " ocupado" : ""}`}>
        <input
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          disabled={ocupado}
          onChange={(e) => {
            escolher(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <span className="arquivo-t">{fase.tipo === "inicio" || fase.tipo === "feito" ? "Escolher a planilha (.xlsx)" : "Escolher outra planilha"}</span>
        <span className="arquivo-d">
          A planilha é lida aqui no seu computador. Só os dados das abas Resumo Geral, Componentes, Dados e CNC_PCQ são enviados.
        </span>
      </label>

      {fase.tipo === "lendo" && (
        <p className="card carregando" role="status">
          <span>
            Lendo <b>{fase.nome}</b>… <Cronometro desde={fase.desde} /> (costuma levar até 1 minuto)
          </span>
        </p>
      )}

      {fase.tipo === "erroLeitura" && (
        <p className="erro" role="alert">
          {fase.mensagem}
        </p>
      )}

      {lida && resumo && (
        <section className="card resumo-carga" aria-labelledby="t-resumo">
          <h2 id="t-resumo">Confira antes de atualizar</h2>
          <p className="arquivo-d">
            {lida.nome} · projeto <b>{resumo.projeto}</b> · centro de custo {resumo.centroCusto}
          </p>
          <dl className="resumo-grade">
            <div className="destaque">
              <dt>Avanço do saldo</dt>
              <dd>{n(resumo.avanco * 100)}%</dd>
            </div>
            {resumo.fabric !== null && (
              <div>
                <dt>Avanço da fabricação</dt>
                <dd>{n(resumo.fabric * 100)}%</dd>
              </div>
            )}
            {resumo.raPendentes !== null && (
              <div>
                <dt>RA pendente</dt>
                <dd>{n(resumo.raPendentes)}</dd>
              </div>
            )}
            <div>
              <dt>Códigos de tarefa</dt>
              <dd>{n(resumo.tarefas)}</dd>
            </div>
            <div>
              <dt>Componentes</dt>
              <dd>{n(resumo.componentes)}</dd>
            </div>
            <div>
              <dt>Pendentes de baixa</dt>
              <dd>{n(resumo.pendentes)}</dd>
            </div>
            <div>
              <dt>OPs</dt>
              <dd>{n(resumo.ordens)}</dd>
            </div>
            <div>
              <dt>Linhas de plano de corte</dt>
              <dd>{n(resumo.planos)}</dd>
            </div>
          </dl>
          {!resumo.temAbaCnc && <p className="aviso">A planilha não tem a aba CNC_PCQ: os planos de corte não vão aparecer.</p>}
          {resumo.cncSemControle > 0 && (
            <p className="aviso">
              {n(resumo.cncSemControle)} componentes têm plano na coluna CNC sem linha na aba CNC_PCQ. Eles aparecem como “Fora da aba CNC_PCQ”.
            </p>
          )}
          {grande && <p className="erro">O envio passou de 4,4 MB. Avise o NID: a planilha cresceu além do limite da Vercel.</p>}
          {resumo.divergencias.length > 0 && (
            <div className="erro" role="alert">
              <p>A soma dos componentes não bate com o Resumo Geral. A planilha parece desatualizada: abra no Excel, salve e escolha de novo.</p>
              <ul>
                {resumo.divergencias.slice(0, 5).map((d) => (
                  <li key={`${d.codTarefa}-${d.campo}`}>
                    {d.codTarefa} · {d.campo}: planilha {n(d.planilha)} · componentes {n(d.calculado)}
                  </li>
                ))}
              </ul>
              <label className="marcar">
                <input type="checkbox" checked={forcar} onChange={(e) => setForcar(e.target.checked)} /> Atualizar assim mesmo
              </label>
            </div>
          )}
          <form
            className="filtros"
            onSubmit={(e) => {
              e.preventDefault();
              void enviar();
            }}
          >
            <label className="sr" htmlFor="senha-importacao">
              Senha de importação
            </label>
            <input
              ref={campoSenha}
              id="senha-importacao"
              className="campo"
              type="password"
              autoComplete="off"
              placeholder="Senha de importação"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              disabled={!habilitada || fase.tipo === "enviando"}
              aria-invalid={erroSenha ? true : undefined}
              aria-describedby={fase.tipo === "pronto" && fase.erro ? "erro-envio" : undefined}
            />
            <button className="btn" type="submit" disabled={travado || fase.tipo === "enviando"}>
              {fase.tipo === "enviando" ? "Atualizando…" : "Atualizar a plataforma"}
            </button>
            {fase.tipo === "enviando" && (
              <span className="arquivo-d" role="status">
                Gravando no banco… <Cronometro desde={fase.desde} />
              </span>
            )}
            {habilitada && fase.tipo === "pronto" && !senha && !fase.erro && (
              <span className="arquivo-d">Digite a senha de importação para liberar o botão.</span>
            )}
          </form>
          {!habilitada && (
            <p className="erro" role="alert">
              Não dá para atualizar por aqui: a importação pelo site está desligada (falta a senha de importação na Vercel). Avise o NID; os dados podem ser
              carregados pelo comando de carga.
            </p>
          )}
          {fase.tipo === "pronto" && fase.erro && (
            <p className="erro" id="erro-envio" role="alert">
              {fase.erro.mensagem}
            </p>
          )}
        </section>
      )}

      {fase.tipo === "feito" && (
        <div className="sucesso" role="status">
          <p>{fase.mensagem}</p>
          <a className="btn" href="/">
            Ver o painel atualizado
          </a>
        </div>
      )}
    </div>
  );
}
