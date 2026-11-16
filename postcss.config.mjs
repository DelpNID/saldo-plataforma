// Origem: delp-visto@f66a6c3 postcss.config.js
// Desvio provisório: `tailwindcss/nesting` só existe para o src/app/legado.css (o CSS
// antigo preso dentro de `.legado` enquanto as telas migram). Sai na limpeza final.
const config = {
  plugins: {
    "tailwindcss/nesting": {},
    tailwindcss: {},
    autoprefixer: {},
  },
};

export default config;
