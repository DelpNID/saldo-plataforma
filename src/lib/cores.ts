// Catálogo de cor do Ascent — o equivalente do ESCALA_VERMELHOS/COR_TERCEIROS
// (src/lib/terceiros-ui.ts) e do SELO_TOM (src/lib/formato.ts) do Visto@f66a6c3.
//
// Regra do Visto: TODO gráfico usa UMA escala, a de vermelhos — mais escuro =
// mais grave ou mais adiante. Degraus vizinhos não entram no mesmo gráfico, e
// os degraus 1 e 2 (abaixo de 3:1) só entram com o rótulo escrito ao lado.
// Cor de gráfico chega por prop ou `style` (nunca por classe do Tailwind); em
// SVG, por `style={{ fill }}`, porque o atributo fill não resolve var().
import type { BadgeTone } from "@/components/ui/Badge";

export const ESCALA_VERMELHOS = {
  1: "rgb(var(--vermelho-1))", // menor gravidade / começo do fluxo
  2: "rgb(var(--vermelho-2))",
  3: "rgb(var(--vermelho-3))",
  4: "rgb(var(--vermelho-4))", // Delp Red da marca
  5: "rgb(var(--vermelho-5))",
  6: "rgb(var(--vermelho-6))", // o mais grave
} as const;

type Degrau = keyof typeof ESCALA_VERMELHOS;

/** O degrau de cada desenho do Ascent (design §6.3). */
export const DEGRAU = {
  avanco: 4, // barra de avanço simples
  saldo: 5, // Saldo × Fabricação: o que foi medido
  fabricacao: 3, // … e a referência (dois degraus de distância)
  concluida: 2, // situação dos códigos na Gestão — sempre com o rótulo escrito
  andamento: 4,
  semAvanco: 6,
  linhaEvolucao: 4, // gráfico de evolução
  pontoAtual: 6,
} as const satisfies Record<string, Degrau>;

/** Desenhos em degrau 1–2 permitidos porque o rótulo vai escrito ao lado. */
export const COM_LEGENDA_ESCRITA: ReadonlySet<keyof typeof DEGRAU> = new Set(["concluida"]);

export const COR_ASCENT = {
  ...(Object.fromEntries(Object.entries(DEGRAU).map(([nome, d]) => [nome, ESCALA_VERMELHOS[d]])) as Record<
    keyof typeof DEGRAU,
    string
  >),
  /** A grade dos gráficos. */
  grade: "rgb(var(--grade))",
};

/** Cor de TEXTO de situação (ritmo, prazo). Os tons puros não passam AA em texto pequeno. */
export const SELO_TOM = {
  danger: "text-delp-red",
  success: "text-success-forte",
  warning: "text-warning-forte",
  neutro: "text-txt-muted",
} as const;

/** As classes de situação de src/lib/regras.ts (e o neutro) como tom do Badge. */
export const TOM_DA_CLASSE: Record<"ok" | "parcial" | "pend" | "neutro", BadgeTone> = {
  ok: "success",
  parcial: "warning",
  pend: "danger",
  neutro: "neutral",
};
