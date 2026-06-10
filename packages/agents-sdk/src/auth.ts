import { spawn } from "node:child_process";

/** Provider-neutral authentication method names. */
export type AgentAuthMethod = "device" | "api-key" | "access-token";

/** Stable lifecycle states for upstream account authentication. */
export type AgentAuthState =
  | "pending"
  | "waiting_for_browser"
  | "authenticated"
  | "failed"
  | "expired"
  | "canceled";

/** Runtime account context used for auth and later adapter execution. */
export interface RuntimeAuthInput {
  /** Upstream account id owned by core. */
  accountId: string;
  /** Isolated auth home, such as a per-account `CODEX_HOME`. */
  authHome: string;
  /** Optional environment variables merged into the auth process environment. */
  env?: Record<string, string>;
}

/** Input used to start an interactive upstream auth session. */
export interface StartAuthInput extends RuntimeAuthInput {
  /** Interactive auth method. The first implementation supports Codex device auth. */
  method: Extract<AgentAuthMethod, "device">;
  /** Optional caller-provided session id for persisted auth jobs. */
  sessionId?: string;
}

/** Input used to authenticate with a secret passed through stdin. */
export interface SecretLoginInput extends RuntimeAuthInput {
  /** Secret-based auth method. */
  method: Extract<AgentAuthMethod, "api-key" | "access-token">;
  /** Secret value passed to the provider process through stdin only. */
  secret: string;
}

/** Public auth session/status returned to core and dashboard. */
export interface AuthSession {
  /** Provider-local session id. */
  id: string;
  /** Upstream provider type, such as `codex`. */
  providerType: string;
  /** Upstream account id that owns the auth state. */
  accountId: string;
  /** Current auth state. */
  state: AgentAuthState;
  /** Isolated auth home used by the provider process. */
  authHome: string;
  /** Browser URL the operator should open, when device auth is waiting. */
  authUrl?: string;
  /** User/device code to enter in the browser, when provided by the provider. */
  userCode?: string;
  /** Expiry timestamp in milliseconds when known. */
  expiresAt?: number;
  /** Non-secret human-readable status message. */
  message?: string;
}

/** Command specification used by auth providers to call provider CLIs. */
export interface AgentAuthCommand {
  /** Executable path or binary name. */
  executable: string;
  /** Command-line arguments. Secrets must not appear here. */
  args: string[];
  /** Environment supplied to the child process. */
  env: Record<string, string>;
  /** Optional stdin payload, used for API keys or access tokens. */
  stdin?: string;
  /** Optional timeout for command completion. */
  timeoutMs?: number;
}

/** Result returned by an auth command runner. */
export interface AgentAuthCommandResult {
  /** Process exit code. */
  exitCode: number;
  /** Captured stdout. */
  stdout: string;
  /** Captured stderr. */
  stderr: string;
}

/** Testable process boundary used by auth providers. */
export interface AgentAuthCommandRunner {
  /** Runs a provider auth command and returns captured output. */
  run(command: AgentAuthCommand): Promise<AgentAuthCommandResult>;
}

/** Provider-neutral auth provider contract implemented by adapter integrations. */
export interface AgentAuthProvider {
  /** Provider type handled by this auth provider. */
  readonly type: string;
  /** Starts an interactive auth session. */
  startAuth(input: StartAuthInput): Promise<AuthSession>;
  /** Logs in with a secret supplied through stdin. */
  loginWithSecret(input: SecretLoginInput): Promise<AuthSession>;
  /** Checks whether an account auth home is currently authenticated. */
  checkRuntime(input: RuntimeAuthInput): Promise<AuthSession>;
  /** Logs out the account auth home. */
  logout(input: RuntimeAuthInput): Promise<AuthSession>;
}

/** Child-process command runner for provider auth CLIs. */
export class ChildProcessAuthCommandRunner implements AgentAuthCommandRunner {
  /** Runs the command in a child process and captures stdout/stderr. */
  public async run(command: AgentAuthCommand): Promise<AgentAuthCommandResult> {
    return new Promise((resolve, reject) => {
      const child = spawn(command.executable, command.args, {
        env: command.env,
        stdio: ["pipe", "pipe", "pipe"]
      });
      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];
      let timeout: NodeJS.Timeout | undefined;

      if (command.timeoutMs) {
        timeout = setTimeout(() => {
          child.kill();
        }, command.timeoutMs);
      }

      child.stdout?.on("data", (chunk: Buffer) => stdout.push(chunk));
      child.stderr?.on("data", (chunk: Buffer) => stderr.push(chunk));
      child.once("error", reject);
      child.once("close", (exitCode) => {
        if (timeout) {
          clearTimeout(timeout);
        }
        resolve({
          exitCode: exitCode ?? 1,
          stdout: Buffer.concat(stdout).toString("utf8"),
          stderr: Buffer.concat(stderr).toString("utf8")
        });
      });

      if (command.stdin) {
        child.stdin?.write(command.stdin);
      }
      child.stdin?.end();
    });
  }
}
