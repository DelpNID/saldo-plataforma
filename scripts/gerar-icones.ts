// Gera os PNGs do app instalado a partir dos SVGs da marca, desenhando no Edge da
// estação (sem instalar nada). Uso: npm run icones
//   ascent-icone.svg                → icone-192.png, icone-512.png (ícone comum, cantos arredondados)
//   fonte/ascent-icone-maskable.svg → icone-maskable-512.png (fundo até a borda, desenho na zona segura)
//   fonte/ascent-icone-quadrado.svg → apple-touch-icon.png (o iOS arredonda sozinho)
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { abrirEdge, renderizarSvg } from "./edge-cdp";

const ICONES = path.join("public", "icons");
const SAIDAS: { fonte: string; destino: string; tamanho: number }[] = [
  { fonte: "ascent-icone.svg", destino: "icone-192.png", tamanho: 192 },
  { fonte: "ascent-icone.svg", destino: "icone-512.png", tamanho: 512 },
  { fonte: "fonte/ascent-icone-maskable.svg", destino: "icone-maskable-512.png", tamanho: 512 },
  { fonte: "fonte/ascent-icone-quadrado.svg", destino: "apple-touch-icon.png", tamanho: 180 },
];

async function main() {
  const edge = await abrirEdge();
  try {
    for (const s of SAIDAS) {
      const png = await renderizarSvg(edge, readFileSync(path.join(ICONES, s.fonte), "utf8"), s.tamanho);
      writeFileSync(path.join(ICONES, s.destino), png);
      console.log(`${s.destino.padEnd(24)} ${s.tamanho}px  ${png.length} bytes`);
    }
  } finally {
    await edge.fechar();
  }
}

main().catch((e) => {
  console.error(`\nERRO: ${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
