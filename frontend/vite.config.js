import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5180,
    strictPort: true,
    // Mirrors the Vercel /api rewrite when running `npm run dev` on its own
    proxy: {
      "/api": "http://localhost:5050",
    },
  },
});
