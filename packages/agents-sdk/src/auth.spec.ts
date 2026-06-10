import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  CodexAuthProvider,
  type AgentAuthCommand,
  type AgentAuthCommandResult,
  type AgentAuthCommandRunner
} from "./index.js";

const authRoots: string[] = [];

class RecordingRunner implements AgentAuthCommandRunner {
  public commands: AgentAuthCommand[] = [];

  public constructor(private readonly result: AgentAuthCommandResult) {}

  public async run(command: AgentAuthCommand): Promise<AgentAuthCommandResult> {
    this.commands.push(command);
    return this.result;
  }
}

class StreamingRunner implements AgentAuthCommandRunner {
  public commands: AgentAuthCommand[] = [];

  public runCalls = 0;

  public constructor(private readonly result: AgentAuthCommandResult) {}

  public async run(command: AgentAuthCommand): Promise<AgentAuthCommandResult> {
    this.runCalls += 1;
    this.commands.push(command);
    throw new Error("startAuth should return after browser instructions without waiting for process exit");
  }

  public async runUntilOutput(
    command: AgentAuthCommand,
    isReady: (output: string) => boolean
  ): Promise<AgentAuthCommandResult> {
    this.commands.push(command);
    const output = `${this.result.stdout}\n${this.result.stderr}`;
    expect(isReady(output)).toBe(true);
    return this.result;
  }
}

afterEach(async () => {
  await Promise.all(authRoots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

describe("CodexAuthProvider", () => {
  it("starts device auth in an isolated CODEX_HOME and extracts browser instructions", async () => {
    const home = await authHome("account-1");
    const runner = new RecordingRunner({
      exitCode: 0,
      stdout: "Open https://example.com/device and enter code WXYZ-1234",
      stderr: ""
    });
    const provider = new CodexAuthProvider({ runner, codexPath: "codex-test" });

    const session = await provider.startAuth({
      accountId: "account-1",
      authHome: home,
      method: "device"
    });

    expect(runner.commands).toHaveLength(1);
    expect(runner.commands[0]).toMatchObject({
      executable: "codex-test",
      args: ["login", "--device-auth"],
      env: expect.objectContaining({ CODEX_HOME: home })
    });
    expect(session).toMatchObject({
      providerType: "codex",
      accountId: "account-1",
      state: "waiting_for_browser",
      authUrl: "https://example.com/device",
      userCode: "WXYZ-1234",
      authHome: home
    });
  });

  it("returns Codex device auth browser instructions before the login process exits", async () => {
    const home = await authHome("account-device");
    const runner = new StreamingRunner({
      exitCode: 0,
      stdout:
        "Welcome to Codex\n" +
        "Follow these steps to sign in with ChatGPT using device code authorization:\n" +
        "1. Open this link in your browser and sign in to your account\n" +
        "   \u001b[94mhttps://auth.openai.com/codex/device\u001b[0m\n\n" +
        "2. Enter this one-time code \u001b[90m(expires in 15 minutes)\u001b[0m\n" +
        "   \u001b[94mEVIE-XOVA9\u001b[0m\n",
      stderr: ""
    });
    const provider = new CodexAuthProvider({ runner, codexPath: "codex-test" });

    const session = await provider.startAuth({
      accountId: "account-device",
      authHome: home,
      method: "device"
    });

    expect(runner.runCalls).toBe(0);
    expect(session).toMatchObject({
      state: "waiting_for_browser",
      authUrl: "https://auth.openai.com/codex/device",
      userCode: "EVIE-XOVA9"
    });
  });

  it("passes API keys through stdin and never adds them to command arguments", async () => {
    const home = await authHome("account-2");
    const runner = new RecordingRunner({
      exitCode: 0,
      stdout: "Logged in",
      stderr: ""
    });
    const provider = new CodexAuthProvider({ runner });

    const status = await provider.loginWithSecret({
      accountId: "account-2",
      authHome: home,
      method: "api-key",
      secret: "sk-test-secret"
    });

    expect(runner.commands[0]).toMatchObject({
      args: ["login", "--with-api-key"],
      stdin: "sk-test-secret",
      env: expect.objectContaining({ CODEX_HOME: home })
    });
    expect(runner.commands[0]?.args.join(" ")).not.toContain("sk-test-secret");
    expect(status.state).toBe("authenticated");
  });

  it("uses the bundled Codex CLI shim by default", async () => {
    const home = await authHome("account-bundled");
    const runner = new RecordingRunner({
      exitCode: 0,
      stdout: "Logged in with ChatGPT",
      stderr: ""
    });
    const provider = new CodexAuthProvider({ runner });

    await provider.checkRuntime({
      accountId: "account-bundled",
      authHome: home
    });

    const executable = runner.commands[0]?.executable ?? "";
    expect(executable).not.toBe("codex");
    expect(executable).toContain("@openai/codex-sdk");
    expect(executable).toMatch(/node_modules[/\\]\.bin[/\\]codex(?:\.cmd)?$/u);
  });

  it("checks Codex auth status for one account home", async () => {
    const home = await authHome("account-3");
    const runner = new RecordingRunner({
      exitCode: 0,
      stdout: "Logged in with ChatGPT",
      stderr: ""
    });
    const provider = new CodexAuthProvider({ runner });

    const status = await provider.checkRuntime({
      accountId: "account-3",
      authHome: home
    });

    expect(runner.commands[0]).toMatchObject({
      args: ["login", "status"],
      env: expect.objectContaining({ CODEX_HOME: home })
    });
    expect(status.state).toBe("authenticated");
  });

  it("keeps an unauthenticated Codex home pending when status exits non-zero", async () => {
    const home = await authHome("account-pending");
    const runner = new RecordingRunner({
      exitCode: 1,
      stdout: "Not logged in",
      stderr: ""
    });
    const provider = new CodexAuthProvider({ runner });

    const status = await provider.checkRuntime({
      accountId: "account-pending",
      authHome: home
    });

    expect(status).toMatchObject({
      state: "pending",
      message: "Not logged in"
    });
  });
});

async function authHome(accountId: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "cli2api-codex-home-"));
  authRoots.push(root);
  return join(root, accountId);
}
