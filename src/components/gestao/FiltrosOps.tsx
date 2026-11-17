"use client";

// Filtros da lista de OPs fabricadas sem saldo: aplicam na hora, voltam para a página 1
// e ficam no endereço (dá para mandar o link já filtrado), como os de Pendências.
import { clsx } from "clsx";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CLASSE_CAMPO } from "@/components/ui/Campo";
import { CAMINHO_OPS } from "@/lib/gestor";

export interface ValoresFiltroOps {
  q?: string;
  codigo?: string;
  tag?: string;
}

interface Opcao {
  valor: string;
  rotulo: string;
}

export function FiltrosOps({ valores, codigos, tags }: { valores: ValoresFiltroOps; codigos: Opcao[]; tags: Opcao[] }) {
  const router = useRouter();
  const [busca, setBusca] = useState(valores.q ?? "");
  const primeira = useRef(true);

  const ir = (muda: Partial<ValoresFiltroOps>) => {
    const v = { ...valores, ...muda };
    const p = new URLSearchParams();
    for (const [k, val] of Object.entries(v)) if (val) p.set(k, val);
    const s = p.toString();
    router.push(s ? `${CAMINHO_OPS}?${s}` : CAMINHO_OPS, { scroll: false });
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

  const campo = clsx(CLASSE_CAMPO, "!w-auto max-w-full");
  return (
    <form
      className="flex flex-wrap items-center gap-2.5"
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        ir({ q: busca.trim() || undefined });
      }}
    >
      <label className="sr-only" htmlFor="q-ops">
        Buscar OP
      </label>
      <input
        id="q-ops"
        className={clsx(CLASSE_CAMPO, "min-w-0 flex-[1_1_260px] sm:w-auto")}
        type="search"
        placeholder="OP, descrição, TAG ou desenho"
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
      />
      <label className="sr-only" htmlFor="codigo-ops">
        Código de tarefa
      </label>
      <select id="codigo-ops" className={campo} value={valores.codigo ?? ""} onChange={(e) => ir({ codigo: e.target.value || undefined })}>
        <option value="">Todos os códigos</option>
        {codigos.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="tag-ops">
        TAG
      </label>
      <select id="tag-ops" className={campo} value={valores.tag ?? ""} onChange={(e) => ir({ tag: e.target.value || undefined })}>
        <option value="">Todas as TAGs</option>
        {tags.map((o) => (
          <option key={o.valor} value={o.valor}>
            {o.rotulo}
          </option>
        ))}
      </select>
    </form>
  );
}
