"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export interface ProjetoOpcao {
  id: number;
  nome: string;
  centroCusto: string;
  avanco: string; // já formatado ("18,1%")
  pendentes: string; // já formatado ("25.312")
  atualizado: string; // já formatado ("15/11/2026 às 12:45")
}

/**
 * Seletor de projeto da barra superior.
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
    <div className="projeto-wrap" ref={caixa}>
      <button ref={botao} className="projeto" type="button" aria-haspopup="listbox" aria-expanded={aberto} onClick={() => setAberto((a) => !a)}>
        <span>
          <span className="projeto-l">Projeto</span>
          <span className="projeto-n">
            {atual.nome} <small title="Data da última carga da planilha">· atualizado {atual.atualizado}</small>
          </span>
        </span>
      </button>
      {aberto && (
        <div className="projeto-menu" role="listbox" aria-label="Projetos">
          <label className="sr" htmlFor="busca-projeto">Buscar projeto</label>
          <input
            id="busca-projeto"
            className="campo"
            type="search"
            placeholder="Buscar projeto ou centro de custo"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            autoFocus
          />
          {visiveis.map((o) => (
            <button
              key={o.id}
              className="projeto-op"
              type="button"
              role="option"
              aria-selected={o.id === atual.id}
              onClick={() => setAberto(false)}
            >
              <b>{o.nome}</b>
              <span className="pct">{o.avanco}</span>
              <span className="mono">{o.centroCusto}</span>
              <span>do saldo subido</span>
              <span className="tudo mono">
                {o.pendentes} pendentes de baixa · atualizado {o.atualizado}
              </span>
            </button>
          ))}
          <p className="nota">Os outros projetos aparecem aqui depois de importados em Atualizar.</p>
        </div>
      )}
    </div>
  );
}
