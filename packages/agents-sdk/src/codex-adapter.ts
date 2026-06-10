import {
  ErrorCode,
  createCli2ApiError,
  normalizeUsage,
  type AdapterProfile,
  type AgentEvent
} from "@cli2api/shared";
import { normalizeAdapterError } from "./errors.js";
import type { AgentAdapter, AgentRunInput, CodexSdkOptions } from "./types.js";

type CodexConstructor = new (options?: CodexSdkOptions) => {
  startThread(options?: Record<string, unknown>): {
    run(prompt: string): Promise<unknown>;
    runStreamed?: (prompt: string) => Promise<{ events: AsyncIterable<unknown> }>;
  };
};

/** Adapter backed by the official `@openai/codex-sdk` package. */
export class CodexAdapter implements AgentAdapter {
  /** Adapter type stored on Codex adapter profiles. */
  public readonly type = "codex";

  /** Creates Codex SDK constructor options from an operator-managed profile. */
  public createSdkOptions(profile: AdapterProfile): CodexSdkOptions {
    return {
      env: profile.env,
      config: profile.config
    };
  }

  /** Runs a prompt through the Codex SDK and yields normalized cli2api events. */
  public async *run(input: AgentRunInput): AsyncIterable<AgentEvent> {
    yield { type: "run.started", runId: input.runId, timestamp: Date.now() };

    try {
      const { Codex } = (await import("@openai/codex-sdk")) as { Codex?: CodexConstructor };
      if (!Codex) {
        throw createCli2ApiError(ErrorCode.ADAPTER_UNAVAILABLE, "Codex SDK export not found", 503);
      }

      const codex = new Codex(this.createSdkOptions(input.profile));
      const thread = codex.startThread({
        workingDirectory: input.profile.cwd,
        sandbox: input.profile.sandbox,
        approvalPolicy: input.profile.approvalPolicy
      });

      if (thread.runStreamed) {
        const { events } = await thread.runStreamed(input.prompt);
        let finalOutput = "";
        let finalUsage = normalizeUsage(undefined);
        for await (const event of events) {
          const normalized = this.normalizeCodexEvent(input.runId, event);
          if (normalized.type === "output.delta") {
            finalOutput += normalized.delta;
          }
          if (normalized.type === "usage.updated") {
            finalUsage = normalized.usage;
          }
          yield normalized;
        }
        yield {
          type: "run.completed",
          runId: input.runId,
          output: finalOutput,
          usage: finalUsage,
          timestamp: Date.now()
        };
        return;
      }

      const result = await thread.run(input.prompt);
      const output = this.extractFinalResponse(result);
      yield { type: "output.delta", runId: input.runId, delta: output, timestamp: Date.now() };
      yield {
        type: "run.completed",
        runId: input.runId,
        output,
        usage: normalizeUsage(undefined),
        timestamp: Date.now()
      };
    } catch (error) {
      const normalized = normalizeAdapterError(error);
      yield {
        type: "run.failed",
        runId: input.runId,
        code: normalized.code,
        message: normalized.message,
        timestamp: Date.now()
      };
    }
  }

  private normalizeCodexEvent(runId: string, event: unknown): AgentEvent {
    const record = event as Record<string, unknown>;
    if (record.type === "item.completed") {
      const item = record.item as Record<string, unknown> | undefined;
      const text = typeof item?.text === "string" ? item.text : "";
      if (text) {
        return { type: "output.delta", runId, delta: text, timestamp: Date.now() };
      }
      return { type: "item.completed", runId, item: record.item, timestamp: Date.now() };
    }

    if (record.type === "turn.completed") {
      const usage = record.usage as Record<string, number> | undefined;
      return {
        type: "usage.updated",
        runId,
        usage: normalizeUsage({
          inputTokens: usage?.input_tokens,
          outputTokens: usage?.output_tokens,
          totalTokens: usage
            ? (usage.input_tokens ?? 0) + (usage.output_tokens ?? 0)
            : undefined
        }),
        timestamp: Date.now()
      };
    }

    return { type: "item.completed", runId, item: event, timestamp: Date.now() };
  }

  private extractFinalResponse(result: unknown): string {
    const record = result as Record<string, unknown>;
    if (typeof record.finalResponse === "string") {
      return record.finalResponse;
    }
    if (typeof record.final_response === "string") {
      return record.final_response;
    }
    return typeof result === "string" ? result : JSON.stringify(result);
  }
}
