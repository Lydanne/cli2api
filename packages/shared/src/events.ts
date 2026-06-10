/** Token usage captured from an adapter run. */
export interface AgentUsage {
  /** Prompt or input tokens consumed by the run. */
  inputTokens: number;
  /** Completion or output tokens produced by the run. */
  outputTokens: number;
  /** Combined input and output token count. */
  totalTokens: number;
}

/** Partial token usage accepted from provider SDKs before normalization. */
export type PartialAgentUsage = Partial<AgentUsage>;

/** Event emitted when a run starts. */
export interface RunStartedEvent {
  /** Event discriminator. */
  type: "run.started";
  /** Internal run identifier. */
  runId: string;
  /** Unix timestamp in milliseconds. */
  timestamp?: number;
}

/** Event emitted when text output is incrementally available. */
export interface OutputDeltaEvent {
  /** Event discriminator. */
  type: "output.delta";
  /** Internal run identifier. */
  runId: string;
  /** Text delta. */
  delta: string;
  /** Unix timestamp in milliseconds. */
  timestamp?: number;
}

/** Event emitted when an adapter reports a completed internal item. */
export interface ItemCompletedEvent {
  /** Event discriminator. */
  type: "item.completed";
  /** Internal run identifier. */
  runId: string;
  /** Provider or normalized item payload. */
  item: unknown;
  /** Unix timestamp in milliseconds. */
  timestamp?: number;
}

/** Event emitted when usage is known or updated. */
export interface UsageUpdatedEvent {
  /** Event discriminator. */
  type: "usage.updated";
  /** Internal run identifier. */
  runId: string;
  /** Normalized token usage. */
  usage: AgentUsage;
  /** Unix timestamp in milliseconds. */
  timestamp?: number;
}

/** Event emitted when a run completes successfully. */
export interface RunCompletedEvent {
  /** Event discriminator. */
  type: "run.completed";
  /** Internal run identifier. */
  runId: string;
  /** Final text output. */
  output?: string;
  /** Final usage if available. */
  usage?: AgentUsage;
  /** Unix timestamp in milliseconds. */
  timestamp?: number;
}

/** Event emitted when a run fails. */
export interface RunFailedEvent {
  /** Event discriminator. */
  type: "run.failed";
  /** Internal run identifier. */
  runId: string;
  /** Stable machine-readable error code. */
  code: string;
  /** Human-readable error message. */
  message: string;
  /** Unix timestamp in milliseconds. */
  timestamp?: number;
}

/** Normalized event stream emitted by all agent adapters. */
export type AgentEvent =
  | RunStartedEvent
  | OutputDeltaEvent
  | ItemCompletedEvent
  | UsageUpdatedEvent
  | RunCompletedEvent
  | RunFailedEvent;

/** Returns true when an agent event ends the run stream. */
export function isTerminalAgentEvent(event: AgentEvent): boolean {
  return event.type === "run.completed" || event.type === "run.failed";
}

/** Normalizes partial or provider-specific usage to cli2api usage fields. */
export function normalizeUsage(usage: PartialAgentUsage | null | undefined): AgentUsage {
  const inputTokens = usage?.inputTokens ?? 0;
  const outputTokens = usage?.outputTokens ?? 0;
  const totalTokens = usage?.totalTokens ?? inputTokens + outputTokens;
  return { inputTokens, outputTokens, totalTokens };
}
