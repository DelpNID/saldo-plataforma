"use client";

import { Download, Printer } from "lucide-react";
import { useEffect, useState, type MouseEvent } from "react";
import { buttonVariants } from "./ui/Button";
import { BOM, montarCsv, type Celula } from "@/lib/csv";

/** Botão de ferramenta de uma lista (exportar, imprimir, expandir): o ghost do Visto, compacto. */
export const BOTAO_FERRAMENTA = `${buttonVariants.ghost} !px-3.5 !text-[13px] print:hidden`;

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
      ok = await Promise.race([
        navigator.clipboard.writeText(valor).then(
          () => true,
          () => false,
        ),
        espera,
      ]);
    }
    setAviso(ok ? "ok" : "falhou");
  }

  return (
    <>
      <button
        type="button"
        className="-my-[7px] min-h-11 text-left font-mono font-semibold text-txt underline decoration-border-med decoration-dashed underline-offset-4 transition-colors hover:text-delp-red"
        title={tipo === "OP" ? "Tocar para copiar a OP" : "Tocar para copiar o código"}
        onClick={copiar}
      >
        {valor}
      </button>
      {aviso && (
        <span className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-btn bg-txt px-4 py-3 text-sm font-semibold text-bg shadow-strong" role="status">
          {aviso === "ok" ? `${tipo} ${valor} copiado` : `Não consegui copiar. Selecione e copie: ${valor}`}
        </span>
      )}
    </>
  );
}

export type { Celula } from "@/lib/csv";

/** Exporta a lista visível (já filtrada) em CSV para abrir no Excel. */
export function Exportar({ nome, cabecalho, linhas }: { nome: string; cabecalho: string[]; linhas: Celula[][] }) {
  function baixar() {
    const url = URL.createObjectURL(new Blob([BOM + montarCsv(cabecalho, linhas)], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nome}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }
  return (
    <button className={BOTAO_FERRAMENTA} type="button" onClick={baixar} disabled={linhas.length === 0}>
      <Download size={15} aria-hidden="true" />
      Exportar
    </button>
  );
}

export function Imprimir() {
  return (
    <button className={BOTAO_FERRAMENTA} type="button" onClick={() => window.print()}>
      <Printer size={15} aria-hidden="true" />
      Imprimir
    </button>
  );
}
