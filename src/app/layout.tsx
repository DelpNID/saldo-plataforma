import type { Metadata, Viewport } from "next";
import { IniciarTema } from "@/components/layout/IniciarTema";
import { SCRIPT_TEMA } from "@/lib/tema-script";
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

// Cor da barra do navegador no celular: a superfície (--bg) de cada tema do Visto.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Sem viewportFit "cover": o navegador mantém o conteúdo fora do entalhe e do indicador de início do iPhone
  // (o CSS antigo compensava com env(safe-area-inset-*), que saiu com o legado). Revisão final, 16/11.
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#1E1E1E" },
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: o script do <head> põe o data-tema antes do React chegar.
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        {/* Tema antes da primeira pintura (sem o lampejo branco para quem escolheu o escuro). */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body>
        <IniciarTema />
        {children}
      </body>
    </html>
  );
}
