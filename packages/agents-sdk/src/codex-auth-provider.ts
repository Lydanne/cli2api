import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ChildProcessAuthCommandRunner,
  type AgentAuthCommand,
  type AgentAuthCommandResult,
  type AgentAuthCommandRunner,
  type AgentAuthProvider,
  type AuthSession,
  type RuntimeAuthInput,
  type SecretLoginInput,
  type StartAuthInput
} from "./auth.js";

/** Constructor options for the Codex auth provider. */
export interface CodexAuthProviderOptions {
  /** Command runner used to execute Codex auth commands. */
  runner?: AgentAuthCommandRunner;
  /** Codex executable path or binary name. */
  codexPath?: string;
  /** Default timeout for auth commands. */
  timeoutMs?: number;
}

/** Auth provider that manages isolated Codex CLI login homes. */
export class CodexAuthProvider implements AgentAuthProvider {
  /** Provider type handled by this auth provider. */
  public readonly type = "codex";

  private readonly runner: AgentAuthCommandRunner;

  private readonly codexPath: string;

  private readonly timeoutMs: number;

  /** Creates a Codex auth provider. */
  public constructor(options: CodexAuthProviderOptions = {}) {
    this.runner = options.runner ?? new ChildProcessAuthCommandRunner();
    this.codexPath = options.codexPath ?? resolveBundledCodexPath();
    this.timeoutMs = options.timeoutMs ?? 120_000;
  }

  /** Starts Codex device auth and returns browser/device instructions when available. */
  public async startAuth(input: StartAuthInput): Promise<AuthSession> {
    const result = await this.runner.run(this.command(input, ["login", "--device-auth"]));
    return this.toSession(input, result, input.sessionId ?? randomUUID());
  }

  /** Logs Codex in with an API key or access token passed through stdin. */
  public async loginWithSecret(input: SecretLoginInput): Promise<AuthSession> {
    const flag = input.method === "api-key" ? "--with-api-key" : "--with-access-token";
    const result = await this.runner.run(this.command(input, ["login", flag], input.secret));
    return this.toSession(input, result, randomUUID());
  }

  /** Checks Codex login status for one isolated account home. */
  public async checkRuntime(input: RuntimeAuthInput): Promise<AuthSession> {
    const result = await this.runner.run(this.command(input, ["login", "status"]));
    return this.toSession(input, result, randomUUID());
  }

  /** Logs out one isolated Codex account home. */
  public async logout(input: RuntimeAuthInput): Promise<AuthSession> {
    const result = await this.runner.run(this.command(input, ["logout"]));
    if (result.exitCode !== 0) {
      return this.toSession(input, result, randomUUID());
    }
    return {
      id: randomUUID(),
      providerType: this.type,
      accountId: input.accountId,
      state: "pending",
      authHome: input.authHome,
      message: "Logged out"
    };
  }

  private command(input: RuntimeAuthInput, args: string[], stdin?: string): AgentAuthCommand {
    return {
      executable: this.codexPath,
      args,
      stdin,
      timeoutMs: this.timeoutMs,
      env: this.env(input)
    };
  }

  private env(input: RuntimeAuthInput): Record<string, string> {
    const env: Record<string, string> = {};
    for (const [key, value] of Object.entries(process.env)) {
      if (value !== undefined) {
        env[key] = value;
      }
    }
    return { ...env, ...input.env, CODEX_HOME: input.authHome };
  }

  private toSession(input: RuntimeAuthInput, result: AgentAuthCommandResult, sessionId: string): AuthSession {
    const combinedOutput = `${result.stdout}\n${result.stderr}`.trim();
    const authUrl = extractAuthUrl(combinedOutput);
    const userCode = extractUserCode(combinedOutput);
    const authenticated = isAuthenticatedOutput(combinedOutput);
    const unauthenticated = isUnauthenticatedOutput(combinedOutput);

    if (result.exitCode !== 0) {
      return {
        id: sessionId,
        providerType: this.type,
        accountId: input.accountId,
        state: "failed",
        authHome: input.authHome,
        message: combinedOutput || `Codex auth command exited with ${result.exitCode}`
      };
    }

    return {
      id: sessionId,
      providerType: this.type,
      accountId: input.accountId,
      state: authenticated ? "authenticated" : authUrl || userCode ? "waiting_for_browser" : unauthenticated ? "pending" : "pending",
      authHome: input.authHome,
      authUrl,
      userCode,
      message: combinedOutput || undefined
    };
  }
}

function extractAuthUrl(output: string): string | undefined {
  return output.match(/https?:\/\/[^\s)]+/u)?.[0]?.replace(/[.,;:]+$/u, "");
}

function resolveBundledCodexPath(): string {
  try {
    const sdkEntry = fileURLToPath(import.meta.resolve("@openai/codex-sdk"));
    const sdkRoot = dirname(dirname(sdkEntry));
    const executable = join(sdkRoot, "node_modules", ".bin", process.platform === "win32" ? "codex.cmd" : "codex");
    if (existsSync(executable)) {
      return executable;
    }
  } catch {
    // Fall through to PATH lookup for custom installs.
  }
  return "codex";
}

function extractUserCode(output: string): string | undefined {
  return output.match(/\b(?:code|enter code|user code)\b[^A-Z0-9]*([A-Z0-9]{4,}(?:-[A-Z0-9]{3,})*)/iu)?.[1];
}

function isAuthenticatedOutput(output: string): boolean {
  return /\b(logged in|authenticated)\b/iu.test(output);
}

function isUnauthenticatedOutput(output: string): boolean {
  return /\b(not logged in|not authenticated|logged out)\b/iu.test(output);
}
