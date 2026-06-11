import {
  ChildProcessAgentProcessRunner,
  type AgentModelDefinition,
  type AgentProcessCommand,
  type AgentProcessRunner,
  type AgentProvider,
  type AgentRunInput
} from "@cli2api/agents-sdk";
import { ErrorCode, normalizeUsage, type AgentEvent, type AgentUsage } from "@cli2api/shared";
import { resolveBundledCodexPath } from "./codex-path.js";

/** Constructor options for the Codex JSONL process provider. */
export interface CodexAgentProviderOptions {
  /** Process runner used to execute Codex JSONL commands. */
  runner?: AgentProcessRunner;
  /** Codex executable path or binary name. */
  codexPath?: string;
  /** Default timeout for Codex run/model commands. */
  timeoutMs?: number;
}

/** Codex provider backed by `codex exec --json` and `codex debug models`. */
export class CodexAgentProvider implements AgentProvider {
  /** Provider type stored on Codex profiles and upstream instances. */
  public readonly type = "codex";

  private readonly runner: AgentProcessRunner;

  private readonly codexPath: string;

  private readonly timeoutMs: number;

  /** Creates a Codex process provider. */
  public constructor(options: CodexAgentProviderOptions = {}) {
    this.runner = options.runner ?? new ChildProcessAgentProcessRunner();
    this.codexPath = options.codexPath ?? resolveBundledCodexPath();
    this.timeoutMs = options.timeoutMs ?? 120_000;
  }

  /** Lists public Codex models from `codex debug models`. */
  public async listModels(): Promise<AgentModelDefinition[]> {
    let payload: unknown;
    let stderr = "";
    for await (const event of this.runner.runJsonLines({
      executable: this.codexPath,
      args: ["debug", "models"],
      env: copyProcessEnv(),
      timeoutMs: this.timeoutMs
    })) {
      if (event.type === "json") payload = event.value;
      if (event.type === "stderr") stderr += event.chunk;
      if (event.type === "exit" && event.exitCode !== 0) {
        throw new Error(stderr.trim() || `Codex model discovery exited with ${event.exitCode ?? event.signal}`);
      }
    }
    return parseModelPayload(payload, this.type);
  }

  /** Runs one prompt through Codex and yields normalized cli2api events. */
  public async *run(input: AgentRunInput): AsyncIterable<AgentEvent> {
    yield { type: "run.started", runId: input.runId, timestamp: Date.now() };

    let output = "";
    let usage: AgentUsage = normalizeUsage(undefined);
    let stderr = "";
    let failed = false;

    for await (const event of this.runner.runJsonLines(this.buildRunCommand(input))) {
      if (event.type === "stderr") {
        stderr += event.chunk;
        const message = event.chunk.trim();
        if (message) {
          yield { type: "status.updated", runId: input.runId, status: "stderr", message, timestamp: Date.now() };
        }
        continue;
      }

      if (event.type === "error") {
        failed = true;
        yield {
          type: "run.failed",
          runId: input.runId,
          code: ErrorCode.RUN_FAILED,
          message: event.message,
          timestamp: Date.now()
        };
        continue;
      }

      if (event.type === "json") {
        for (const normalized of normalizeCodexJsonEvent(input, event.value)) {
          if (normalized.type === "output.delta") output += normalized.delta;
          if (normalized.type === "usage.updated") usage = normalized.usage;
          yield normalized;
        }
        continue;
      }

      if (event.type === "exit" && !failed) {
        if (event.timedOut || event.exitCode !== 0) {
          yield {
            type: "run.failed",
            runId: input.runId,
            code: event.timedOut ? ErrorCode.TIMEOUT : ErrorCode.RUN_FAILED,
            message: stderr.trim() || `Codex exited with ${event.exitCode ?? event.signal}`,
            timestamp: Date.now()
          };
          failed = true;
          continue;
        }
        yield { type: "run.completed", runId: input.runId, output, usage, timestamp: Date.now() };
      }
    }
  }

  /** Builds the Codex CLI command for a run without executing it. */
  public buildRunCommand(input: AgentRunInput): AgentProcessCommand {
    const resumeSessionId = input.conversation?.providerSessionId;
    const args = resumeSessionId ? ["exec", "resume"] : ["exec"];
    args.push(
      "--json",
      "--cd",
      input.profile.cwd,
      "--sandbox",
      "read-only",
      "--ask-for-approval",
      "never",
      "--skip-git-repo-check",
      "--ignore-user-config",
      "--ignore-rules"
    );
    if (!input.conversation) {
      args.push("--ephemeral");
    }
    const model = input.profile.config?.model;
    if (typeof model === "string" && model.trim()) {
      args.push("--model", model);
    }
    if (resumeSessionId) {
      args.push(resumeSessionId);
    }
    args.push("-");

    return {
      executable: this.codexPath,
      args,
      stdin: input.prompt,
      env: { ...copyProcessEnv(), ...input.profile.env },
      timeoutMs: this.timeoutMs
    };
  }
}

function normalizeCodexJsonEvent(input: AgentRunInput, event: unknown): AgentEvent[] {
  const record = asRecord(event);
  const timestamp = Date.now();
  const conversationId = extractConversationId(record);
  const events: AgentEvent[] = [];
  if (conversationId && input.conversation) {
    events.push({
      type: "conversation.updated",
      runId: input.runId,
      scopeId: input.conversation.scopeId,
      providerSessionId: conversationId,
      metadata: { provider: "codex" },
      timestamp
    });
  }

  if (record.type === "item.completed") {
    const item = asRecord(record.item);
    const text = typeof item.text === "string" ? item.text : "";
    if (text) {
      events.push({ type: "output.delta", runId: input.runId, delta: text, timestamp });
      return events;
    }
    events.push({ type: "item.completed", runId: input.runId, item: record.item, timestamp });
    return events;
  }

  if (record.type === "turn.completed") {
    events.push({
      type: "usage.updated",
      runId: input.runId,
      usage: normalizeProviderUsage(record.usage),
      timestamp
    });
    return events;
  }

  if (record.type === "output.delta" || record.type === "response.output_text.delta") {
    const delta = typeof record.delta === "string" ? record.delta : "";
    if (delta) {
      events.push({ type: "output.delta", runId: input.runId, delta, timestamp });
    }
    return events;
  }

  if (record.type === "status.updated") {
    events.push({
      type: "status.updated",
      runId: input.runId,
      status: typeof record.status === "string" ? record.status : "provider",
      message: typeof record.message === "string" ? record.message : undefined,
      timestamp
    });
    return events;
  }

  return events;
}

function parseModelPayload(payload: unknown, type: string): AgentModelDefinition[] {
  const record = asRecord(payload);
  const models = Array.isArray(record.models) ? record.models : [];
  return models.flatMap((entry) => {
    const model = asRecord(entry);
    const id = typeof model.slug === "string" ? model.slug : undefined;
    if (!id) return [];
    if (!isDiscoverableCodexModel(model)) return [];
    const name = typeof model.display_name === "string" ? model.display_name : id;
    return [{ id, name, type, source: type, config: { model: id } }];
  });
}

function isDiscoverableCodexModel(model: Record<string, unknown>): boolean {
  const visibility = typeof model.visibility === "string" ? model.visibility : "list";
  const supportedInApi = model.supported_in_api ?? model.supportedInApi;
  return visibility === "list" && supportedInApi !== false;
}

function extractConversationId(record: Record<string, unknown>): string | undefined {
  for (const key of ["thread_id", "threadId", "conversation_id", "conversationId", "session_id", "sessionId", "id"]) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }
  return undefined;
}

function normalizeProviderUsage(usage: unknown): AgentUsage {
  const record = asRecord(usage);
  const inputTokens = numberValue(record.inputTokens) ?? numberValue(record.input_tokens);
  const outputTokens = numberValue(record.outputTokens) ?? numberValue(record.output_tokens);
  const totalTokens = numberValue(record.totalTokens) ?? numberValue(record.total_tokens);
  return normalizeUsage({ inputTokens, outputTokens, totalTokens });
}

function numberValue(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function copyProcessEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined) env[key] = value;
  }
  return env;
}
