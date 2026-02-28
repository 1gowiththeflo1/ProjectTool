import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

server: {
  allowedHosts: ['devserver-main--porjectcalc.netlify.app'],
}
server: {
  allowedHosts: true
}

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "dist",
  },
});
