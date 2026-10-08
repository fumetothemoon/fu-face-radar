import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served from https://fumetothemoon.github.io/fu-face-radar/
export default defineConfig({
  base: "/fu-face-radar/",
  plugins: [react()],
});
