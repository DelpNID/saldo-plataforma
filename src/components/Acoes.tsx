"use client";

import { useEffect, useState, type MouseEvent } from "react";

/** Cópia imediata, dentro do próprio toque (funciona mesmo quando a API nova fica esperando permissão). */
function copiarNaHora(valor: string, voltarFoco: HTMLElement | null): boolean {
  const t = document.createElement("textarea");
  t.value = valor;
  t.setAttribute("readonly", "");
  t.style.position = "fixed";
  t.style.opacity = "0";
  document.body.appendChild(t);
  t.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  t.remove();
  voltarFoco?.focus();
  return ok;
}

/** Tocar para copiar uma OP ou um código. Dentro de <summary> não abre nem fecha o nó. */
export function Copiar({ valor, tipo }: { valor: string; tipo: "OP" | "Código" }) {
  const [aviso, setAviso] = useState<"" | "ok" | "falhou">("");

  useEffect(() => {
    if (!aviso) return;
    const t = setTimeout(() => setAviso(""), 2000);
    return () => clearTimeout(t);
  }, [aviso]);

  async function copiar(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    let ok = copiarNaHora(valor, e.currentTarget);
    if (!ok && navigator.clipboard) {
      const espera = new Promise<boolean>((r) => setTimeout(() => r(false), 800));
      ok = await Promise.race([navigator.clipboard.writeText(valor).then(() => true, () => false), espera]);
    }
    setAviso(ok ? "ok" : "falhou");
  }

  return (
    <>
      <button type="button" className="copia mono" title={tipo === "OP" ? "Tocar para copiar a OP" : "Tocar para copiar o código"} onClick={copiar}>
        {valor}
      </button>
      {aviso && (
        <span className="aviso-copia" role="status">
          {aviso === "ok" ? `${tipo} ${valor} copiado` : `Não consegui copiar. Selecione e copie: ${valor}`}
        </span>
      )}
    </>
  );
}

export type Celula = string | number | null | undefined;

function celulaCsv(v: Celula): string {
  if (v === null || v === undefined) return "";
  const t = typeof v === "number" ? v.toLocaleString("pt-BR", { useGrouping: false, maximumFractionDigits: 3 }) : v;
  return /[";\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

/** Exporta a lista visível (já filtrada) em CSV para abrir no Excel. */
export function Exportar({ nome, cabecalho, linhas }: { nome: string; cabecalho: string[]; linhas: Celula[][] }) {
  function baixar() {
    const csv = [cabecalho, ...linhas].map((r) => r.map(celulaCsv).join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nome}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  return (
    <button className="btn sec" type="button" onClick={baixar} disabled={linhas.length === 0}>
      Exportar
    </button>
  );
}

export function Imprimir() {
  return (
    <button className="btn sec" type="button" onClick={() => window.print()}>
      Imprimir
    </button>
  );
}
