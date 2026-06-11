import { spawn } from "node:child_process";

/** Command used by an agent provider to invoke one CLI process. */
export interface AgentProcessCommand {
  /** Executable path or binary name. */
  executable: string;
  /** Command-line arguments. Secrets must not appear here. */
  args: string[];
  /** Environment supplied to the child process. */
  env?: Record<string, string>;
  /** Optional working directory for the child process. */
  cwd?: string;
  /** Optional stdin payload, usually the user prompt. */
  stdin?: string;
  /** Optional timeout before the process is killed. */
  timeoutMs?: number;
}

/** Parsed JSONL record emitted by a provider process. */
export interface AgentProcessJsonEvent {
  /** Event discriminator. */
  type: "json";
  /** Parsed JSON value. */
  value: unknown;
  /** Original single-line JSON text. */
  line: string;
}

/** Stderr chunk emitted by a provider process. */
export interface AgentProcessStderrEvent {
  /** Event discriminator. */
  type: "stderr";
  /** Raw stderr chunk decoded as UTF-8. */
  chunk: string;
}

/** Non-fatal process parsing or spawn error. */
export interface AgentProcessErrorEvent {
  /** Event discriminator. */
  type: "error";
  /** Stable machine-readable process error code. */
  code: "PROCESS_BAD_JSON" | "PROCESS_SPAWN_FAILED";
  /** Human-readable message. */
  message: string;
  /** Offending JSONL line when available. */
  line?: string;
}

/** Final process exit event. */
export interface AgentProcessExitEvent {
  /** Event discriminator. */
  type: "exit";
  /** Process exit code, or null when the process exited from a signal. */
  exitCode: number | null;
  /** Process signal, or null when the process exited with a code. */
  signal: NodeJS.Signals | null;
  /** Full captured stderr. */
  stderr: string;
  /** Whether this runner killed the process due to timeout. */
  timedOut: boolean;
}

/** Events emitted by the provider process boundary. */
export type AgentProcessEvent =
  | AgentProcessJsonEvent
  | AgentProcessStderrEvent
  | AgentProcessErrorEvent
  | AgentProcessExitEvent;

/** Testable boundary used by providers to execute JSONL-emitting CLIs. */
export interface AgentProcessRunner {
  /** Runs a command and yields parsed JSONL/process events. */
  runJsonLines(command: AgentProcessCommand): AsyncIterable<AgentProcessEvent>;
}

interface EventQueueItem {
  event?: AgentProcessEvent;
  done?: boolean;
}

/** Child-process implementation of the JSONL provider process runner. */
export class ChildProcessAgentProcessRunner implements AgentProcessRunner {
  /** Runs a command and yields parsed stdout JSONL, stderr chunks, and exit state. */
  public async *runJsonLines(command: AgentProcessCommand): AsyncIterable<AgentProcessEvent> {
    const queue: EventQueueItem[] = [];
    const waiters: Array<() => void> = [];
    const push = (item: EventQueueItem): void => {
      queue.push(item);
      waiters.shift()?.();
    };
    const wait = async (): Promise<void> => {
      if (queue.length > 0) return;
      await new Promise<void>((resolve) => waiters.push(resolve));
    };

    let stdoutBuffer = "";
    let stderr = "";
    let timedOut = false;
    let settled = false;
    let timeout: NodeJS.Timeout | undefined;

    const flushLine = (line: string): void => {
      if (!line.trim()) return;
      try {
        push({ event: { type: "json", value: JSON.parse(line) as unknown, line } });
      } catch (error) {
        push({
          event: {
            type: "error",
            code: "PROCESS_BAD_JSON",
            message: error instanceof Error ? error.message : "Invalid JSONL record",
            line
          }
        });
      }
    };

    const child = spawn(command.executable, command.args, {
      cwd: command.cwd,
      env: command.env,
      stdio: ["pipe", "pipe", "pipe"]
    });

    const finish = (exitCode: number | null, signal: NodeJS.Signals | null): void => {
      if (settled) return;
      settled = true;
      if (timeout) clearTimeout(timeout);
      if (stdoutBuffer.trim()) {
        flushLine(stdoutBuffer);
        stdoutBuffer = "";
      }
      push({ event: { type: "exit", exitCode, signal, stderr, timedOut } });
      push({ done: true });
    };

    if (command.timeoutMs !== undefined) {
      timeout = setTimeout(() => {
        timedOut = true;
        child.kill();
      }, command.timeoutMs);
    }

    child.stdout?.on("data", (chunk: Buffer) => {
      stdoutBuffer += chunk.toString("utf8");
      let newlineIndex = stdoutBuffer.indexOf("\n");
      while (newlineIndex >= 0) {
        const line = stdoutBuffer.slice(0, newlineIndex);
        stdoutBuffer = stdoutBuffer.slice(newlineIndex + 1);
        flushLine(line);
        newlineIndex = stdoutBuffer.indexOf("\n");
      }
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      const text = chunk.toString("utf8");
      stderr += text;
      push({ event: { type: "stderr", chunk: text } });
    });
    child.once("error", (error) => {
      push({
        event: {
          type: "error",
          code: "PROCESS_SPAWN_FAILED",
          message: error.message
        }
      });
      finish(1, null);
    });
    child.once("close", (exitCode, signal) => finish(exitCode, signal));

    if (command.stdin !== undefined) {
      child.stdin?.write(command.stdin);
    }
    child.stdin?.end();

    while (true) {
      await wait();
      const item = queue.shift();
      if (!item) continue;
      if (item.done) return;
      if (item.event) yield item.event;
    }
  }
}
