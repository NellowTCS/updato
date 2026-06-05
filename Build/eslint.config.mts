import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig([
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "src/__tests__/**",
      "src/__mocks__/**",
      "jest.config.js",
      "jest.setup.js",
    ],
  },
  {
    files: ["**/*.{js,mjs,cjs,ts,mts,cts}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: {
          allowDefaultProject: ["*.mts", "*.mjs"],
        },
        tsconfigRootDir: __dirname,
      },
    },
  },
  tseslint.configs.recommended,
]);
