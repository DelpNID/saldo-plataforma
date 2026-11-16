// Origem: delp-visto@f66a6c3 src/components/marca/LogoVisto.tsx
// Desvios: arte do Ascent (SVG) no lugar da do Visto (PNG); as DUAS versões ficam no
//   HTML e o CSS (.so-tema-claro/.so-tema-escuro, globals.css) mostra a do tema, em vez
//   de trocar o `src` por useTemaEfetivo — o Ascent renderiza no servidor, e a troca em
//   JS faria o HTML do servidor discordar do navegador com o tema escuro salvo.
//   As duas levam alt="Ascent": a que está com display:none já sai da árvore de
//   acessibilidade. Ver docs/visto-desvios.md.
// -----------------------------------------------------------------------------
// LogoAscent.tsx — a marca do sistema
//
// `LogoAscent` é o lockup (três triângulos em escada sobre a base + "Ascent").
//   tom="escuro" (padrão): para fundo claro — base e texto pretos; no tema escuro
//                         vira a versão negativa sozinho.
//   tom="claro": para fundo escuro (o lado escuro do Login) — sempre a negativa.
// `SimboloAscent` é só o desenho, para onde o lockup não cabe (barra recolhida, 404).
// -----------------------------------------------------------------------------

interface LogoAscentProps {
  tom?: "claro" | "escuro";
  className?: string;
}

export function LogoAscent({ tom = "escuro", className = "" }: LogoAscentProps) {
  if (tom === "claro") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/images/ascent-logo-negativo.svg" alt="Ascent" width={4140} height={1035} className={`h-auto ${className}`} />;
  }
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/ascent-logo.svg" alt="Ascent" width={4140} height={1035} className={`so-tema-claro h-auto ${className}`} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/ascent-logo-negativo.svg" alt="Ascent" width={4140} height={1035} className={`so-tema-escuro h-auto ${className}`} />
    </>
  );
}

export function SimboloAscent({ className = "" }: { className?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/ascent-simbolo.svg" alt="Ascent" width={1124} height={954} className={`so-tema-claro h-auto ${className}`} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/ascent-simbolo-negativo.svg" alt="Ascent" width={1124} height={954} className={`so-tema-escuro h-auto ${className}`} />
    </>
  );
}
