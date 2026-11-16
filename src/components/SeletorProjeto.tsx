"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CLASSE_CAMPO } from "./ui/Campo";

export interface ProjetoOpcao {
  id: number;
  nome: string;
  centroCusto: string;
  avanco: string; // já formatado ("18,1%")
  pendentes: string; // já formatado ("25.312")
  atualizado: string; // já formatado ("15/11/2026 às 12:45")
}

/**
 * Seletor de projeto do topo (no lado direito, onde o portal do Visto mostra a empresa).
 * Hoje a plataforma guarda um projeto ativo por vez (a importação troca a carga inteira),
 * então a lista mostra o projeto atual. Vários projetos dependem de mudar a regra da importação.
 */
export function SeletorProjeto({ atualId, opcoes }: { atualId: number; opcoes: ProjetoOpcao[] }) {
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const caixa = useRef<HTMLDivElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const atual = opcoes.find((o) => o.id === atualId) ?? opcoes[0];

  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => {
      if (caixa.current && !caixa.current.contains(e.target as Node)) setAberto(false);
    };
    const tecla = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setAberto(false);
        botao.current?.focus();
      }
    };
    document.addEventListener("mousedown", fora);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fora);
      document.removeEventListener("keydown", tecla);
    };
  }, [aberto]);

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return q ? opcoes.filter((o) => o.nome.toLowerCase().includes(q) || o.centroCusto.toLowerCase().includes(q)) : opcoes;
  }, [busca, opcoes]);

  if (!atual) return null;
  return (
    <div className="relative" ref={caixa}>
      <button
        ref={botao}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        onClick={() => setAberto((a) => !a)}
        className="flex min-h-11 max-w-[46vw] items-center gap-2 rounded-btn border border-med bg-bg px-3 text-left transition-colors hover:border-txt-muted sm:max-w-none"
      >
        <span className="min-w-0">
          <span className="hidden text-[10px] font-bold uppercase leading-tight tracking-[0.1em] text-txt-2 sm:block">Projeto</span>
          <span className="block truncate text-sm font-semibold leading-tight text-txt">
            {atual.nome}
            <small className="hidden font-normal text-txt-2 md:inline" title="Data da última carga da planilha">
              {" "}
              · atualizado <span className="font-mono">{atual.atualizado}</span>
            </small>
          </span>
        </span>
        <ChevronDown size={16} className="shrink-0 text-txt-2" aria-hidden="true" />
      </button>
      {aberto && (
        <div
          role="listbox"
          aria-label="Projetos"
          className="absolute right-0 top-[calc(100%+6px)] z-30 flex w-[min(380px,88vw)] flex-col gap-2 rounded-card border border-subtle bg-bg p-2.5 shadow-strong"
        >
          <label className="sr-only" htmlFor="busca-projeto">
            Buscar projeto
          </label>
          <input
            id="busca-projeto"
            className={CLASSE_CAMPO}
            type="search"
            placeholder="Buscar projeto ou centro de custo"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            autoFocus
          />
          {visiveis.map((o) => (
            <button
              key={o.id}
              type="button"
              role="option"
              aria-selected={o.id === atual.id}
              onClick={() => setAberto(false)}
              className="grid min-h-11 grid-cols-[1fr_auto] items-baseline gap-x-3 gap-y-0.5 rounded-btn px-3 py-2.5 text-left text-sm transition-colors hover:bg-bg-2 aria-selected:bg-bg-2"
            >
              <b className="font-semibold text-txt">{o.nome}</b>
              <span className="font-mono text-lg font-bold text-txt">{o.avanco}</span>
              <span className="font-mono text-txt-2">{o.centroCusto}</span>
              <span className="text-txt-2">do saldo subido</span>
              <span className="col-span-2 text-xs text-txt-2">
                <span className="font-mono">{o.pendentes}</span> pendentes de baixa · atualizado{" "}
                <span className="font-mono">{o.atualizado}</span>
              </span>
            </button>
          ))}
          <p className="px-1 text-xs text-txt-2">Os outros projetos aparecem aqui depois de importados em Atualizar.</p>
        </div>
      )}
    </div>
  );
}
