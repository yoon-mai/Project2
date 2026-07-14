import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  root: "static-app",
  base: "/Project2/",
  plugins: [react()],
  build: {
    outDir: "../site-dist",
    emptyOutDir: true,
  },
});
