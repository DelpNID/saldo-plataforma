// Origem: delp-visto@f66a6c3 src/components/terceiros/SeloConversas.tsx (SeloNumero)
// Desvio: fundo bg-grad-delp em vez de bg-delp-red — no tema escuro o --delp-red
//   clareia e o branco por cima cai para ~3:1; o degradê da marca é fixo e mantém
//   o texto acima de 4,5:1 nos dois temas. Ver docs/visto-desvios.md.
/** O número do item do menu (o que espera quem está olhando). Zero não aparece. */
export function SeloNumero({ n, rotulo }: { n: number; rotulo: string }) {
  if (n === 0) return null;
  return (
    <span
      aria-label={rotulo}
      className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-pill bg-grad-delp px-1.5 text-[11px] font-bold text-white"
    >
      {n > 9 ? '9+' : n}
    </span>
  );
}
