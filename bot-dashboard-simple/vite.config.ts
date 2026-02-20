import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  base: "/",
  build: {
    outDir: "public",
    emptyOutDir: true,
    assetsDir: "assets"
  },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:3000"
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
});
