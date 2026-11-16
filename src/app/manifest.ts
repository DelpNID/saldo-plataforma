import type { MetadataRoute } from "next";

// Permite instalar a Gestão na tela inicial do celular ("Adicionar à tela inicial").
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ascent",
    short_name: "Ascent",
    description: "Acompanhamento gerencial da subida de saldo",
    lang: "pt-BR",
    start_url: "/gestao",
    scope: "/",
    display: "standalone",
    // Tokens do padrão do Visto: --bg-2 (fundo da página) e --bg (superfície).
    background_color: "#F5F5F5",
    theme_color: "#FFFFFF",
    icons: [
      { src: "/icons/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icone-512.png", sizes: "512x512", type: "image/png" },
      // Arte própria: fundo até a borda e desenho dentro da zona segura (80% centrais).
      { src: "/icons/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
