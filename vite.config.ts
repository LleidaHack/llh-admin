import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [react(), tailwindcss()],
    resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
    server: {
      host: "127.0.0.1",
      port: 5175,
      strictPort: true,
      proxy: {
        "/api": {
          target: env.API_TARGET || "http://127.0.0.1:8000",
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ""),
        },
      },
    },
  };
});
