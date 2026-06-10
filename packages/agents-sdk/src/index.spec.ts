import { beforeEach, describe, expect, it, vi } from "vitest";
import { ErrorCode } from "@cli2api/shared";
import {
  AdapterRegistry,
  CodexAdapter,
  MockAgentAdapter,
  collectAgentEvents,
  listAgentModels,
  normalizeAdapterError
} from "./index.js";

const codexSdkMock = vi.hoisted(() => ({
  constructorOptions: [] as unknown[],
  startThreadOptions: [] as Array<Record<string, unknown> | undefined>
}));

vi.mock("@openai/codex-sdk", () => ({
  Codex: class {
    public constructor(options?: unknown) {
      codexSdkMock.constructorOptions.push(options);
    }

    public startThread(options?: Record<string, unknown>) {
      codexSdkMock.startThreadOptions.push(options);
      return {
        run: async () => ({ finalResponse: "codex text" })
      };
    }
  }
}));

describe("@cli2api/agents-sdk", () => {
  beforeEach(() => {
    codexSdkMock.constructorOptions.length = 0;
    codexSdkMock.startThreadOptions.length = 0;
  });

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

  it("exposes the bundled Codex model catalog without provider internals", () => {
    const models = listAgentModels();

    expect(models).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "gpt-5.5",
          type: "codex",
          name: "GPT-5.5",
          config: { model: "gpt-5.5" }
        })
      ])
    );
    expect(models.every((model) => model.source === "codex")).toBe(true);
    expect(JSON.stringify(models)).not.toContain("base_instructions");
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

  it("starts Codex in read-only text-serving mode", async () => {
    const adapter = new CodexAdapter();
    const events = await collectAgentEvents(
      adapter.run({
        runId: "run_codex_readonly",
        prompt: "reply only",
        profile: {
          id: "codex-default",
          type: "codex",
          name: "Codex",
          cwd: "/srv/cli2api/runtime-workspaces/instances/inst-1",
          enabled: true,
          sandbox: "workspace-write",
          approvalPolicy: "on-request",
          env: { CODEX_HOME: "/srv/cli2api/codex-homes/account-1" },
          config: { model: "gpt-5" }
        }
      })
    );

    expect(events.at(-1)).toMatchObject({
      type: "run.completed",
      output: "codex text"
    });
    expect(codexSdkMock.constructorOptions).toEqual([
      {
        env: { CODEX_HOME: "/srv/cli2api/codex-homes/account-1" },
        config: { model: "gpt-5" }
      }
    ]);
    expect(codexSdkMock.startThreadOptions).toEqual([
      {
        model: "gpt-5",
        workingDirectory: "/srv/cli2api/runtime-workspaces/instances/inst-1",
        sandboxMode: "read-only",
        approvalPolicy: "never",
        skipGitRepoCheck: true
      }
    ]);
    expect(codexSdkMock.startThreadOptions[0]).not.toHaveProperty("sandbox");
    expect(codexSdkMock.startThreadOptions[0]).not.toHaveProperty("additionalDirectories");
  });
});
