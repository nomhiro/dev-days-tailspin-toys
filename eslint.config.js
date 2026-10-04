import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintPluginAstro from "eslint-plugin-astro";
import globals from "globals";

export default [
  {
    ignores: ["dist/", "node_modules/", ".astro/", "db/migrations/"],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      // Leading underscores make intentionally unused bindings explicit.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },

  ...eslintPluginAstro.configs.recommended,

  {
    files: ["**/*.ts"],
    ignores: ["**/*.astro"],
    languageOptions: {
      parser: tseslint.parser,
    },
    rules: {
      "eol-last": ["error", "always"],
      quotes: ["error", "single", { avoidEscape: true }],
      semi: ["error", "always"],
      "comma-dangle": ["error", "always-multiline"],
    },
  },
  {
    files: [
      "db/**/*.ts",
      "src/lib/**/*.ts",
      "src/types/**/*.ts",
      "drizzle.config.ts",
      "vitest.config.ts",
    ],
    rules: {
      indent: ["error", 4, { SwitchCase: 1 }],
    },
  },
  {
    files: ["e2e-tests/**/*.ts", "playwright.config.ts"],
    rules: {
      indent: ["error", 2, { SwitchCase: 1 }],
    },
  },
];
