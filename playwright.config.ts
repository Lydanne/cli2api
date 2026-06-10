import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  fullyParallel: false,
  use: {
    baseURL: "http://127.0.0.1:4517"
  },
  webServer: {
    command: "pnpm --filter @cli2api/dash build && pnpm --filter @cli2api/core e2e:server",
    url: "http://127.0.0.1:4517/api/health",
    reuseExistingServer: false,
    timeout: 30_000
  }
});
