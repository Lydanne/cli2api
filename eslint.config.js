import js from "@eslint/js";
import vue from "eslint-plugin-vue";
import tseslint from "typescript-eslint";

const globals = {
  console: "readonly",
  document: "readonly",
  fetch: "readonly",
  globalThis: "readonly",
  module: "readonly",
  process: "readonly",
  Request: "readonly",
  RequestInfo: "readonly",
  RequestInit: "readonly",
  Response: "readonly",
  setTimeout: "readonly",
  URL: "readonly",
  window: "readonly"
};

export default [
  {
    ignores: [
      "**/coverage/**",
      "**/dist/**",
      "**/node_modules/**",
      "**/test-results/**",
      "packages/*/src/**/*.d.ts",
      "packages/*/src/**/*.js",
      "packages/*/src/**/*.map"
    ]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs["flat/essential"],
  {
    files: ["**/*.{js,mjs,cjs,ts,vue}"],
    languageOptions: {
      ecmaVersion: "latest",
      globals,
      parserOptions: {
        parser: tseslint.parser,
        sourceType: "module"
      }
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "vue/multi-word-component-names": "off"
    }
  },
  {
    files: ["apps/dash/src/**/*.{ts,vue}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["./*.js", "../*.js", "./**/*.js", "../**/*.js"],
              message: "Use extensionless relative imports in Vite dashboard code."
            }
          ]
        }
      ]
    }
  }
];
