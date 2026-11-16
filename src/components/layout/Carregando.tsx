// Origem: delp-visto@f66a6c3 src/components/layout/Carregando.tsx
// -----------------------------------------------------------------------------
// Carregando.tsx — o estado de carregamento de bloco/seção (o `loading` do
// Button continua cobrindo botões). Substitui os spinners montados inline
// (80 ocorrências em 30 arquivos na rev. 20/08).
// -----------------------------------------------------------------------------
import { Loader2 } from 'lucide-react';

export function Carregando({ rotulo = 'Carregando…' }: { rotulo?: string }) {
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 py-10 text-sm text-txt-2"
    >
      <Loader2 size={18} className="animate-spin text-delp-red" aria-hidden="true" />
      {rotulo}
    </div>
  );
}
