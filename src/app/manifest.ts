import type { MetadataRoute } from "next";

// Permite instalar a Gestão na tela inicial do celular ("Adicionar à tela inicial").
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Saldo PCP · Delp",
    short_name: "Saldo PCP",
    description: "Acompanhamento gerencial da subida de saldo",
    lang: "pt-BR",
    start_url: "/gestao",
    scope: "/",
    display: "standalone",
    background_color: "#EAE5DF",
    theme_color: "#FFFFFF",
    icons: [
      { src: "/icons/icone-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icone-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icone-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
