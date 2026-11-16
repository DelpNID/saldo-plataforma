import { AppShell } from "@/components/layout/AppShell";
import { dadosDaMoldura } from "@/lib/moldura";

// A moldura do Visto (barra lateral + topo) em toda tela logada. O Login e a 404
// da raiz ficam fora deste grupo.
// O layout não se refaz na navegação por <Link>: o seletor de projeto e o número de
// Pendências se atualizam ao recarregar ou depois de gravar uma carga (router.refresh()).
export const dynamic = "force-dynamic";

export default async function LayoutDoApp({ children }: { children: React.ReactNode }) {
  const { projetos, pendentes, arquivo } = await dadosDaMoldura();
  return (
    <AppShell projetos={projetos} selos={{ "/pendencias": pendentes > 0 ? pendentes : undefined }} arquivo={arquivo}>
      {children}
    </AppShell>
  );
}
