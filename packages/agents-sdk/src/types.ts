import type { AdapterProfile, AgentEvent } from "@cli2api/shared";

/** Input passed to an agent adapter for one run. */
export interface AgentRunInput {
  /** Internal run identifier assigned by core. */
  runId: string;
  /** User prompt after route-specific normalization. */
  prompt: string;
  /** Operator-managed adapter profile. */
  profile: AdapterProfile;
}

/** Adapter implementation contract used by core. */
export interface AgentAdapter {
  /** Adapter type string stored on adapter profiles. */
  readonly type: string;
  /** Runs a prompt and yields normalized events. */
  run(input: AgentRunInput): AsyncIterable<AgentEvent>;
}

/** Loose Codex SDK options assembled from an adapter profile. */
export interface CodexSdkOptions {
  /** Environment variables passed to the Codex SDK wrapper. */
  env?: Record<string, string>;
  /** Codex CLI configuration overrides passed through the SDK. */
  config?: Record<string, unknown>;
}
