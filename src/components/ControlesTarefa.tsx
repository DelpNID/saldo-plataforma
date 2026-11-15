"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Exportar, Imprimir, type Celula } from "./Acoes";

/** Voltar ao painel, código anterior/próximo (ordem do Resumo Geral) e "Ir para código". */
export function TrocaCodigo({ anterior, proximo, codigos }: { anterior?: string; proximo?: string; codigos: string[] }) {
  const router = useRouter();
  const [valor, setValor] = useState("");
  const [erro, setErro] = useState("");
  const href = (c: string) => `/tarefa/${encodeURIComponent(c)}`;

  function ir() {
    const alvo = valor.trim();
    if (!alvo) return;
    const achado = codigos.find((c) => c.toLowerCase() === alvo.toLowerCase());
    if (!achado) {
      setErro(`O código ${alvo} não existe neste projeto.`);
      return;
    }
    setErro("");
    router.push(href(achado));
  }

  return (
    <div className="troca-codigo">
      <Link className="voltar" href="/">‹ Voltar ao painel</Link>
      <div className="acoes">
        {anterior ? (
          <Link className="btn sec" href={href(anterior)}>‹ Código anterior</Link>
        ) : (
          <span className="btn sec" aria-disabled="true">‹ Código anterior</span>
        )}
        <label className="sr" htmlFor="ir-codigo">Ir para código de tarefa</label>
        <input
          id="ir-codigo"
          className="campo"
          type="search"
          placeholder="Ir para código…"
          value={valor}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? "ir-codigo-erro" : undefined}
          onChange={(e) => {
            setValor(e.target.value);
            setErro("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              ir();
            }
          }}
        />
        {proximo ? (
          <Link className="btn sec" href={href(proximo)}>Próximo código ›</Link>
        ) : (
          <span className="btn sec" aria-disabled="true">Próximo código ›</span>
        )}
      </div>
      {erro && (
        <p className="erro troca-erro" id="ir-codigo-erro" role="alert">
          {erro}
        </p>
      )}
    </div>
  );
}

interface ControlesProps {
  visao: "arvore" | "lista";
  mostrar: string;
  hrefVisao: { arvore: string; lista: string };
  hrefMostrar: Record<string, string>; // valor do "Mostrar" → endereço
  exportar: { nome: string; cabecalho: string[]; linhas: Celula[][] };
}

/** Barra de ferramentas da execução: visão, "Mostrar", expandir/recolher, exportar e imprimir. */
export function ControlesTarefa({ visao, mostrar, hrefVisao, hrefMostrar, exportar }: ControlesProps) {
  const router = useRouter();
  const abrirTudo = (aberto: boolean) => document.querySelectorAll<HTMLDetailsElement>(".arvore details.no").forEach((d) => (d.open = aberto));
  return (
    <>
      <div className="chips" role="group" aria-label="Como ver">
        <Link className="chip-btn" aria-pressed={visao === "arvore"} href={hrefVisao.arvore} scroll={false}>Árvore da execução</Link>
        <Link className="chip-btn" aria-pressed={visao === "lista"} href={hrefVisao.lista} scroll={false}>Pendências do código</Link>
      </div>
      <label>
        Mostrar{" "}
        <select className="campo" value={mostrar} onChange={(e) => router.push(hrefMostrar[e.target.value], { scroll: false })}>
          <option value="tudo">{visao === "lista" ? "Todas as pendências" : "Tudo"}</option>
          <option value="nao-baixado">Só o que não foi baixado</option>
          <option value="sem-saldo">Só o que falta subir saldo</option>
        </select>
      </label>
      {visao === "arvore" && (
        <>
          <button className="btn sec" type="button" onClick={() => abrirTudo(true)}>Expandir tudo</button>
          <button className="btn sec" type="button" onClick={() => abrirTudo(false)}>Recolher tudo</button>
        </>
      )}
      <Exportar nome={exportar.nome} cabecalho={exportar.cabecalho} linhas={exportar.linhas} />
      <Imprimir />
    </>
  );
}
