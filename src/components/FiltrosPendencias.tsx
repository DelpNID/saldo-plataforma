"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

export interface ValoresFiltro {
  q?: string;
  tarefa?: string;
  grupo?: string;
  plano?: string;
  ordem?: string;
}

interface Opcao {
  valor: string;
  rotulo: string;
}

/** Filtros de Pendências: aplicam na hora, voltam para a página 1 e continuam na URL. */
export function FiltrosPendencias({ valores, tarefas, grupos, planos }: { valores: ValoresFiltro; tarefas: Opcao[]; grupos: Opcao[]; planos: Opcao[] }) {
  const router = useRouter();
  const [busca, setBusca] = useState(valores.q ?? "");
  const primeira = useRef(true);

  const ir = (muda: Partial<ValoresFiltro>) => {
    const v = { ...valores, ...muda };
    const p = new URLSearchParams();
    for (const [k, val] of Object.entries(v)) if (val) p.set(k, val);
    const s = p.toString();
    router.push(s ? `/pendencias?${s}` : "/pendencias", { scroll: false });
  };

  // A busca aplica sozinha meio segundo depois de parar de digitar
  useEffect(() => {
    if (primeira.current) {
      primeira.current = false;
      return;
    }
    const t = setTimeout(() => {
      if ((valores.q ?? "") !== busca.trim()) ir({ q: busca.trim() || undefined });
    }, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busca]);

  return (
    <form
      className="filtros"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        ir({ q: busca.trim() || undefined });
      }}
    >
      <label className="sr" htmlFor="q">Buscar</label>
      <input id="q" className="campo busca" type="search" placeholder="Código, nome, OP, estrutura ou plano" value={busca} onChange={(e) => setBusca(e.target.value)} />
      <label className="sr" htmlFor="tarefa">Código de tarefa</label>
      <select id="tarefa" className="campo" value={valores.tarefa ?? ""} onChange={(e) => ir({ tarefa: e.target.value || undefined })}>
        <option value="">Todos os códigos</option>
        {tarefas.map((o) => (
          <option key={o.valor} value={o.valor}>{o.rotulo}</option>
        ))}
      </select>
      <label className="sr" htmlFor="grupo-mat">Grupo de material</label>
      <select id="grupo-mat" className="campo" value={valores.grupo ?? ""} onChange={(e) => ir({ grupo: e.target.value || undefined })}>
        <option value="">Todos os grupos</option>
        {grupos.map((o) => (
          <option key={o.valor} value={o.valor}>{o.rotulo}</option>
        ))}
      </select>
      <label className="sr" htmlFor="plano">Plano de corte</label>
      <select id="plano" className="campo" value={valores.plano ?? ""} onChange={(e) => ir({ plano: e.target.value || undefined })}>
        <option value="">Todos os materiais</option>
        {planos.map((o) => (
          <option key={o.valor} value={o.valor}>{o.rotulo}</option>
        ))}
      </select>
    </form>
  );
}
