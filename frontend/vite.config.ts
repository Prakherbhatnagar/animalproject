import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Must be `/api/` not `/api` — otherwise Vite tries to proxy the module URL `/api.ts` and the app stays blank.
      "^/api/": { target: "http://localhost:5000", changeOrigin: true },
      // Socket.IO connects directly to the API (see getSocketOrigin in lib/apiClient.ts) — no WS proxy.
    },
  },
});
