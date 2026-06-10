import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

describe("@cli2api/core config", () => {
  const keys = [
    "CLI2API_AUTH_HOME_BASE",
    "CLI2API_DB",
    "CLI2API_ENV_FILE",
    "CLI2API_HOME",
    "CLI2API_RUNTIME_WORKSPACE_BASE",
    "CLI2API_TEMP_DIR"
  ];
  const previousEnv = new Map(keys.map((key) => [key, process.env[key]]));

  afterEach(() => {
    for (const key of keys) {
      const value = previousEnv.get(key);
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it("derives local paths from CLI2API_HOME", () => {
    process.env.CLI2API_HOME = "/tmp/cli2api-home";

    expect(loadConfig()).toMatchObject({
      homeDir: "/tmp/cli2api-home",
      databasePath: "/tmp/cli2api-home/cli2api.sqlite",
      authHomeBase: "/tmp/cli2api-home/codex-homes",
      runtimeWorkspaceBase: "/tmp/cli2api-home/runtime-workspaces",
      tempDir: "/tmp/cli2api-home/tmp"
    });
  });

  it("loads runtime directory bases from environment and overrides", () => {
    process.env.CLI2API_AUTH_HOME_BASE = "/data/custom-codex-homes";
    process.env.CLI2API_RUNTIME_WORKSPACE_BASE = "/data/custom-runtime";
    process.env.CLI2API_TEMP_DIR = "/data/custom-tmp";

    expect(loadConfig().authHomeBase).toBe("/data/custom-codex-homes");
    expect(loadConfig().runtimeWorkspaceBase).toBe("/data/custom-runtime");
    expect(loadConfig().tempDir).toBe("/data/custom-tmp");
    expect(loadConfig({ authHomeBase: "/tmp/test-codex-homes" }).authHomeBase).toBe("/tmp/test-codex-homes");
    expect(loadConfig({ runtimeWorkspaceBase: "/tmp/test-runtime" }).runtimeWorkspaceBase).toBe("/tmp/test-runtime");
    expect(loadConfig({ tempDir: "/tmp/test-tmp" }).tempDir).toBe("/tmp/test-tmp");
  });

  it("loads .env values from the cli2api home and lets process env win", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cli2api-config-"));
    try {
      await writeFile(
        join(dir, ".env"),
        [
          "CLI2API_DB=./from-env-file.sqlite",
          "CLI2API_AUTH_HOME_BASE=./env-codex-homes",
          "CLI2API_RUNTIME_WORKSPACE_BASE=./env-runtime",
          "CLI2API_TEMP_DIR=./env-tmp"
        ].join("\n")
      );
      process.env.CLI2API_HOME = dir;
      process.env.CLI2API_TEMP_DIR = "/tmp/process-tmp";

      const config = loadConfig();
      expect(config.envFilePath).toBe(join(dir, ".env"));
      expect(config.databasePath).toBe(join(dir, "from-env-file.sqlite"));
      expect(config.authHomeBase).toBe(join(dir, "env-codex-homes"));
      expect(config.runtimeWorkspaceBase).toBe(join(dir, "env-runtime"));
      expect(config.tempDir).toBe("/tmp/process-tmp");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
