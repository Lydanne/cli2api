import { normalizeUsage, type AgentEvent } from "@cli2api/shared";
import type { AgentAdapter, AgentRunInput } from "./types.js";

/** Deterministic adapter used by tests, E2E flows, and local demos. */
export class MockAgentAdapter implements AgentAdapter {
  /** Adapter type stored on mock adapter profiles. */
  public readonly type = "mock";

  /** Runs a prompt through a deterministic mock event stream. */
  public async *run(input: AgentRunInput): AsyncIterable<AgentEvent> {
    const output = `Mock response: ${input.prompt}`;
    const usage = normalizeUsage({
      inputTokens: input.prompt.split(/\s+/).filter(Boolean).length,
      outputTokens: output.split(/\s+/).filter(Boolean).length
    });

    yield { type: "run.started", runId: input.runId, timestamp: Date.now() };
    yield { type: "output.delta", runId: input.runId, delta: output, timestamp: Date.now() };
    yield { type: "usage.updated", runId: input.runId, usage, timestamp: Date.now() };
    yield { type: "run.completed", runId: input.runId, output, usage, timestamp: Date.now() };
  }
}
