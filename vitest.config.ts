import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@cli2api/shared": new URL("./packages/shared/src/index.ts", import.meta.url).pathname,
      "@cli2api/agents-sdk": new URL("./packages/agents-sdk/src/index.ts", import.meta.url).pathname,
      "@cli2api/core": new URL("./apps/core/src/index.ts", import.meta.url).pathname
    }
  },
  test: {
    environment: "node",
    include: ["packages/**/*.spec.ts", "apps/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: [
        "packages/shared/src/**/*.ts",
        "packages/agents-sdk/src/**/*.ts",
        "apps/core/src/**/*.ts",
        "apps/dash/src/lib/**/*.ts"
      ],
      exclude: [
        "**/*.spec.ts",
        "**/dist/**",
        "packages/shared/src/**",
        "packages/agents-sdk/src/codex-adapter.ts",
        "apps/core/src/cli.ts",
        "apps/core/src/config.ts",
        "apps/core/src/server.ts",
        "apps/core/src/testing/**"
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        statements: 60,
        branches: 60
      }
    }
  }
});
