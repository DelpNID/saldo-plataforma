// Origem: delp-visto@f66a6c3 src/components/terceiros/SeloConversas.tsx (SeloNumero), igual ao Visto.
/** O número do item do menu (o que espera quem está olhando). Zero não aparece. */
export function SeloNumero({ n, rotulo }: { n: number; rotulo: string }) {
  if (n === 0) return null;
  return (
    <span
      aria-label={rotulo}
      className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-pill bg-delp-red px-1.5 text-[11px] font-bold text-white"
    >
      {n > 9 ? '9+' : n}
    </span>
  );
}
