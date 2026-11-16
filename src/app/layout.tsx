import type { Metadata, Viewport } from "next";
// Fontes servidas pelo próprio app (sem chamada a terceiros no navegador), só nos pesos usados — como no Visto.
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/500.css";
import "@fontsource/barlow/600.css";
import "@fontsource/barlow/700.css";
import "@fontsource/jetbrains-mono/400.css";
import "@fontsource/jetbrains-mono/500.css";
import "@fontsource/jetbrains-mono/600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Ascent", template: "%s · Ascent" },
  description: "Acompanhamento da subida de saldo para o PCP",
  robots: { index: false, follow: false },
  // Gestão instalável no celular: o manifest.webmanifest vem de src/app/manifest.ts
  appleWebApp: { capable: true, title: "Ascent", statusBarStyle: "default" },
  icons: { icon: "/icons/ascent-icone.svg", apple: "/icons/apple-touch-icon.png" },
};

// Cor da barra do navegador no celular: a superfície (--bg) do tema claro, o único do Ascent.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Sem viewportFit "cover": o navegador mantém o conteúdo fora do entalhe e do indicador de início do iPhone
  // (o CSS antigo compensava com env(safe-area-inset-*), que saiu com o legado). Revisão final, 16/11.
  themeColor: "#FFFFFF",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
