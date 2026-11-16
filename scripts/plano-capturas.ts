// Quais telas a conferência visual fotografa, em quais larguras e modos. O Ascent só tem o tema
// claro; uma variante abre o Painel com o Windows no escuro para provar que a tela continua clara.
// Módulo puro: o CLI (capturar-telas.ts) e o teste leem a mesma lista.

export type Largura = 1526 | 390 | 794;
export type TemaCaptura = "claro" | "escuro";
/** "pagina": a tela inteira, de cima a baixo. "rolado": a janela de 900px depois de rolar, para ver o que fica parado. */
export type Modo = "pagina" | "rolado";

export interface Captura {
  nome: string;
  caminho: string;
  largura: Largura;
  /** Tema do SISTEMA (Windows/celular) emulado (prefers-color-scheme). A tela é sempre clara. */
  tema: TemaCaptura;
  logado: boolean;
  impressao: boolean;
  modo: Modo;
  /** localStorage gravado antes de a página abrir (barra recolhida). */
  armazenamento?: Record<string, string>;
  arquivo: string;
}

/** 1526: a largura de referência do Visto (desktop com a barra aberta). 390: celular. 794: folha A4 a 96 dpi. */
const LARGURAS: Largura[] = [1526, 390];
const COM_IMPRESSAO = ["pendencias", "tarefa"];
const COM_BLOCO_PARADO = ["painel", "linhagem", "pendencias", "tarefa", "retrabalho"];

function telas(tarefa: string): { nome: string; caminho: string }[] {
  return [
    { nome: "painel", caminho: "/" },
    { nome: "linhagem", caminho: "/linhagem" },
    { nome: "pendencias", caminho: "/pendencias" },
    { nome: "tarefa", caminho: `/tarefa/${encodeURIComponent(tarefa)}` },
    { nome: "retrabalho", caminho: "/tarefa/RETRABALHO" },
    { nome: "importar", caminho: "/importar" },
    { nome: "gestao", caminho: "/gestao" },
    { nome: "inexistente", caminho: "/tarefa/__inexistente__" },
    { nome: "login", caminho: "/login" },
  ];
}

export function planoDeCapturas(tarefa: string): Captura[] {
  const caminhos = new Map(telas(tarefa).map((t) => [t.nome, t.caminho]));
  const plano: Captura[] = [];
  const add = (
    nome: string,
    largura: Largura,
    tema: TemaCaptura,
    extra: { impressao?: boolean; modo?: Modo; armazenamento?: Record<string, string>; sufixo?: string } = {},
  ) =>
    plano.push({
      nome,
      caminho: caminhos.get(nome)!,
      largura,
      tema,
      logado: nome !== "login",
      impressao: extra.impressao ?? false,
      modo: extra.modo ?? "pagina",
      armazenamento: extra.armazenamento,
      arquivo: `${nome}-${largura}${extra.sufixo ?? ""}.png`,
    });

  for (const { nome } of telas(tarefa)) for (const largura of LARGURAS) add(nome, largura, "claro");
  for (const nome of COM_IMPRESSAO) add(nome, 794, "claro", { impressao: true, sufixo: "-impressao" });
  for (const nome of COM_BLOCO_PARADO) for (const largura of LARGURAS) add(nome, largura, "claro", { modo: "rolado", sufixo: "-rolado" });
  for (const largura of LARGURAS) add("painel", largura, "escuro", { sufixo: "-sistema-escuro" });
  add("painel", 1526, "claro", { armazenamento: { "ascent.barra-recolhida": "1" }, sufixo: "-barra-recolhida" });
  return plano;
}
