import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import react from "@vitejs/plugin-react";

// Node.js deployment (Hostinger VPS) — sem o @cloudflare/vite-plugin.
// Build: npm run build → .output/server/index.mjs
// Start: node .output/server/index.mjs  (ou PM2)
export default defineConfig({
  plugins: [
    tanstackStart(),
    react(),
    tailwindcss(),
    tsConfigPaths(),
  ],
  resolve: {
    alias: { "@": "/src" },
  },
});
