import { describe, expect, it } from "vitest";
import {
  agregarOrigens,
  caminhosDaLinhagem,
  compararCodigo,
  descricaoCurta,
  montarArvore,
  normalizarCodTarefa,
  filtrarArvore,
  filtroMostrar,
  pendenciasDoCodigo,
  resumirOrigens,
  statusMaterial,
  statusSaldo,
  situacaoTarefa,
  tituloOrigem,
  type CompBase,
} from "@/lib/regras";

function comp(p: Partial<CompBase>): CompBase {
  return {
    codOrdem: "100/26",
    codEstrutura: "03.023.0000001",
    codigoPrd: "01.018.0000001",
    nome: "CHAPA",
    unidade: "KG",
    qtdUsada: 1,
    apontado: 0,
    tarPai: "1.01",
    exec: "1",
    tarFilho: "0",
    grupo: "01.018",
    previsto: 1,
    apontado2: 0,
    ...p,
  };
}

describe("normalizarCodTarefa", () => {
  it("transforma ALHO (fim de RETRABALHO) em RETRABALHO", () => {
    expect(normalizarCodTarefa("ALHO")).toBe("RETRABALHO");
  });
  it("transforma o 0 do XLOOKUP em material direto", () => {
    expect(normalizarCodTarefa(0)).toBe("0");
    expect(normalizarCodTarefa(null)).toBe("0");
  });
  it("mantém o código com zero à direita", () => {
    expect(normalizarCodTarefa("1.10")).toBe("1.10");
  });
});

describe("status", () => {
  it("APONTADO = 0 é pendente; maior que 0 é apontado", () => {
    expect(statusMaterial(0)).toBe("pendente");
    expect(statusMaterial(7.5)).toBe("apontado");
  });
  it("saldo da OP compara efetivada com planejada", () => {
    expect(statusSaldo(2, 2)).toBe("ok");
    expect(statusSaldo(2, 1)).toBe("parcial");
    expect(statusSaldo(2, 0)).toBe("sem-saldo");
    expect(statusSaldo(0, 0)).toBe("sem-dado");
  });
  it("situação da tarefa pelo % de avanço", () => {
    expect(situacaoTarefa(0)).toBe("sem-avanco");
    expect(situacaoTarefa(0.5)).toBe("andamento");
    expect(situacaoTarefa(1)).toBe("concluida");
  });
});

describe("textos e ordem", () => {
  it("corta a descrição antes de ' - Qtd.'", () => {
    expect(descricaoCurta("DOP - GE-N-PLET / GE-S-PLET - Qtd. 1 - Cód. Tarefa 1.01")).toBe("DOP - GE-N-PLET / GE-S-PLET");
  });
  it("ordena 1.2 antes de 1.10 e 1.10 antes de 2.1", () => {
    expect(["2.1", "1.10", "1.2"].sort(compararCodigo)).toEqual(["1.2", "1.10", "2.1"]);
  });
});

describe("resumirOrigens (aba Arvore)", () => {
  it("soma PREVISTO e APONTADO2 por tarefa filha e conta pendentes", () => {
    const o = resumirOrigens("1.01", [
      comp({ tarFilho: "0", previsto: 2, apontado2: 1 }),
      comp({ tarFilho: "0", previsto: 1, apontado2: 1, apontado: 3 }),
      comp({ tarFilho: "1.01", previsto: 1 }),
      comp({ tarFilho: "1.30", previsto: 1 }),
      comp({ tarFilho: "RETRABALHO", previsto: 4 }),
    ]);
    expect(o.map((x) => [x.tarFilho, x.tipo])).toEqual([
      ["1.01", "propria"],
      ["1.30", "outra"],
      ["0", "material"],
      ["RETRABALHO", "retrabalho"],
    ]);
    const material = o.find((x) => x.tipo === "material");
    expect(material).toMatchObject({ previsto: 3, realizado: 2, componentes: 2, pendentes: 1 });
  });
});

describe("montarArvore", () => {
  // Raiz R consome a subestrutura S; S consome uma chapa. Execução 1.
  const linhas = [
    comp({ codOrdem: "1/26", codEstrutura: "R", codigoPrd: "S", nome: "SUB S", tarFilho: "1.01", apontado: 0 }),
    comp({ codOrdem: "1/26", codEstrutura: "R", codigoPrd: "ARAME", apontado: 2 }),
    comp({ codOrdem: "2/26", codEstrutura: "S", codigoPrd: "CHAPA", apontado: 0, previsto: 1, apontado2: 1 }),
    comp({ codOrdem: "9/26", codEstrutura: "X", codigoPrd: "CHAPA", exec: "2" }),
  ];

  it("separa por execução e acha a raiz que ninguém consome", () => {
    const ex = montarArvore(linhas);
    expect(ex.map((e) => e.exec)).toEqual(["1", "2"]);
    expect(ex[0].raizes.map((r) => r.codEstrutura)).toEqual(["R"]);
  });

  it("abre a subestrutura como filha e soma as pendências da subárvore", () => {
    const raiz = montarArvore(linhas)[0].raizes[0];
    const sub = raiz.itens.find((i) => i.codigoPrd === "S");
    expect(sub?.filho?.codEstrutura).toBe("S");
    expect(sub?.filho?.status).toBe("ok");
    expect(raiz.pendentesTotal).toBe(2); // S não apontado na raiz + chapa em S
    expect(raiz.status).toBe("sem-saldo");
  });

  it("não entra em laço quando a estrutura consome a si mesma", () => {
    const ciclo = [comp({ codEstrutura: "A", codigoPrd: "B" }), comp({ codOrdem: "2/26", codEstrutura: "B", codigoPrd: "A" })];
    const ex = montarArvore(ciclo);
    expect(ex[0].raizes).toHaveLength(1);
  });

  it("'Mostrar' só o que não foi baixado mantém os níveis acima", () => {
    const tudoOk = [comp({ codEstrutura: "R", codigoPrd: "ARAME", apontado: 1, previsto: 1, apontado2: 1 })];
    expect(filtrarArvore(montarArvore(tudoOk)[0].raizes[0], "nao-baixado")).toBeNull();
    const raiz = filtrarArvore(montarArvore(linhas)[0].raizes[0], "nao-baixado");
    // ARAME está apontado e sai; S fica (não apontado no pai) com a chapa pendente
    expect(raiz?.itens.map((i) => i.codigoPrd)).toEqual(["S"]);
    expect(raiz?.itens[0].filho?.itens.map((i) => i.codigoPrd)).toEqual(["CHAPA"]);
  });

  it("'Mostrar' só o que falta subir saldo pega Sem saldo e OP sem dado", () => {
    const raiz = filtrarArvore(montarArvore(linhas)[0].raizes[0], "sem-saldo");
    // R está sem saldo e fica; S tem saldo subido e sai com a chapa
    expect(raiz?.codEstrutura).toBe("R");
    expect(raiz?.itens).toEqual([]);
    const semDado = [comp({ codEstrutura: "Z", codigoPrd: "ARAME", apontado: 1, previsto: 0, apontado2: 0 })];
    expect(filtrarArvore(montarArvore(semDado)[0].raizes[0], "sem-saldo")?.status).toBe("sem-dado");
    expect(filtroMostrar("qualquer")).toBe("tudo");
  });

  it("'Pendências do código' lista estruturas e componentes pendentes de todas as execuções", () => {
    const l = pendenciasDoCodigo(montarArvore(linhas), "tudo");
    expect(l.map((x) => `${x.exec}:${x.tipo}:${x.codigo}`)).toEqual([
      "1:estrutura:R", // sem saldo
      "1:estrutura:S", // no pai: não apontado
      "1:componente:CHAPA",
      "2:estrutura:X", // sem saldo
      "2:componente:CHAPA",
    ]);
    expect(pendenciasDoCodigo(montarArvore(linhas), "sem-saldo").map((x) => x.codigo)).toEqual(["R", "X"]);
    expect(pendenciasDoCodigo(montarArvore(linhas), "nao-baixado").map((x) => x.codigo)).toEqual(["S", "CHAPA", "CHAPA"]);
  });
});

describe("agregarOrigens (Linhagem)", () => {
  it("dá o mesmo resultado de resumirOrigens a partir dos totais somados no banco", () => {
    const comps = [
      comp({ tarFilho: "1.01", previsto: 2, apontado2: 1, apontado: 0 }),
      comp({ tarFilho: "1.01", previsto: 1, apontado2: 1, apontado: 3 }),
      comp({ tarFilho: "0", previsto: 4, apontado2: 0, apontado: 0 }),
      comp({ tarFilho: "1.30", previsto: 1, apontado2: 0, apontado: 0 }),
      comp({ tarFilho: "RETRABALHO", previsto: 1, apontado2: 1, apontado: 1 }),
    ];
    const somados = [
      { tarFilho: "0", previsto: 4, realizado: 0, componentes: 1, pendentes: 1 },
      { tarFilho: "1.30", previsto: 1, realizado: 0, componentes: 1, pendentes: 1 },
      { tarFilho: "1.01", previsto: 3, realizado: 2, componentes: 2, pendentes: 1 },
      { tarFilho: "RETRABALHO", previsto: 1, realizado: 1, componentes: 1, pendentes: 0 },
    ];
    expect(agregarOrigens("1.01", somados)).toEqual(resumirOrigens("1.01", comps));
    expect(agregarOrigens("1.01", somados).map((o) => tituloOrigem(o, "1.01"))).toEqual([
      "Fabricado nesta tarefa (1.01)",
      "Tarefa 1.30",
      "Material direto",
      "Retrabalho",
    ]);
  });
});

describe("linhagem completa", () => {
  // 1.05 › 1.30 › 2.10 ; 2.10 aponta de volta para 1.30 (laço) ; 1.30 também recebe retrabalho
  const mapa: Record<string, { tarFilho: string; tipo: "material" | "propria" | "outra" | "retrabalho" }[]> = {
    "1.05": [
      { tarFilho: "1.05", tipo: "propria" },
      { tarFilho: "1.30", tipo: "outra" },
      { tarFilho: "0", tipo: "material" },
    ],
    "1.30": [
      { tarFilho: "2.10", tipo: "outra" },
      { tarFilho: "RETRABALHO", tipo: "retrabalho" },
    ],
    "2.10": [{ tarFilho: "1.30", tipo: "outra" }],
    RETRABALHO: [{ tarFilho: "0", tipo: "material" }],
  };
  const filhas = (c: string) => mapa[c] ?? [];

  it("desce código dentro de código sem entrar em laço", () => {
    expect(caminhosDaLinhagem("1.05", filhas)).toEqual(["1.05>1.30", "1.05>1.30>2.10", "1.05>1.30>RETRABALHO"]);
  });
  it("respeita o limite de níveis", () => {
    expect(caminhosDaLinhagem("1.05", filhas, 2)).toEqual(["1.05>1.30"]);
  });
  it("código sem filhas não abre", () => {
    expect(caminhosDaLinhagem("9.99", filhas)).toEqual([]);
  });
});
