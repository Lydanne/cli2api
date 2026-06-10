import { describe, expect, it } from "vitest";
import { ErrorCode } from "@cli2api/shared";
import {
  AdapterRegistry,
  CodexAdapter,
  MockAgentAdapter,
  collectAgentEvents,
  normalizeAdapterError
} from "./index.js";

describe("@cli2api/agents-sdk", () => {
  it("collects events from the mock adapter", async () => {
    const adapter = new MockAgentAdapter();
    const events = await collectAgentEvents(
      adapter.run({
        runId: "run_1",
        prompt: "hello world",
        profile: { id: "mock", type: "mock", name: "Mock", cwd: process.cwd(), enabled: true }
      })
    );

    expect(events.map((event) => event.type)).toEqual([
      "run.started",
      "output.delta",
      "usage.updated",
      "run.completed"
    ]);
  });

  it("registers and resolves adapters by type", () => {
    const registry = new AdapterRegistry();
    const adapter = new MockAgentAdapter();
    registry.register(adapter);

    expect(registry.get("mock")).toBe(adapter);
    expect(() => registry.get("missing")).toThrow(/No adapter registered/);
  });

  it("normalizes adapter failures", () => {
    const error = normalizeAdapterError(new Error("bad upstream"));

    expect(error.code).toBe(ErrorCode.RUN_FAILED);
    expect(error.message).toBe("bad upstream");
  });

  it("builds Codex SDK options without request-controlled cwd overrides", () => {
    const adapter = new CodexAdapter();
    const options = adapter.createSdkOptions({
      id: "codex-default",
      type: "codex",
      name: "Codex",
      cwd: "/repo",
      enabled: true,
      env: { CODEX_API_KEY: "test" },
      config: { model: "gpt-5" }
    });

    expect(options.env).toEqual({ CODEX_API_KEY: "test" });
    expect(options.config).toEqual({ model: "gpt-5" });
  });
});
