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
  /** Selected upstream instance id, or null when legacy profile routing is used. */
  upstreamInstanceId: string | null;
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

/** Authentication lifecycle state for an upstream account. */
export type UpstreamAuthState =
  | "pending"
  | "waiting_for_browser"
  | "authenticated"
  | "failed"
  | "expired"
  | "canceled";

/** Health state used when selecting an upstream instance. */
export type UpstreamHealthState = "unknown" | "healthy" | "degraded" | "disabled";

/** Upstream account returned by admin APIs. */
export interface UpstreamAccountResponse {
  /** Stable upstream account id. */
  id: string;
  /** Upstream provider type, such as `codex`. */
  providerType: string;
  /** Operator-facing display name. */
  name: string;
  /** Current authentication state. */
  authState: UpstreamAuthState;
  /** Isolated provider auth home, such as a per-account `CODEX_HOME`. */
  authHome: string;
  /** Disabled timestamp in milliseconds, or null when enabled. */
  disabledAt: number | null;
  /** Last non-secret authentication error. */
  lastAuthError: string | null;
  /** Creation timestamp in milliseconds. */
  createdAt: number;
  /** Last update timestamp in milliseconds. */
  updatedAt: number;
}

/** Upstream authentication session returned by admin APIs. */
export interface UpstreamAuthSessionResponse {
  /** Stable auth session id. */
  id: string;
  /** Account id that owns the session. */
  accountId: string;
  /** Upstream provider type. */
  providerType: string;
  /** Current session state. */
  state: UpstreamAuthState;
  /** Optional browser URL for device auth. */
  authUrl: string | null;
  /** Optional user/device code for browser auth. */
  userCode: string | null;
  /** Optional expiry timestamp in milliseconds. */
  expiresAt: number | null;
  /** Non-secret status message. */
  message: string | null;
  /** Creation timestamp in milliseconds. */
  createdAt: number;
  /** Last update timestamp in milliseconds. */
  updatedAt: number;
}

/** Upstream runnable instance returned by admin APIs. */
export interface UpstreamInstanceResponse {
  /** Stable instance id. */
  id: string;
  /** Account id bound to this instance. */
  accountId: string;
  /** Adapter implementation type. */
  type: string;
  /** Operator-facing display name. */
  name: string;
  /** Fixed working directory for this instance. */
  cwd: string;
  /** Whether the scheduler may select this instance. */
  enabled: boolean;
  /** Current health state. */
  healthState: UpstreamHealthState;
  /** Number of currently running jobs assigned to this instance. */
  currentRuns: number;
  /** Maximum concurrent jobs allowed for this instance. */
  maxConcurrentRuns: number;
  /** Optional sandbox policy. */
  sandbox: AdapterProfile["sandbox"] | null;
  /** Optional approval policy. */
  approvalPolicy: AdapterProfile["approvalPolicy"] | null;
  /** Adapter-specific non-secret config. */
  config: Record<string, unknown>;
  /** Last non-secret error. */
  lastError: string | null;
  /** Creation timestamp in milliseconds. */
  createdAt: number;
  /** Last update timestamp in milliseconds. */
  updatedAt: number;
}

/** Explicit route binding from one public profile to one upstream instance. */
export interface UpstreamRouteBindingResponse {
  /** Stable route binding id. */
  id: string;
  /** Public adapter profile id selected by downstream clients. */
  profileId: string;
  /** Upstream instance id selected when this profile is used. */
  instanceId: string;
  /** Creation timestamp in milliseconds. */
  createdAt: number;
  /** Last update timestamp in milliseconds. */
  updatedAt: number;
}
