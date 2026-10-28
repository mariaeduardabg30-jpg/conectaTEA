import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  experimental: {
    // Todas as páginas são componentes cliente que carregam dados no navegador
    // (sessão, dependentes e registros), então a validação de navegação
    // instantânea não se aplica e só geraria ruído no log de desenvolvimento.
    instantInsights: {
      validationLevel: "manual-warning",
    },
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
