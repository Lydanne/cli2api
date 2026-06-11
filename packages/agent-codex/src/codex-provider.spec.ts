import { describe, expect, it } from "vitest";
import {
  collectAgentEvents,
  type AgentProcessCommand,
  type AgentProcessEvent,
  type AgentProcessRunner
} from "@cli2api/agents-sdk";
import { CodexAgent, CodexAgentProvider, CodexAuthProvider } from "./index.js";

class FakeProcessRunner implements AgentProcessRunner {
  public readonly commands: AgentProcessCommand[] = [];

  public constructor(private readonly queuedEvents: AgentProcessEvent[][]) {}

  public async *runJsonLines(command: AgentProcessCommand): AsyncIterable<AgentProcessEvent> {
    this.commands.push(command);
    for (const event of this.queuedEvents.shift() ?? []) {
      yield event;
    }
  }
}

describe("CodexAgentProvider", () => {
  it("exposes static CodexAgent factories for provider and auth registration", () => {
    const provider = CodexAgent.provider({ codexPath: "codex-test" });
    const authProvider = CodexAgent.authProvider({ codexPath: "codex-test" });
    const bundle = CodexAgent.bundle({ provider: { codexPath: "codex-test" }, auth: { codexPath: "codex-test" } });

    expect(provider).toBeInstanceOf(CodexAgentProvider);
    expect(authProvider).toBeInstanceOf(CodexAuthProvider);
    expect(bundle.providers).toHaveLength(1);
    expect(bundle.authProviders).toHaveLength(1);
    expect(bundle.providers[0]?.type).toBe("codex");
    expect(bundle.authProviders[0]?.type).toBe("codex");
  });

  it("builds stateless read-only Codex exec commands and normalizes output events", async () => {
    const runner = new FakeProcessRunner([
      [
        { type: "json", line: "{\"type\":\"item.completed\"}", value: { type: "item.completed", item: { text: "hi" } } },
        {
          type: "json",
          line: "{\"type\":\"turn.completed\"}",
          value: { type: "turn.completed", usage: { input_tokens: 2, output_tokens: 3 } }
        },
        { type: "exit", exitCode: 0, signal: null, stderr: "", timedOut: false }
      ]
    ]);
    const provider = new CodexAgentProvider({ runner, codexPath: "codex-test" });

    const events = await collectAgentEvents(
      provider.run({
        runId: "run-stateless",
        prompt: "hello",
        mode: "model",
        profile: {
          id: "gpt-5.5",
          type: "codex",
          name: "GPT",
          cwd: "/runtime/inst-1",
          enabled: true,
          env: { CODEX_HOME: "/homes/acct-1" },
          config: { model: "gpt-5.5" }
        }
      })
    );

    expect(runner.commands[0]).toMatchObject({
      executable: "codex-test",
      stdin: "hello",
      env: expect.objectContaining({ CODEX_HOME: "/homes/acct-1" })
    });
    expect(runner.commands[0]?.args).toEqual([
      "exec",
      "--json",
      "--cd",
      "/runtime/inst-1",
      "--sandbox",
      "read-only",
      "--ask-for-approval",
      "never",
      "--skip-git-repo-check",
      "--ignore-user-config",
      "--ignore-rules",
      "--ephemeral",
      "--model",
      "gpt-5.5",
      "-"
    ]);
    expect(runner.commands[0]?.args).not.toContain("--add-dir");
    expect(events).toEqual([
      expect.objectContaining({ type: "run.started", runId: "run-stateless" }),
      expect.objectContaining({ type: "output.delta", delta: "hi" }),
      expect.objectContaining({
        type: "usage.updated",
        usage: { inputTokens: 2, outputTokens: 3, totalTokens: 5 }
      }),
      expect.objectContaining({
        type: "run.completed",
        output: "hi",
        usage: { inputTokens: 2, outputTokens: 3, totalTokens: 5 }
      })
    ]);
  });

  it("resumes provider sessions when core supplies a provider session id", async () => {
    const runner = new FakeProcessRunner([
      [
        {
          type: "json",
          line: "{\"type\":\"thread.started\"}",
          value: { type: "thread.started", thread_id: "codex-thread-2" }
        },
        { type: "json", line: "{\"type\":\"item.completed\"}", value: { type: "item.completed", item: { text: "next" } } },
        { type: "exit", exitCode: 0, signal: null, stderr: "", timedOut: false }
      ]
    ]);
    const provider = new CodexAgentProvider({ runner, codexPath: "codex-test" });

    const events = await collectAgentEvents(
      provider.run({
        runId: "run-resume",
        prompt: "continue",
        mode: "model",
        conversation: { scopeId: "api/profile/user/session", providerSessionId: "codex-thread-1" },
        profile: { id: "gpt-5.5", type: "codex", name: "GPT", cwd: "/runtime/inst-1", enabled: true }
      })
    );

    expect(runner.commands[0]?.args).toEqual([
      "exec",
      "resume",
      "--json",
      "--cd",
      "/runtime/inst-1",
      "--sandbox",
      "read-only",
      "--ask-for-approval",
      "never",
      "--skip-git-repo-check",
      "--ignore-user-config",
      "--ignore-rules",
      "codex-thread-1",
      "-"
    ]);
    expect(runner.commands[0]?.args).not.toContain("--ephemeral");
    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: "conversation.updated",
          scopeId: "api/profile/user/session",
          providerSessionId: "codex-thread-2"
        }),
        expect.objectContaining({ type: "run.completed", output: "next" })
      ])
    );
  });

  it("discovers Codex models without leaking raw provider internals", async () => {
    const runner = new FakeProcessRunner([
      [
        {
          type: "json",
          line: "{\"models\":[]}",
          value: {
            models: [
              {
                slug: "gpt-5.5",
                display_name: "GPT-5.5",
                visibility: "list",
                supported_in_api: true,
                base_instructions: "do not expose"
              },
              {
                slug: "codex-auto-review",
                display_name: "Auto Review",
                visibility: "hide",
                supported_in_api: true
              },
              {
                slug: "gpt-5.3-codex-spark",
                display_name: "Spark",
                visibility: "list",
                supported_in_api: false
              }
            ]
          }
        },
        { type: "exit", exitCode: 0, signal: null, stderr: "", timedOut: false }
      ]
    ]);
    const provider = new CodexAgentProvider({ runner, codexPath: "codex-test" });

    const models = await provider.listModels();

    expect(runner.commands[0]).toMatchObject({
      executable: "codex-test",
      args: ["debug", "models"]
    });
    expect(models).toEqual([
      {
        id: "gpt-5.5",
        name: "GPT-5.5",
        type: "codex",
        source: "codex",
        config: { model: "gpt-5.5" }
      }
    ]);
    expect(JSON.stringify(models)).not.toContain("base_instructions");
  });

  it("emits run.failed for non-zero Codex exits", async () => {
    const runner = new FakeProcessRunner([
      [
        { type: "stderr", chunk: "auth failed\n" },
        { type: "exit", exitCode: 1, signal: null, stderr: "auth failed\n", timedOut: false }
      ]
    ]);
    const provider = new CodexAgentProvider({ runner, codexPath: "codex-test" });

    const events = await collectAgentEvents(
      provider.run({
        runId: "run-failed",
        prompt: "hello",
        mode: "model",
        profile: { id: "gpt-5.5", type: "codex", name: "GPT", cwd: "/runtime/inst-1", enabled: true }
      })
    );

    expect(events).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: "status.updated", message: "auth failed" }),
        expect.objectContaining({ type: "run.failed", code: "RUN_FAILED", message: "auth failed" })
      ])
    );
  });
});
