import { defineConfig } from "eslint/config";
import prettier from "eslint-plugin-prettier";
import typescriptEslintEslintPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import path from "node:path";
import { fileURLToPath } from "node:url";
import js from "@eslint/js";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
    allConfig: js.configs.all
});

export default defineConfig([{
    extends: compat.extends("next", "next/core-web-vitals", "prettier"),

    plugins: {
        prettier,
    },

    rules: {
        "prettier/prettier": ["error", {
            endOfLine: "auto",
        }],

        camelcase: "off",
        "import/prefer-default-export": "off",
        "react/jsx-filename-extension": "off",
        "react/jsx-props-no-spreading": "off",
        "react/no-unused-prop-types": "off",
        "react/require-default-props": "off",
        "react/display-name": "off",

        "import/extensions": ["error", "ignorePackages", {
            ts: "never",
            tsx: "never",
            js: "never",
            jsx: "never",
        }],

        quotes: "off",

        "jsx-a11y/anchor-is-valid": ["error", {
            components: ["Link"],
            specialLink: ["hrefLeft", "hrefRight"],
            aspects: ["invalidHref", "preferButton"],
        }],
    },
}, {
    files: ["**/*.+(ts|tsx)"],
    extends: compat.extends("plugin:@typescript-eslint/recommended", "prettier"),

    languageOptions: {
        parser: tsParser,
    },

    rules: {
        "@typescript-eslint/no-use-before-define": "off",
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/explicit-module-boundary-types": "off",

        "@typescript-eslint/no-unused-vars": ["error", {
            ignoreRestSiblings: true,
            caughtErrorsIgnorePattern: "^_",
            destructuredArrayIgnorePattern: "^_",
            varsIgnorePattern: "^_",
        }],

        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-var-requires": "off",
        "@typescript-eslint/prefer-as-const": "off",
        "@typescript-eslint/no-empty-object-type": "off",
    },
}]);