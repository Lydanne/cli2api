import { describe, expect, it } from "vitest";
import { ErrorCode } from "@cli2api/shared";
import * as publicSdk from "./index.js";
import {
  AgentsSDK,
  normalizeProviderError
} from "./index.js";

describe("@cli2api/agents-sdk", () => {
  it("collects events from the mock provider", async () => {
    const provider = AgentsSDK.mockProvider();
    const events = await AgentsSDK.collect(
      provider.run({
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

  it("registers and resolves providers by type", () => {
    const sdk = AgentsSDK.create();
    const provider = AgentsSDK.mockProvider();
    sdk.use(provider);

    expect(sdk.getProvider("mock")).toBe(provider);
    expect(() => sdk.getProvider("missing")).toThrow(/No provider registered/);
  });

  it("normalizes provider failures", () => {
    const error = normalizeProviderError(new Error("bad upstream"));

    expect(error.code).toBe(ErrorCode.RUN_FAILED);
    expect(error.message).toBe("bad upstream");
  });

  it("does not expose legacy compatibility symbols from the package entrypoint", () => {
    expect(publicSdk).not.toHaveProperty("AdapterRegistry");
    expect(publicSdk).not.toHaveProperty("MockAgentAdapter");
    expect(publicSdk).not.toHaveProperty("collectAgentEvents");
    expect(publicSdk).not.toHaveProperty("AgentAdapter");
    expect(publicSdk).not.toHaveProperty("normalizeAdapterError");
  });

  it("does not expose legacy provider registry aliases on AgentsSDK instances", () => {
    const sdk = AgentsSDK.create();

    expect(sdk).not.toHaveProperty("register");
    expect(sdk).not.toHaveProperty("get");
    expect(sdk).not.toHaveProperty("listTypes");
  });

  it("lists models through registered providers", async () => {
    const sdk = AgentsSDK.create();
    sdk.use({
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

    await expect(sdk.listModels()).resolves.toEqual([
      {
        id: "custom-model",
        name: "Custom Model",
        type: "custom",
        source: "custom",
        config: { model: "custom-model" }
      }
    ]);
  });

  it("exposes a primary AgentsSDK class for provider runs, models, and auth", async () => {
    const authProvider = {
      type: "custom",
      startAuth: async () => ({
        id: "auth-1",
        providerType: "custom",
        accountId: "acct-1",
        state: "waiting_for_browser" as const,
        authHome: "/auth/custom",
        authUrl: "https://example.com/device"
      }),
      loginWithSecret: async () => ({
        id: "auth-2",
        providerType: "custom",
        accountId: "acct-1",
        state: "authenticated" as const,
        authHome: "/auth/custom"
      }),
      checkRuntime: async () => ({
        id: "auth-3",
        providerType: "custom",
        accountId: "acct-1",
        state: "authenticated" as const,
        authHome: "/auth/custom"
      }),
      logout: async () => ({
        id: "auth-4",
        providerType: "custom",
        accountId: "acct-1",
        state: "pending" as const,
        authHome: "/auth/custom"
      })
    };
    const sdk = AgentsSDK.create({
      providers: [
        {
          type: "custom",
          run: async function* (input) {
            yield { type: "run.started", runId: input.runId };
            yield {
              type: "conversation.updated",
              runId: input.runId,
              scopeId: input.conversation?.scopeId ?? "scope",
              providerSessionId: "provider-session"
            };
            yield { type: "output.delta", runId: input.runId, delta: `answer:${input.prompt}` };
            yield {
              type: "usage.updated",
              runId: input.runId,
              usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3 }
            };
            yield {
              type: "run.completed",
              runId: input.runId,
              output: `answer:${input.prompt}`
            };
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
        }
      ],
      authProviders: [authProvider]
    });

    expect(sdk.listProviderTypes()).toEqual(["custom"]);
    await expect(sdk.listModels()).resolves.toEqual([
      {
        id: "custom-model",
        name: "Custom Model",
        type: "custom",
        source: "custom",
        config: { model: "custom-model" }
      }
    ]);
    const result = await sdk.runText({
      runId: "run-sdk",
      profile: { id: "custom-model", type: "custom", name: "Custom", cwd: process.cwd(), enabled: true },
      input: "hello",
      conversation: { scopeId: "scope-1" }
    });

    expect(result).toMatchObject({
      runId: "run-sdk",
      output: "answer:hello",
      usage: { inputTokens: 1, outputTokens: 2, totalTokens: 3 },
      conversation: { scopeId: "scope-1", providerSessionId: "provider-session" }
    });
    await expect(
      sdk.startAuth("custom", { accountId: "acct-1", authHome: "/auth/custom", method: "device" })
    ).resolves.toMatchObject({ id: "auth-1", state: "waiting_for_browser" });
  });

  it("supports static AgentsSDK helpers without constructing a registry", async () => {
    const provider = AgentsSDK.defineProvider(AgentsSDK.mockProvider());
    const result = await AgentsSDK.runTextWith(provider, {
      runId: "run-static",
      profile: { id: "mock", type: "mock", name: "Mock", cwd: process.cwd(), enabled: true },
      input: "static helper"
    });

    expect(result.output).toBe("Mock response: static helper");
    expect(AgentsSDK.toResult(result.events)).toMatchObject({
      runId: "run-static",
      output: "Mock response: static helper"
    });
  });
});
