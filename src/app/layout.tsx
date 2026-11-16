import type { Metadata, Viewport } from "next";
import { Barlow } from "next/font/google";
import "./globals.css";

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-barlow",
});

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
    <html lang="pt-BR" className={barlow.variable}>
      <body>{children}</body>
    </html>
  );
}
