import typescriptEslintPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";

import prettier from "eslint-plugin-prettier";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    // Base configuration for JavaScript and Prettier plugin
    languageOptions: {
      ecmaVersion: 2020,
      sourceType: "module",
    },
    plugins: {
      prettier,
    },
    rules: {
      ...prettier.configs.recommended.rules, // Prettier recommended rules
    },
  },
  {
    // TypeScript-specific configuration
    files: ["**/*.{ts,tsx}"], // Specify files for TypeScript
    languageOptions: {
      parser: tsParser,
    },
    plugins: {
      "@typescript-eslint": typescriptEslintPlugin,
    },
    rules: {
      ...typescriptEslintPlugin.configs.recommended.rules, // TypeScript rules
    },
  },
]);
