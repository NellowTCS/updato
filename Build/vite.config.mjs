import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve("src/updato.ts"),
      name: "Updato",
      formats: ["es", "umd"],
      fileName: (format) => {
        switch (format) {
          case "es":
            return "updato.mjs";
          case "umd":
            return "updato.js";
          default:
            return `updato.${format}`;
        }
      },
    },
    outDir: "dist",
    sourcemap: true,
    minify: "esbuild",
  },
});
