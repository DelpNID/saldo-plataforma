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
// CSS antigo, preso em .legado enquanto as telas migram para o padrão do Visto.
import "./legado.css";

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
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#1E1E1E" },
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        {/* Provisório (Tarefa 1): todas as telas ainda são antigas. A Tarefa 4 leva este invólucro para dentro de cada tela. */}
        <div className="legado min-h-screen">{children}</div>
      </body>
    </html>
  );
}
