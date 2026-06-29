import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cores por status (regra de UX do projeto)
        status: {
          novo: "#9ca3af",        // cinza
          qualificado: "#8b5cf6", // roxo
          orcamento: "#f59e0b",   // ambar
          negociacao: "#3b82f6",  // azul
          fechado: "#22c55e",     // verde
          perdido: "#ef4444",     // vermelho
        },
        brand: {
          50: "#eef2ff",
          100: "#e0e7ff",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
        },
      },
    },
  },
  plugins: [],
};

export default config;
