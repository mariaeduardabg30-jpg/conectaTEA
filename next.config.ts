import type { NextConfig } from "next";

// O GitHub Pages serve apenas arquivos estáticos. O workflow de deploy define
// GITHUB_PAGES=true para gerar a exportação em `out/`, publicada em
// https://<usuario>.github.io/conectaTEA/. Fora isso o app mantém o build
// normal, compatível com Vercel/Node.
const isGitHubPages = process.env.GITHUB_PAGES === "true";
const basePath = isGitHubPages ? process.env.PAGES_BASE_PATH || "/conectaTEA" : "";

const nextConfig: NextConfig = {
  ...(isGitHubPages
    ? {
        output: "export" as const,
        basePath,
        assetPrefix: basePath,
        trailingSlash: true,
      }
    : {
        cacheComponents: true,
        partialPrefetching: true,
      }),
  env: {
    // Usado para montar links que não passam pelo next/link (ex.: redirect
    // de recuperação de senha e o logo em next/image).
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
  images: {
    // O único asset é o logo local; o export estático não executa o
    // otimizador de imagens.
    unoptimized: true,
  },
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
