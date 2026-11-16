"use client";

import { clsx } from "clsx";
import { ChevronLeft, ChevronRight, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BOTAO_FERRAMENTA, Exportar, Imprimir, type Celula } from "./Acoes";
import { CLASSE_CAMPO } from "./ui/Campo";

/** Botão ghost compacto do Visto, para navegar entre códigos. */
const BOTAO_NAV = BOTAO_FERRAMENTA;
const BOTAO_NAV_OFF = `${BOTAO_FERRAMENTA} pointer-events-none opacity-45`;

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
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      {/* A volta no topo da ficha (regra do Visto: ficha abre no lugar da lista). */}
      <Link href="/" className="inline-flex min-h-11 items-center gap-1 rounded-btn pr-2 text-sm font-semibold text-txt-2 hover:text-delp-red">
        <ChevronLeft size={16} aria-hidden="true" />
        Voltar ao painel
      </Link>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        {anterior ? (
          <Link className={BOTAO_NAV} href={href(anterior)}>
            <ChevronLeft size={15} aria-hidden="true" />
            Código anterior
          </Link>
        ) : (
          <span className={BOTAO_NAV_OFF} aria-disabled="true">
            <ChevronLeft size={15} aria-hidden="true" />
            Código anterior
          </span>
        )}
        <label className="sr-only" htmlFor="ir-codigo">
          Ir para código de tarefa
        </label>
        <input
          id="ir-codigo"
          className={clsx(CLASSE_CAMPO, "!w-[170px]")}
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
          <Link className={BOTAO_NAV} href={href(proximo)}>
            Próximo código
            <ChevronRight size={15} aria-hidden="true" />
          </Link>
        ) : (
          <span className={BOTAO_NAV_OFF} aria-disabled="true">
            Próximo código
            <ChevronRight size={15} aria-hidden="true" />
          </span>
        )}
      </div>
      {erro && (
        <p className="w-full rounded-btn border border-danger bg-danger/10 px-3.5 py-2.5 text-sm font-semibold text-delp-red" id="ir-codigo-erro" role="alert">
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

/** Alternador de visão: o desenho do Segmentado do Visto, mas com links (a visão é endereço). */
function LinkSegmento({ href, ativo, children }: { href: string; ativo: boolean; children: string }) {
  return (
    <Link
      href={href}
      scroll={false}
      aria-current={ativo ? "true" : undefined}
      className={clsx(
        "inline-flex min-h-11 items-center whitespace-nowrap rounded-[8px] px-3 py-1 text-xs font-semibold transition-colors",
        ativo ? "bg-bg text-txt shadow-subtle" : "text-txt-2 hover:text-txt",
      )}
    >
      {children}
    </Link>
  );
}

/** Barra de ferramentas da execução: visão, "Mostrar", expandir/recolher, exportar e imprimir. */
export function ControlesTarefa({ visao, mostrar, hrefVisao, hrefMostrar, exportar }: ControlesProps) {
  const router = useRouter();
  const abrirTudo = (aberto: boolean) => document.querySelectorAll<HTMLDetailsElement>("details[data-no]").forEach((d) => (d.open = aberto));
  return (
    <div className="flex flex-wrap items-center gap-2 print:hidden">
      <div role="group" aria-label="Como ver" className="inline-flex shrink-0 gap-0.5 rounded-btn border border-subtle bg-bg-2 p-0.5">
        <LinkSegmento href={hrefVisao.arvore} ativo={visao === "arvore"}>
          Árvore da execução
        </LinkSegmento>
        <LinkSegmento href={hrefVisao.lista} ativo={visao === "lista"}>
          Pendências do código
        </LinkSegmento>
      </div>
      <label className="flex items-center gap-2 text-sm font-semibold text-txt">
        Mostrar
        <select
          className={clsx(CLASSE_CAMPO, "!w-auto")}
          value={mostrar}
          onChange={(e) => router.push(hrefMostrar[e.target.value], { scroll: false })}
        >
          <option value="tudo">{visao === "lista" ? "Todas as pendências" : "Tudo"}</option>
          <option value="nao-baixado">Só o que não foi baixado</option>
          <option value="sem-saldo">Só o que falta subir saldo</option>
        </select>
      </label>
      {visao === "arvore" && (
        <>
          <button className={BOTAO_FERRAMENTA} type="button" onClick={() => abrirTudo(true)}>
            <ChevronsUpDown size={15} aria-hidden="true" />
            Expandir tudo
          </button>
          <button className={BOTAO_FERRAMENTA} type="button" onClick={() => abrirTudo(false)}>
            <ChevronsDownUp size={15} aria-hidden="true" />
            Recolher tudo
          </button>
        </>
      )}
      <Exportar nome={exportar.nome} cabecalho={exportar.cabecalho} linhas={exportar.linhas} />
      <Imprimir />
    </div>
  );
}
