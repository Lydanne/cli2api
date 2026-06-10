import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

describe("@cli2api/core config", () => {
  const previousAuthHomeBase = process.env.CLI2API_AUTH_HOME_BASE;
  const previousRuntimeWorkspaceBase = process.env.CLI2API_RUNTIME_WORKSPACE_BASE;

  afterEach(() => {
    if (previousAuthHomeBase === undefined) {
      delete process.env.CLI2API_AUTH_HOME_BASE;
    } else {
      process.env.CLI2API_AUTH_HOME_BASE = previousAuthHomeBase;
    }
    if (previousRuntimeWorkspaceBase === undefined) {
      delete process.env.CLI2API_RUNTIME_WORKSPACE_BASE;
    } else {
      process.env.CLI2API_RUNTIME_WORKSPACE_BASE = previousRuntimeWorkspaceBase;
    }
  });

  it("loads runtime directory bases from environment and overrides", () => {
    process.env.CLI2API_AUTH_HOME_BASE = "/data/custom-codex-homes";
    process.env.CLI2API_RUNTIME_WORKSPACE_BASE = "/data/custom-runtime";

    expect(loadConfig().authHomeBase).toBe("/data/custom-codex-homes");
    expect(loadConfig().runtimeWorkspaceBase).toBe("/data/custom-runtime");
    expect(loadConfig({ authHomeBase: "/tmp/test-codex-homes" }).authHomeBase).toBe("/tmp/test-codex-homes");
    expect(loadConfig({ runtimeWorkspaceBase: "/tmp/test-runtime" }).runtimeWorkspaceBase).toBe("/tmp/test-runtime");
  });
});
