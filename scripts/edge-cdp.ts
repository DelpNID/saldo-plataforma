// Dirige o Edge da estação em modo headless pelo protocolo de depuração (CDP),
// sem baixar navegador: é o que a conferência visual e a geração de ícones usam.
// O WebSocket e o fetch são os globais do Node (22+).
//
// Segurança (gate de 16/11): o proxy corporativo NÃO é contornado — o Chromium já
// não passa localhost/127.0.0.1 pelo proxy; a porta de depuração só aceita a
// própria máquina; o perfil temporário (cookies, cache com dado de cliente) é
// apagado ao fechar, aconteça o que acontecer.
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const EDGE_PADRAO = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const PORTA = 9333;
const BASE = `http://127.0.0.1:${PORTA}`;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Params = any;
type Ouvinte = (params: Params) => void;

export interface Edge {
  enviar<T = unknown>(metodo: string, params?: object): Promise<T>;
  /** Escuta um evento do CDP; devolve a função que para de escutar. */
  ao(evento: string, ouvinte: Ouvinte): () => void;
  fechar(): Promise<void>;
}

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function alvoDePagina(prazoMs: number): Promise<string> {
  const fim = Date.now() + prazoMs;
  while (Date.now() < fim) {
    try {
      const alvos = (await (await fetch(`${BASE}/json/list`)).json()) as { type: string; webSocketDebuggerUrl: string }[];
      const pagina = alvos.find((a) => a.type === "page");
      if (pagina) return pagina.webSocketDebuggerUrl;
    } catch {
      // o Edge ainda está subindo
    }
    await espera(250);
  }
  throw new Error(`O Edge não abriu a porta de depuração ${PORTA} a tempo.`);
}

function conectar(url: string): Promise<{ ws: WebSocket; enviar: Edge["enviar"]; ao: Edge["ao"] }> {
  return new Promise((resolver, rejeitar) => {
    const ws = new WebSocket(url);
    let proximo = 1;
    const pendentes = new Map<number, { ok: (v: unknown) => void; erro: (e: Error) => void }>();
    const ouvintes = new Map<string, Set<Ouvinte>>();

    ws.addEventListener("message", (ev) => {
      const msg = JSON.parse(String(ev.data));
      if (msg.id && pendentes.has(msg.id)) {
        const p = pendentes.get(msg.id)!;
        pendentes.delete(msg.id);
        if (msg.error) p.erro(new Error(`${msg.error.message} (${msg.error.code})`));
        else p.ok(msg.result);
      } else if (msg.method) {
        ouvintes.get(msg.method)?.forEach((f) => f(msg.params));
      }
    });
    ws.addEventListener("error", () => rejeitar(new Error(`Falha ao conectar em ${url}`)));
    ws.addEventListener("open", () =>
      resolver({
        ws,
        enviar: <T,>(metodo: string, params: object = {}) =>
          new Promise<T>((ok, erro) => {
            const id = proximo++;
            pendentes.set(id, { ok: ok as (v: unknown) => void, erro });
            ws.send(JSON.stringify({ id, method: metodo, params }));
          }),
        ao: (evento, ouvinte) => {
          if (!ouvintes.has(evento)) ouvintes.set(evento, new Set());
          ouvintes.get(evento)!.add(ouvinte);
          return () => ouvintes.get(evento)!.delete(ouvinte);
        },
      }),
    );
  });
}

function apagarPerfil(perfil: string): void {
  try {
    rmSync(perfil, { recursive: true, force: true, maxRetries: 10, retryDelay: 300 });
  } catch {
    console.error(`Aviso: não consegui apagar o perfil temporário ${perfil}; apague à mão.`);
  }
}

async function encerrar(processo: ChildProcess): Promise<void> {
  try {
    const versao = (await (await fetch(`${BASE}/json/version`)).json()) as { webSocketDebuggerUrl: string };
    const navegador = await conectar(versao.webSocketDebuggerUrl);
    await navegador.enviar("Browser.close").catch(() => undefined);
  } catch {
    // já fechado ou sem resposta: o kill abaixo resolve
  }
  await espera(1000);
  if (processo.exitCode === null) processo.kill();
  await espera(500);
}

export async function abrirEdge(): Promise<Edge> {
  const exe = process.env.EDGE_PATH || EDGE_PADRAO;
  const perfil = mkdtempSync(path.join(tmpdir(), "ascent-edge-"));
  const processo: ChildProcess = spawn(
    exe,
    [
      "--headless=new",
      `--remote-debugging-port=${PORTA}`,
      `--remote-allow-origins=${BASE}`,
      `--user-data-dir=${perfil}`,
      "--no-first-run",
      "--no-default-browser-check",
      "--hide-scrollbars",
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  try {
    const pagina = await conectar(await alvoDePagina(20_000));
    await Promise.all(["Page.enable", "Runtime.enable", "Log.enable", "Network.enable"].map((m) => pagina.enviar(m)));
    return {
      enviar: pagina.enviar,
      ao: pagina.ao,
      async fechar() {
        try {
          pagina.ws.close();
          await encerrar(processo);
        } finally {
          apagarPerfil(perfil);
        }
      },
    };
  } catch (e) {
    await encerrar(processo);
    apagarPerfil(perfil);
    throw e;
  }
}

function esperarEvento(edge: Edge, evento: string, prazoMs: number): Promise<void> {
  return new Promise((ok, erro) => {
    const parar = edge.ao(evento, () => {
      clearTimeout(t);
      parar();
      ok();
    });
    const t = setTimeout(() => {
      parar();
      erro(new Error(`Tempo esgotado esperando ${evento}`));
    }, prazoMs);
  });
}

async function navegar(edge: Edge, url: string): Promise<void> {
  const carregou = esperarEvento(edge, "Page.loadEventFired", 60_000);
  await edge.enviar("Page.navigate", { url });
  await carregou;
}

function textoDoErro(p: Params): string {
  return p?.exceptionDetails?.exception?.description ?? p?.exceptionDetails?.text ?? "exceção sem texto";
}

/**
 * Contraste WCAG de todo texto visível, contra o fundo efetivo (camadas
 * translúcidas compostas até a primeira opaca). Texto sobre imagem/degradê e
 * controle desabilitado ficam de fora (o primeiro não se mede assim; o
 * segundo é isento). Devolve só o que fica abaixo de 4,5:1 (3:1 se grande).
 */
const SCRIPT_CONTRASTE = `(() => {
  const cor = (s) => { const m = /rgba?\\(([^)]+)\\)/.exec(s); if (!m) return null;
    const p = m[1].split(/[\\s,/]+/).filter(Boolean).map(Number); return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 }; };
  const sobre = (c, f) => ({ r: c.r * c.a + f.r * (1 - c.a), g: c.g * c.a + f.g * (1 - c.a), b: c.b * c.a + f.b * (1 - c.a), a: 1 });
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const fundo = (el) => { const camadas = [];
    for (let e = el; e; e = e.parentElement) { const cs = getComputedStyle(e);
      if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
      const c = cor(cs.backgroundColor); if (c && c.a > 0) { camadas.push(c); if (c.a >= 1) break; } }
    let f = { r: 255, g: 255, b: 255, a: 1 }; if (camadas.length && camadas[camadas.length - 1].a >= 1) f = camadas.pop();
    while (camadas.length) f = sobre(camadas.pop(), f); return f; };
  const falhas = [];
  for (const el of document.querySelectorAll('body *')) {
    const texto = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(' ').trim();
    if (!texto || !el.getClientRects().length) continue;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || Number(cs.opacity) === 0 || el.closest('[disabled],[aria-disabled="true"],.sr-only,.sr')) continue;
    const f = fundo(el); if (!f) continue;
    const c0 = cor(cs.color); if (!c0) continue; const c = sobre(c0, f);
    const l1 = lum(c), l2 = lum(f); const razao = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    const px = parseFloat(cs.fontSize); const grande = px >= 24 || (px >= 18.66 && Number(cs.fontWeight) >= 700);
    if (razao < (grande ? 3 : 4.5)) falhas.push(texto.slice(0, 40) + ' — ' + razao.toFixed(2) + ':1, ' + px + 'px');
  }
  return falhas;
})()`;

export interface ResultadoCaptura {
  png: Buffer;
  erros: string[];
  rolagemLateral: boolean;
  /** Textos abaixo do AA (vazio no modo rolado e na impressão, onde não se mede). */
  contraste: string[];
}

export async function capturarPng(
  edge: Edge,
  o: {
    url: string;
    largura: number;
    tema: "claro" | "escuro";
    impressao?: boolean;
    modo?: "pagina" | "rolado";
    armazenamento?: Record<string, string>;
    cookie?: { nome: string; valor: string };
  },
): Promise<ResultadoCaptura> {
  const erros: string[] = [];
  const paradas = [
    edge.ao("Runtime.exceptionThrown", (p) => erros.push(textoDoErro(p))),
    edge.ao("Runtime.consoleAPICalled", (p) => {
      if (p.type === "error") erros.push(p.args.map((a: Params) => a.value ?? a.description ?? "").join(" "));
    }),
    edge.ao("Log.entryAdded", (p) => {
      // O 404 do PRÓPRIO documento (a captura da página inexistente) não é erro da tela.
      if (p.entry.level === "error" && p.entry.url !== o.url) erros.push(`${p.entry.text}${p.entry.url ? ` (${p.entry.url})` : ""}`);
    }),
  ];
  const origem = new URL(o.url).origin;
  let scriptArmazenamento: string | undefined;
  try {
    await edge.enviar("Network.clearBrowserCookies");
    await edge.enviar("Storage.clearDataForOrigin", { origin: origem, storageTypes: "local_storage" });
    if (o.cookie) await edge.enviar("Network.setCookie", { name: o.cookie.nome, value: o.cookie.valor, url: origem, path: "/" });
    if (o.armazenamento) {
      const gravar = Object.entries(o.armazenamento)
        .map(([k, v]) => `localStorage.setItem(${JSON.stringify(k)}, ${JSON.stringify(v)});`)
        .join("");
      const r = await edge.enviar<{ identifier: string }>("Page.addScriptToEvaluateOnNewDocument", {
        source: `try { if (location.origin === ${JSON.stringify(origem)}) { ${gravar} } } catch (e) {}`,
      });
      scriptArmazenamento = r.identifier;
    }
    const mobile = o.largura < 600;
    await edge.enviar("Emulation.setDeviceMetricsOverride", { width: o.largura, height: 900, deviceScaleFactor: 1, mobile });
    await edge.enviar("Emulation.setEmulatedMedia", {
      media: o.impressao ? "print" : "",
      features: [{ name: "prefers-color-scheme", value: o.tema === "escuro" ? "dark" : "light" }],
    });
    await navegar(edge, o.url);
    await espera(1500);

    const avaliar = async <T,>(expressao: string): Promise<T> =>
      (await edge.enviar<{ result: { value: T } }>("Runtime.evaluate", { expression: expressao, returnByValue: true })).result.value;

    const rolagemLateral = Boolean(await avaliar<boolean>("document.documentElement.scrollWidth > window.innerWidth"));
    const medeContraste = o.modo !== "rolado" && !o.impressao;
    const contraste = medeContraste ? ((await avaliar<string[]>(SCRIPT_CONTRASTE)) ?? []) : [];

    if (o.modo === "rolado") {
      await avaliar("window.scrollTo(0, Math.min(2500, document.documentElement.scrollHeight - window.innerHeight))");
      await espera(400);
    } else {
      const metricas = await edge.enviar<{ cssContentSize: { height: number } }>("Page.getLayoutMetrics");
      const altura = Math.min(Math.ceil(metricas.cssContentSize.height), 8000);
      await edge.enviar("Emulation.setDeviceMetricsOverride", { width: o.largura, height: Math.max(altura, 900), deviceScaleFactor: 1, mobile });
      await espera(300);
    }
    const foto = await edge.enviar<{ data: string }>("Page.captureScreenshot", { format: "png" });
    return { png: Buffer.from(foto.data, "base64"), erros, rolagemLateral, contraste };
  } finally {
    paradas.forEach((parar) => parar());
    if (scriptArmazenamento) await edge.enviar("Page.removeScriptToEvaluateOnNewDocument", { identifier: scriptArmazenamento });
  }
}

/** Desenha um SVG num quadrado de `tamanho` px com fundo transparente. */
export async function renderizarSvg(edge: Edge, svg: string, tamanho: number): Promise<Buffer> {
  const img = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  const html = `<!doctype html><html><head><style>html,body{margin:0;background:transparent}img{display:block}</style></head><body><img src="${img}" width="${tamanho}" height="${tamanho}"></body></html>`;
  await edge.enviar("Emulation.setDeviceMetricsOverride", { width: tamanho, height: tamanho, deviceScaleFactor: 1, mobile: false });
  await edge.enviar("Emulation.setDefaultBackgroundColorOverride", { color: { r: 0, g: 0, b: 0, a: 0 } });
  try {
    await navegar(edge, `data:text/html;base64,${Buffer.from(html).toString("base64")}`);
    await espera(200);
    const foto = await edge.enviar<{ data: string }>("Page.captureScreenshot", {
      format: "png",
      clip: { x: 0, y: 0, width: tamanho, height: tamanho, scale: 1 },
    });
    return Buffer.from(foto.data, "base64");
  } finally {
    await edge.enviar("Emulation.setDefaultBackgroundColorOverride", {});
  }
}
