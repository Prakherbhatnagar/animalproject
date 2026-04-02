/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sora: ["'Sora'", "sans-serif"],
        dm: ["'DM Sans'", "sans-serif"],
      },
      colors: {
        rescue: {
          green: {
            50: "#f0fdf4",
            400: "#4ade80",
            500: "#22c55e",
            600: "#16a34a",
            900: "#14532d",
          },
          orange: {
            400: "#fb923c",
            500: "#f97316",
            600: "#ea580c",
          },
        },
      },
      animation: {
        "slide-in": "slideIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) both",
        "fade-up": "fadeUp 0.4s ease-out both",
        "count-pop": "countPop 0.5s ease-out",
      },
      keyframes: {
        slideIn: {
          from: { transform: "translateX(120%)", opacity: "0" },
          to: { transform: "translateX(0)", opacity: "1" },
        },
        fadeUp: {
          from: { transform: "translateY(16px)", opacity: "0" },
          to: { transform: "translateY(0)", opacity: "1" },
        },
        countPop: {
          from: { transform: "scale(1.8)", opacity: "0" },
          to: { transform: "scale(1)", opacity: "1" },
        },
      },
      backdropBlur: {
        xs: "2px",
      },
    },
  },
  plugins: [],
};

/* ── tsconfig.json ──────────────────────────── */
// Save separately as tsconfig.json:
/*
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src", "*.tsx", "*.ts"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
*/

/* ── vite.config.ts ─────────────────────────── */
// Save separately as vite.config.ts:
/*
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
  },
});
*/
