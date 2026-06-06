import { defineConfig } from "tsdown";

export default defineConfig({
  entry: ["src/updato.ts", "src/update-ui.ts", "src/metrics.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  minify: true,
  clean: true,
  outDir: "dist",
});
