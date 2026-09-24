import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // Vite's .env files populate import.meta.env for client code; they do NOT
  // reach process.env here. Without loadEnv, VITE_API_PROXY in .env is read as
  // undefined and the proxy silently falls back to the default port - which
  // looks exactly like a backend that is up but serving stale data.
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    server: {
      port: 5173,
      // The API runs on its own origin; proxying in dev keeps the browser
      // same-origin so nothing depends on CORS while developing.
      proxy: {
        "/api": {
          target: env.VITE_API_PROXY || "http://localhost:8000",
          changeOrigin: true,
        },
      },
    },
  };
});
