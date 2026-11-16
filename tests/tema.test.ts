// Origem: delp-visto@f66a6c3 src/lib/tema.test.ts (só o caminho do import e a chave 'ascent.tema')
// -----------------------------------------------------------------------------
// tema.test.ts — a escolha de tema e o que ela escreve no documento.
//
// O módulo guarda estado em variável de módulo e lê o storage no import, então
// cada caso recarrega o módulo (resetModules + import dinâmico) em vez de
// tentar desfazer o estado anterior.
// -----------------------------------------------------------------------------
import { beforeEach, describe, expect, it, vi } from 'vitest';

/** localStorage e matchMedia de mentira, no mínimo que o módulo usa. */
function prepararJanela({
  salvo,
  sistemaEscuro = false,
  storageQuebrado = false,
}: {
  salvo?: string;
  sistemaEscuro?: boolean;
  storageQuebrado?: boolean;
}) {
  const dados = new Map<string, string>();
  if (salvo !== undefined) dados.set('ascent.tema', salvo);

  const storage = {
    getItem: (c: string) => {
      if (storageQuebrado) throw new Error('bloqueado');
      return dados.get(c) ?? null;
    },
    setItem: (c: string, v: string) => {
      if (storageQuebrado) throw new Error('bloqueado');
      dados.set(c, v);
    },
  };
  vi.stubGlobal('localStorage', storage);
  vi.stubGlobal('matchMedia', (consulta: string) => ({
    matches: consulta.includes('dark') && sistemaEscuro,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
  // O módulo fala com window.localStorage e window.matchMedia.
  (globalThis as unknown as { window: unknown }).window = globalThis;
  (globalThis as unknown as { document: unknown }).document = {
    documentElement: {
      atributos: new Map<string, string>(),
      setAttribute(nome: string, valor: string) {
        this.atributos.set(nome, valor);
      },
    },
  };
  return dados;
}

function temaNoDocumento(): string | undefined {
  const raiz = (globalThis as unknown as {
    document: { documentElement: { atributos: Map<string, string> } };
  }).document.documentElement;
  return raiz.atributos.get('data-tema');
}

describe('tema', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
  });

  it('sem escolha salva, fica em "sistema"', async () => {
    prepararJanela({});
    const { lerTema } = await import('../src/lib/tema');
    expect(lerTema()).toBe('sistema');
  });

  it('valor estranho no storage não vira tema', async () => {
    prepararJanela({ salvo: 'neon' });
    const { lerTema } = await import('../src/lib/tema');
    expect(lerTema()).toBe('sistema');
  });

  it('em "sistema", o documento recebe o tema do sistema operacional', async () => {
    prepararJanela({ sistemaEscuro: true });
    const { iniciarTema } = await import('../src/lib/tema');
    iniciarTema();
    expect(temaNoDocumento()).toBe('escuro');
  });

  it('a escolha vence o sistema', async () => {
    prepararJanela({ salvo: 'claro', sistemaEscuro: true });
    const { iniciarTema } = await import('../src/lib/tema');
    iniciarTema();
    expect(temaNoDocumento()).toBe('claro');
  });

  it('definir grava, aplica e avisa quem escuta', async () => {
    const dados = prepararJanela({});
    const { definirTema, lerTema } = await import('../src/lib/tema');
    definirTema('escuro');
    expect(lerTema()).toBe('escuro');
    expect(dados.get('ascent.tema')).toBe('escuro');
    expect(temaNoDocumento()).toBe('escuro');
  });

  it('storage bloqueado não derruba a troca — ela vale nesta sessão', async () => {
    prepararJanela({ storageQuebrado: true });
    const { definirTema, lerTema } = await import('../src/lib/tema');
    definirTema('escuro');
    expect(lerTema()).toBe('escuro');
    expect(temaNoDocumento()).toBe('escuro');
  });
});
