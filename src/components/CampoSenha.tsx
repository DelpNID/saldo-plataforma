"use client";

// Origem: delp-visto@f66a6c3 src/pages/LoginPage.tsx (campo "Senha": ícone, mostrar/ocultar e classeInput)
// Desvio: componente próprio (o Login do Ascent é de servidor e só este campo precisa de estado).
import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useState } from "react";

function classeInput(temErro: boolean, comAdornoDireita = false): string {
  return `h-14 w-full rounded-btn border bg-bg-2 pl-12 ${comAdornoDireita ? "pr-14" : "pr-4"} text-base text-txt transition-colors placeholder:text-txt-2 hover:border-txt-muted focus:border-delp-red focus:bg-bg focus:outline-none focus:ring-2 focus:ring-delp-red/25 ${temErro ? "border-danger" : "border-med"}`;
}

export function CampoSenha({ erro, rotulo }: { erro?: boolean; rotulo: string }) {
  const [mostrar, setMostrar] = useState(false);
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="senha" className="text-base font-medium text-txt">
        {rotulo}
        <span className="ml-0.5 text-delp-red" aria-hidden="true">
          *
        </span>
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-txt-muted" aria-hidden="true">
          <KeyRound size={20} />
        </span>
        <input
          id="senha"
          name="senha"
          type={mostrar ? "text" : "password"}
          required
          autoFocus
          autoComplete="current-password"
          placeholder="Sua senha"
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? "senha-erro" : undefined}
          className={classeInput(Boolean(erro), true)}
        />
        <button
          type="button"
          onClick={() => setMostrar((atual) => !atual)}
          aria-label={mostrar ? "Ocultar senha" : "Mostrar senha"}
          className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-btn text-txt-2 hover:bg-bg-3"
        >
          {mostrar ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
