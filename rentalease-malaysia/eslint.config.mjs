import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Type-aware pass: catches un-awaited promises (fire-and-forget calls that
  // silently drop errors). Kept as a warning so editors flag them without
  // breaking the build; flip to "error" once the backlog is zero.
  // Scoped to TypeScript sources — the .mjs config files are not part of the
  // TypeScript project and would fail the project-service lookup.
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-floating-promises": "warn",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
