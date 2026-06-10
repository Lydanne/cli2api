import { describe, expect, it } from "vitest";
import {
  CodexAuthProvider,
  type AgentAuthCommand,
  type AgentAuthCommandResult,
  type AgentAuthCommandRunner
} from "./index.js";

class RecordingRunner implements AgentAuthCommandRunner {
  public commands: AgentAuthCommand[] = [];

  public constructor(private readonly result: AgentAuthCommandResult) {}

  public async run(command: AgentAuthCommand): Promise<AgentAuthCommandResult> {
    this.commands.push(command);
    return this.result;
  }
}

describe("CodexAuthProvider", () => {
  it("starts device auth in an isolated CODEX_HOME and extracts browser instructions", async () => {
    const runner = new RecordingRunner({
      exitCode: 0,
      stdout: "Open https://example.com/device and enter code WXYZ-1234",
      stderr: ""
    });
    const provider = new CodexAuthProvider({ runner, codexPath: "codex-test" });

    const session = await provider.startAuth({
      accountId: "account-1",
      authHome: "/data/codex-homes/account-1",
      method: "device"
    });

    expect(runner.commands).toHaveLength(1);
    expect(runner.commands[0]).toMatchObject({
      executable: "codex-test",
      args: ["login", "--device-auth"],
      env: expect.objectContaining({ CODEX_HOME: "/data/codex-homes/account-1" })
    });
    expect(session).toMatchObject({
      providerType: "codex",
      accountId: "account-1",
      state: "waiting_for_browser",
      authUrl: "https://example.com/device",
      userCode: "WXYZ-1234",
      authHome: "/data/codex-homes/account-1"
    });
  });

  it("passes API keys through stdin and never adds them to command arguments", async () => {
    const runner = new RecordingRunner({
      exitCode: 0,
      stdout: "Logged in",
      stderr: ""
    });
    const provider = new CodexAuthProvider({ runner });

    const status = await provider.loginWithSecret({
      accountId: "account-2",
      authHome: "/data/codex-homes/account-2",
      method: "api-key",
      secret: "sk-test-secret"
    });

    expect(runner.commands[0]).toMatchObject({
      args: ["login", "--with-api-key"],
      stdin: "sk-test-secret",
      env: expect.objectContaining({ CODEX_HOME: "/data/codex-homes/account-2" })
    });
    expect(runner.commands[0]?.args.join(" ")).not.toContain("sk-test-secret");
    expect(status.state).toBe("authenticated");
  });

  it("checks Codex auth status for one account home", async () => {
    const runner = new RecordingRunner({
      exitCode: 0,
      stdout: "Logged in with ChatGPT",
      stderr: ""
    });
    const provider = new CodexAuthProvider({ runner });

    const status = await provider.checkRuntime({
      accountId: "account-3",
      authHome: "/data/codex-homes/account-3"
    });

    expect(runner.commands[0]).toMatchObject({
      args: ["login", "status"],
      env: expect.objectContaining({ CODEX_HOME: "/data/codex-homes/account-3" })
    });
    expect(status.state).toBe("authenticated");
  });
});
