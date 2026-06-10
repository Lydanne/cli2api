import { treaty, type Treaty } from "@elysia/eden";
import type { AgentEvent } from "@cli2api/shared";
import type { App } from "@cli2api/core";
import type { AdapterProfileView, AdminUser, ApiKeyView, RunView, UsageBucketView } from "../types";

/** Error thrown when a backend API request fails. */
export class ApiError extends Error {
  /** Stable backend error code. */
  public readonly code: string;

  /** HTTP response status. */
  public readonly status: number;

  /** Creates a dashboard API error. */
  public constructor(code: string, message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
  }
}

/** Eden Treaty client generated from the core Elysia app type. */
export type DashboardTreaty = Treaty.Create<App>;

/** Factory used to create a dashboard Treaty client. */
export type TreatyFactory = (baseUrl: string, config: Treaty.Config) => DashboardTreaty;

/** Login payload accepted by the dashboard API. */
export interface LoginInput {
  /** Admin email address. */
  email: string;
  /** Admin password. */
  password: string;
}

/** Login result returned by the dashboard API. */
export interface LoginResult {
  /** Authenticated admin user. */
  user: Pick<AdminUser, "id" | "email" | "role">;
}

/** Adapter profile creation payload used by the dashboard. */
export interface CreateProfileInput {
  /** Stable adapter profile id. */
  id: string;
  /** Adapter implementation type. */
  type: "codex" | "mock";
  /** Human readable adapter profile name. */
  name: string;
  /** Fixed adapter working directory. */
  cwd: string;
  /** Whether the profile can receive runs. */
  enabled: boolean;
  /** Optional adapter configuration. */
  config?: Record<string, unknown>;
}

/** API key creation payload used by the dashboard. */
export interface CreateApiKeyInput {
  /** API key display name. */
  name: string;
  /** Optional owner user id. */
  userId?: string;
  /** Maximum concurrent runs allowed for this key. */
  maxConcurrentRuns?: number;
  /** Requests per minute limit. */
  rpmLimit?: number;
  /** Daily run count limit. */
  dailyRunLimit?: number;
  /** Monthly token limit. */
  monthlyTokenLimit?: number;
}

/** API key creation result. */
export interface CreatedApiKey extends ApiKeyView {
  /** Plaintext token returned once at creation time. */
  token?: string;
}

/** API key revocation result. */
export interface RevokeApiKeyResult {
  /** Whether the key was revoked. */
  ok: boolean;
}

/** Run creation payload used by the dashboard. */
export interface CreateRunInput {
  /** Prompt sent to the selected adapter profile. */
  prompt: string;
  /** Adapter profile id. */
  profileId: string;
}

/** Dashboard API facade backed by Elysia Eden Treaty. */
export interface DashboardApi {
  /** Logs in an admin user through the session-cookie API. */
  login(input: LoginInput): Promise<LoginResult>;
  /** Lists dashboard users. */
  users(): Promise<AdminUser[]>;
  /** Lists adapter profiles. */
  profiles(): Promise<AdapterProfileView[]>;
  /** Creates an adapter profile. */
  createProfile(input: CreateProfileInput): Promise<AdapterProfileView>;
  /** Lists API keys. */
  apiKeys(): Promise<ApiKeyView[]>;
  /** Creates an API key and returns its one-time plaintext token. */
  createApiKey(input: CreateApiKeyInput): Promise<CreatedApiKey>;
  /** Revokes an API key. */
  revokeApiKey(id: string): Promise<RevokeApiKeyResult>;
  /** Lists usage buckets for API keys. */
  usage(): Promise<UsageBucketView[]>;
  /** Lists runs visible to admins. */
  runs(): Promise<RunView[]>;
  /** Creates a run using a downstream API key token. */
  createRun(token: string, input: CreateRunInput): Promise<RunView>;
  /** Reads events for a run through the admin API. */
  runEvents(runId: string): Promise<AgentEvent[]>;
}

interface TreatyResult<T> {
  data: T | null;
  error: { status: unknown; value: unknown } | null;
  status: number;
}

interface AdminApiKeysClient {
  get(): Promise<TreatyResult<ApiKeyView[]>>;
  post(input: CreateApiKeyInput): Promise<TreatyResult<CreatedApiKey>>;
  (params: { id: string }): {
    revoke: {
      post(): Promise<TreatyResult<RevokeApiKeyResult>>;
    };
  };
}

interface AdminRunsClient {
  get(): Promise<TreatyResult<RunView[]>>;
  (params: { id: string }): {
    events: {
      get(): Promise<TreatyResult<AgentEvent[]>>;
    };
  };
}

const defaultTreatyFactory: TreatyFactory = (baseUrl, config) => treaty<App>(baseUrl, config);

/** Creates a dashboard API facade backed by Elysia Eden Treaty. */
export function createDashboardApi(baseUrl = defaultBaseUrl(), factory: TreatyFactory = defaultTreatyFactory): DashboardApi {
  const client = factory(baseUrl, { fetch: { credentials: "include" } });
  const adminApiKeys = client.api.admin["api-keys"] as unknown as AdminApiKeysClient;
  const adminRuns = client.api.admin.runs as unknown as AdminRunsClient;
  return {
    login: (input) => unwrap<LoginResult>(client.api.admin.login.post(input) as Promise<TreatyResult<LoginResult>>),
    users: () => unwrap<AdminUser[]>(client.api.admin.users.get() as Promise<TreatyResult<AdminUser[]>>),
    profiles: () =>
      unwrap<AdapterProfileView[]>(client.api.admin.profiles.get() as Promise<TreatyResult<AdapterProfileView[]>>),
    createProfile: (input) =>
      unwrap<AdapterProfileView>(
        client.api.admin.profiles.post(input) as Promise<TreatyResult<AdapterProfileView>>
      ),
    apiKeys: () => unwrap<ApiKeyView[]>(adminApiKeys.get()),
    createApiKey: (input) =>
      unwrap<CreatedApiKey>(adminApiKeys.post(input)),
    revokeApiKey: (id) => unwrap<RevokeApiKeyResult>(adminApiKeys({ id }).revoke.post()),
    usage: () => unwrap<UsageBucketView[]>(client.api.admin.usage.get() as Promise<TreatyResult<UsageBucketView[]>>),
    runs: () => unwrap<RunView[]>(adminRuns.get()),
    createRun: (token, input) =>
      unwrap<RunView>(
        client.api.runs.post(input, {
          headers: authorizationHeaders(token)
        }) as Promise<TreatyResult<RunView>>
      ),
    runEvents: (runId) => unwrap<AgentEvent[]>(adminRuns({ id: runId }).events.get())
  };
}

async function unwrap<T>(responsePromise: Promise<TreatyResult<T>>): Promise<T> {
  const result = await responsePromise;
  if (result.error) {
    throw toApiError(result.error, result.status);
  }
  if (result.data === null) {
    throw new ApiError("REQUEST_FAILED", "Request failed", result.status);
  }
  return result.data;
}

function toApiError(error: { status: unknown; value: unknown }, fallbackStatus: number): ApiError {
  const status = typeof error.status === "number" ? error.status : fallbackStatus;
  const payload = asRecord(error.value);
  const nested = asRecord(payload?.error);
  return new ApiError(
    typeof nested?.code === "string" ? nested.code : "REQUEST_FAILED",
    typeof nested?.message === "string" ? nested.message : "Request failed",
    status
  );
}

function authorizationHeaders(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

function defaultBaseUrl(): string {
  return typeof window === "undefined" ? "http://localhost" : window.location.origin;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}
