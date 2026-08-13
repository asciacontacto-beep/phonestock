import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Artefacto de build legacy (Vite/PWA), no lintear
    "dist/**",
    // Scripts/throwaways legacy, fuera del código de la app
    "scripts/legacy/**",
    "scratch/**",
  ]),
]);

export default eslintConfig;
