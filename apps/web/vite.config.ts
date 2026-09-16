import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // El contrato de la API es UN solo archivo de tipos puros en el backend.
      // Se importa por alias en vez de duplicarlo: imposible que se desincronice.
      "@pix/contract": resolve(here, "../../src/lib/api-types.ts"),
      "@": resolve(here, "src"),
    },
  },
  server: {
    port: 5173,
    // En desarrollo el backend corre en :3000. Con el proxy, el navegador ve
    // todo en el mismo origen y no hay CORS ni cookies de terceros.
    proxy: {
      "/api": { target: process.env.VITE_API_PROXY ?? "http://localhost:3000", changeOrigin: true },
    },
  },
});
