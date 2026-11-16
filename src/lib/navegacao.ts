// O menu lateral e a trilha do topo saem desta lista — uma escrita só, como os
// NAV_GROUPS do Visto (src/components/layout/Sidebar.tsx).
import { Gauge, LayoutDashboard, ListChecks, Network, Upload, type LucideIcon } from "lucide-react";

export interface ItemMenu {
  para: string;
  rotulo: string;
  icone: LucideIcon;
  /** Só acende no caminho exato (a raiz), fora os `filhos`. */
  fim?: boolean;
  /** Caminhos de telas que não estão no menu e pertencem a este item (a Tarefa é do Painel). */
  filhos?: string[];
}

export const GRUPOS_MENU: { titulo: string; itens: ItemMenu[] }[] = [
  {
    titulo: "Acompanhamento",
    itens: [
      { para: "/", rotulo: "Painel", icone: LayoutDashboard, fim: true, filhos: ["/tarefa"] },
      { para: "/linhagem", rotulo: "Linhagem", icone: Network },
      { para: "/pendencias", rotulo: "Pendências", icone: ListChecks },
      { para: "/gestao", rotulo: "Gestão", icone: Gauge },
    ],
  },
  { titulo: "Dados", itens: [{ para: "/importar", rotulo: "Atualizar", icone: Upload }] },
];

const dentroDe = (pathname: string, base: string) => pathname === base || pathname.startsWith(`${base}/`);

export function estaAtivo(item: ItemMenu, pathname: string): boolean {
  if ((item.filhos ?? []).some((f) => dentroDe(pathname, f))) return true;
  return item.fim ? pathname === item.para : dentroDe(pathname, item.para);
}

export function trilhaDaRota(pathname: string): { rotulo: string; para?: string }[] {
  if (pathname.startsWith("/tarefa/")) {
    const bruto = pathname.slice("/tarefa/".length);
    let cod = bruto;
    try {
      cod = decodeURIComponent(bruto);
    } catch {
      // código malformado na URL: mostra como veio
    }
    return [{ rotulo: "Painel", para: "/" }, { rotulo: `Tarefa ${cod}` }];
  }
  const item = GRUPOS_MENU.flatMap((g) => g.itens).find((i) => i.para === pathname);
  return item ? [{ rotulo: item.rotulo }] : [];
}
