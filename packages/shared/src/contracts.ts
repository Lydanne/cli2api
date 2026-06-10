/** Supported adapter implementation names. */
export type AdapterType = "codex" | "mock" | string;

/** Operator-managed adapter profile. */
export interface AdapterProfile {
  /** Stable profile id used as the OpenAI-compatible model id. */
  id: string;
  /** Adapter implementation type. */
  type: AdapterType;
  /** Human-readable profile name. */
  name: string;
  /** Fixed working directory approved by the operator. */
  cwd: string;
  /** Whether downstream callers can select this profile. */
  enabled: boolean;
  /** Optional sandbox policy passed to the adapter. */
  sandbox?: "read-only" | "workspace-write" | "danger-full-access";
  /** Optional approval policy passed to the adapter. */
  approvalPolicy?: "untrusted" | "on-request" | "never";
  /** Environment variables available to the adapter process. */
  env?: Record<string, string>;
  /** Adapter-specific configuration. */
  config?: Record<string, unknown>;
}

/** Input accepted by native run APIs. */
export interface CreateRunRequest {
  /** Prompt sent to the selected adapter. */
  prompt: string;
  /** Optional adapter profile id. Defaults to the API key's default or first enabled profile. */
  profileId?: string;
  /** Optional metadata recorded with the run. */
  metadata?: Record<string, unknown>;
}

/** Stored run status. */
export type RunStatus = "queued" | "running" | "completed" | "failed";

/** Public run response returned by native APIs. */
export interface RunResponse {
  /** Internal run id. */
  id: string;
  /** Selected profile id. */
  profileId: string;
  /** Current status. */
  status: RunStatus;
  /** Prompt supplied by the downstream caller. */
  prompt: string;
  /** Final text output when complete. */
  output: string | null;
  /** Stable error code when failed. */
  errorCode: string | null;
  /** Human-readable error message when failed. */
  errorMessage: string | null;
  /** Token usage when available. */
  usage: import("./events.js").AgentUsage;
  /** Operator or caller metadata recorded with the run. */
  metadata: Record<string, unknown>;
}

/** Minimal OpenAI-compatible model record. */
export interface OpenAiModel {
  /** Object discriminator used by OpenAI-compatible clients. */
  object: "model";
  /** Model id, mapped to an adapter profile id. */
  id: string;
  /** Owner label. */
  owned_by: string;
}

/** Usage bucket returned by admin quota inspection APIs. */
export interface UsageBucketResponse {
  /** Usage bucket id. */
  id: string;
  /** API key id that owns this usage. */
  apiKeyId: string;
  /** Bucket granularity. */
  bucketType: string;
  /** UTC bucket key, such as YYYY-MM-DD or YYYY-MM. */
  bucketKey: string;
  /** Number of completed runs counted in the bucket. */
  runCount: number;
  /** Input tokens counted in the bucket. */
  inputTokens: number;
  /** Output tokens counted in the bucket. */
  outputTokens: number;
  /** Total tokens counted in the bucket. */
  totalTokens: number;
  /** Last update timestamp in milliseconds. */
  updatedAt: number;
}
