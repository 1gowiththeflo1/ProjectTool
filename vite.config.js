import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // erlaubte Hosts für Entwicklung (falls benötigt)
    allowedHosts: ['devserver-main--porjectcalc.netlify.app'],
  },
  build: {
    outDir: "dist",
  },
});
