import js from "@eslint/js";
import globals from "globals";
import tailwindPlugin from "eslint-plugin-tailwindcss";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import vuePlugin from "eslint-plugin-vue";
import vueParser from "vue-eslint-parser";

export default [
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "**/.turbo/**",
      "**/coverage/**",
    ],
  },
  js.configs.recommended,
  ...vuePlugin.configs["flat/recommended"],
  {
    files: ["**/*.{ts,tsx,vue}"],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        ecmaVersion: "latest",
        sourceType: "module",
        extraFileExtensions: [".vue"],
      },
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { args: "none" },
      ],
      "vue/multi-word-component-names": "off",
    },
  },
  {
    files: [
      "apps/user-web/src/**/*.{ts,tsx,vue}",
      "apps/admin-web/src/**/*.{ts,tsx,vue}",
      "packages/web-shared/src/**/*.{ts,vue}",
    ],
    plugins: {
      tailwindcss: tailwindPlugin,
    },
    rules: {
      "tailwindcss/classnames-order": ["warn", { config: {} }],
      "tailwindcss/enforces-shorthand": ["warn", { config: {} }],
      "tailwindcss/no-unnecessary-arbitrary-value": ["warn", { config: {} }],
    },
  },
];
