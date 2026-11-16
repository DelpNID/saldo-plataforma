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
  title: { default: "Subida de Saldo · Delp", template: "%s · Subida de Saldo" },
  description: "Acompanhamento da subida de saldo para o PCP",
  robots: { index: false, follow: false },
  // Gestão instalável no celular: o manifest.webmanifest vem de src/app/manifest.ts
  appleWebApp: { capable: true, title: "Saldo PCP", statusBarStyle: "default" },
  icons: { icon: "/icons/icone-192.png", apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#FFFFFF" };

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
