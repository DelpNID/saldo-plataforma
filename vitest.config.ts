import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  // JSX automático (o mesmo do Next): o tsconfig diz "preserve", e sem isto os componentes
  // testados com renderToStaticMarkup quebram com "React is not defined".
  esbuild: { jsx: "automatic" },
  test: { include: ["tests/**/*.test.ts"] },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
});
