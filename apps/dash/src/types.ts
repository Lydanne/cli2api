import type {
  UpstreamAccountResponse,
  UpstreamAuthSessionResponse,
  UpstreamInstanceResponse,
  UpstreamRouteBindingResponse
} from "@cli2api/shared";

/** Admin user displayed in the dashboard. */
export interface AdminUser {
  /** User id. */
  id: string;
  /** Login email. */
  email: string;
  /** User role. */
  role: string;
  /** Disabled timestamp, or null/undefined when enabled. */
  disabledAt?: number | null;
}

/** Adapter profile displayed in the dashboard. */
export interface AdapterProfileView {
  /** Profile id and OpenAI-compatible model id. */
  id: string;
  /** Adapter type. */
  type: string;
  /** Profile name. */
  name: string;
  /** Internal service-owned runtime workspace. */
  cwd: string;
  /** Enabled state. */
  enabled: boolean;
}

/** API key displayed in the dashboard. */
export interface ApiKeyView {
  /** API key id. */
  id: string;
  /** Operator-facing name. */
  name: string;
  /** Non-secret key prefix. */
  keyPrefix: string;
  /** Enabled flag. */
  enabled: number;
  /** Maximum concurrent runs allowed for this key. */
  maxConcurrentRuns: number;
  /** Requests per minute limit. */
  rpmLimit: number;
  /** Daily run count limit. */
  dailyRunLimit: number;
  /** Monthly token limit. */
  monthlyTokenLimit: number;
  /** One-time token returned during creation. */
  token?: string;
}

/** Run record displayed in the dashboard. */
export interface RunView {
  /** Run id. */
  id: string;
  /** Selected profile id. */
  profileId: string;
  /** Run status. */
  status: string;
  /** Prompt text. */
  prompt: string;
  /** Final output. */
  output: string | null;
  /** Error code if failed. */
  errorCode: string | null;
  /** Selected upstream instance id, or null when legacy profile routing is used. */
  upstreamInstanceId: string | null;
}

/** Usage bucket displayed in the dashboard. */
export interface UsageBucketView {
  /** Usage bucket id. */
  id: string;
  /** API key id that owns this usage. */
  apiKeyId: string;
  /** Bucket granularity. */
  bucketType: string;
  /** UTC bucket key. */
  bucketKey: string;
  /** Completed run count in this bucket. */
  runCount: number;
  /** Input tokens in this bucket. */
  inputTokens: number;
  /** Output tokens in this bucket. */
  outputTokens: number;
  /** Total tokens in this bucket. */
  totalTokens: number;
}

/** Upstream account displayed in the dashboard. */
export type UpstreamAccountView = UpstreamAccountResponse;

/** Upstream auth session displayed in the dashboard. */
export type UpstreamAuthSessionView = UpstreamAuthSessionResponse;

/** Upstream runnable instance displayed in the dashboard. */
export type UpstreamInstanceView = UpstreamInstanceResponse;

/** Upstream route binding displayed in the dashboard. */
export type UpstreamRouteBindingView = UpstreamRouteBindingResponse;
