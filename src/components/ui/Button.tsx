// Origem: delp-visto@f66a6c3 src/components/ui/Button.tsx
// -----------------------------------------------------------------------------
// Button.tsx — botão padrão do design system
//
// Duas variantes:
// - primary: pílula com gradiente vermelho DELP (ações principais, CTAs);
// - ghost:   transparente com borda (ações secundárias).
//
// As classes ficam no objeto exportado `buttonVariants` para que links do
// react-router possam "se vestir" de botão sem virar <button> (semântica de
// link preservada) — ver uso na AjudaPage.
// -----------------------------------------------------------------------------

import { clsx } from 'clsx';
import { Loader2 } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

export const buttonVariants = {
  primary:
    'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-pill bg-grad-delp px-6 text-sm font-semibold text-white shadow-medium transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0',
  ghost:
    'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-pill border border-med bg-transparent px-5 text-sm font-semibold text-delp-red transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0',
} as const;

export type ButtonVariant = keyof typeof buttonVariants;

// Estende os atributos nativos de <button>: onClick, disabled, type etc.
// passam direto, sem precisar redeclarar nada aqui.
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  /** true = mostra o spinner e desabilita o clique (estado de "enviando..."). */
  loading?: boolean;
}

export function Button({
  variant = 'primary',
  loading = false,
  disabled,
  // type="button" por padrão: evita submits acidentais dentro de <form>
  // (o padrão do HTML seria "submit").
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      // Carregando também desabilita — impede duplo clique no envio.
      disabled={disabled || loading}
      className={clsx(buttonVariants[variant], className)}
      {...rest}
    >
      {loading && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
      {children}
    </button>
  );
}
