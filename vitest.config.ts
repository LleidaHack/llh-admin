import { defineConfig } from "vitest/config";
import path from "node:path";

// Standalone vitest config (the app no longer uses Vite for the dev server).
// Unit tests cover src/lib only and stub browser globals themselves.
export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
  test: { environment: "node", include: ["src/**/*.test.ts"] },
});
