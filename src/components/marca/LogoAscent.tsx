// Origem: delp-visto@f66a6c3 src/components/marca/LogoVisto.tsx
// Desvio: arte do Ascent (SVG) no lugar da do Visto (PNG). O Ascent só tem o tema
//   claro, então não há troca de arte por tema. Ver docs/visto-desvios.md.
// -----------------------------------------------------------------------------
// LogoAscent.tsx — a marca do sistema
//
// `LogoAscent` é o lockup: o símbolo da Delp (três triângulos para baixo, cantos
//   arredondados, #CC0F10) + "Ascent". Símbolo na altura do "A", com a ponta na linha
//   de base, como na logo Delp (pedido do responsável em 16/11/2026).
//   tom="escuro" (padrão): para fundo claro — base e texto pretos.
//   tom="claro": para fundo escuro (o lado da cena no Login) — a versão negativa.
// `SimboloAscent` é só o desenho, para onde o lockup não cabe (barra recolhida, 404).
// -----------------------------------------------------------------------------

interface LogoAscentProps {
  tom?: "claro" | "escuro";
  className?: string;
}

export function LogoAscent({ tom = "escuro", className = "" }: LogoAscentProps) {
  const arte = tom === "claro" ? "/images/ascent-logo-negativo.svg" : "/images/ascent-logo.svg";
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={arte} alt="Ascent" width={3750} height={660} className={`h-auto ${className}`} />;
}

export function SimboloAscent({ className = "" }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/images/ascent-simbolo.svg" alt="Ascent" width={714} height={633} className={`h-auto ${className}`} />;
}
