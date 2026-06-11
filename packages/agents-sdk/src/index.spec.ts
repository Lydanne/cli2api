import { describe, expect, it } from "vitest";
import { ErrorCode } from "@cli2api/shared";
import {
  AdapterRegistry,
  MockAgentAdapter,
  collectAgentEvents,
  normalizeAdapterError
} from "./index.js";

describe("@cli2api/agents-sdk", () => {
  it("collects events from the mock provider", async () => {
    const adapter = new MockAgentAdapter();
    const events = await collectAgentEvents(
      adapter.run({
        runId: "run_1",
        prompt: "hello world",
        mode: "model",
        profile: { id: "mock", type: "mock", name: "Mock", cwd: process.cwd(), enabled: true },
        conversation: { scopeId: "api/profile/user/session" }
      })
    );

    expect(events.map((event) => event.type)).toEqual([
      "run.started",
      "conversation.updated",
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

  it("lists models through registered providers", async () => {
    const registry = new AdapterRegistry();
    registry.register({
      type: "custom",
      run: async function* () {
        yield { type: "run.started", runId: "unused" };
      },
      listModels: () => [
        {
          id: "custom-model",
          name: "Custom Model",
          type: "custom",
          source: "custom",
          config: { model: "custom-model" }
        }
      ]
    });

    await expect(registry.listModels()).resolves.toEqual([
      {
        id: "custom-model",
        name: "Custom Model",
        type: "custom",
        source: "custom",
        config: { model: "custom-model" }
      }
    ]);
  });
});
