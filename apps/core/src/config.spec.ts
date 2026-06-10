import { afterEach, describe, expect, it } from "vitest";
import { loadConfig } from "./config.js";

describe("@cli2api/core config", () => {
  const previousAuthHomeBase = process.env.CLI2API_AUTH_HOME_BASE;

  afterEach(() => {
    if (previousAuthHomeBase === undefined) {
      delete process.env.CLI2API_AUTH_HOME_BASE;
    } else {
      process.env.CLI2API_AUTH_HOME_BASE = previousAuthHomeBase;
    }
  });

  it("loads the upstream auth home base from environment and overrides", () => {
    process.env.CLI2API_AUTH_HOME_BASE = "/data/custom-codex-homes";

    expect(loadConfig().authHomeBase).toBe("/data/custom-codex-homes");
    expect(loadConfig({ authHomeBase: "/tmp/test-codex-homes" }).authHomeBase).toBe("/tmp/test-codex-homes");
  });
});
