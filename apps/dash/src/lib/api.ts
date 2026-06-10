import { treaty, type Treaty } from "@elysia/eden";
import type { AgentEvent } from "@cli2api/shared";
import type { App } from "@cli2api/core";
import type {
  AdapterProfileView,
  AdminUser,
  ApiKeyView,
  RunView,
  UpstreamAccountView,
  UpstreamAuthSessionView,
  UpstreamInstanceView,
  UpstreamRouteBindingView,
  UsageBucketView
} from "../types";

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

/** Admin user creation payload used by the dashboard. */
export interface CreateUserInput {
  /** Login email address. */
  email: string;
  /** Initial password. */
  password: string;
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

/** Upstream account creation payload used by the dashboard. */
export interface CreateUpstreamAccountInput {
  /** Optional stable upstream account id. */
  id?: string;
  /** Provider type, such as `codex`. */
  providerType: string;
  /** Operator-facing account name. */
  name: string;
}

/** Upstream auth start payload used by the dashboard. */
export interface StartUpstreamAuthInput {
  /** Auth method. */
  method: "device";
}

/** Upstream instance creation payload used by the dashboard. */
export interface CreateUpstreamInstanceInput {
  /** Optional stable upstream instance id. */
  id?: string;
  /** Bound upstream account id. */
  accountId: string;
  /** Adapter implementation type. */
  type: string;
  /** Operator-facing instance name. */
  name: string;
  /** Fixed working directory. */
  cwd: string;
  /** Whether the scheduler can select this instance. */
  enabled: boolean;
  /** Maximum concurrent runs. */
  maxConcurrentRuns: number;
  /** Optional adapter config. */
  config?: Record<string, unknown>;
}

/** Upstream instance update payload used by the dashboard. */
export interface UpdateUpstreamInstanceInput {
  /** Operator-facing instance name. */
  name?: string;
  /** Fixed working directory. */
  cwd?: string;
  /** Whether the scheduler can select this instance. */
  enabled?: boolean;
  /** Maximum concurrent runs. */
  maxConcurrentRuns?: number;
  /** Optional adapter config. */
  config?: Record<string, unknown>;
}

/** Upstream route binding creation payload used by the dashboard. */
export interface CreateUpstreamRouteInput {
  /** Public adapter profile id selected by downstream clients. */
  profileId: string;
  /** Upstream instance id used when this profile is selected. */
  instanceId: string;
}

/** Dashboard API facade backed by Elysia Eden Treaty. */
export interface DashboardApi {
  /** Logs in an admin user through the session-cookie API. */
  login(input: LoginInput): Promise<LoginResult>;
  /** Lists dashboard users. */
  users(): Promise<AdminUser[]>;
  /** Creates a dashboard admin user. */
  createUser(input: CreateUserInput): Promise<AdminUser>;
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
  /** Lists upstream accounts. */
  upstreamAccounts(): Promise<UpstreamAccountView[]>;
  /** Creates an upstream account. */
  createUpstreamAccount(input: CreateUpstreamAccountInput): Promise<UpstreamAccountView>;
  /** Starts an upstream account auth flow. */
  startUpstreamAuth(accountId: string, input: StartUpstreamAuthInput): Promise<UpstreamAuthSessionView>;
  /** Polls upstream account auth status. */
  pollUpstreamAuth(accountId: string): Promise<UpstreamAuthSessionView>;
  /** Logs out an upstream account. */
  logoutUpstreamAccount(accountId: string): Promise<UpstreamAuthSessionView>;
  /** Cancels an upstream auth session. */
  cancelUpstreamAuth(sessionId: string): Promise<UpstreamAuthSessionView>;
  /** Lists upstream runnable instances. */
  upstreamInstances(): Promise<UpstreamInstanceView[]>;
  /** Creates an upstream runnable instance. */
  createUpstreamInstance(input: CreateUpstreamInstanceInput): Promise<UpstreamInstanceView>;
  /** Updates an upstream runnable instance. */
  updateUpstreamInstance(instanceId: string, input: UpdateUpstreamInstanceInput): Promise<UpstreamInstanceView>;
  /** Disables an upstream runnable instance. */
  disableUpstreamInstance(instanceId: string): Promise<UpstreamInstanceView>;
  /** Lists explicit upstream route bindings. */
  upstreamRoutes(): Promise<UpstreamRouteBindingView[]>;
  /** Creates an explicit upstream route binding. */
  createUpstreamRoute(input: CreateUpstreamRouteInput): Promise<UpstreamRouteBindingView>;
  /** Deletes an explicit upstream route binding. */
  deleteUpstreamRoute(routeId: string): Promise<UpstreamRouteBindingView>;
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

interface AdminUsersClient {
  get(): Promise<TreatyResult<AdminUser[]>>;
  post(input: CreateUserInput): Promise<TreatyResult<AdminUser>>;
}

interface AdminRunsClient {
  get(): Promise<TreatyResult<RunView[]>>;
  (params: { id: string }): {
    events: {
      get(): Promise<TreatyResult<AgentEvent[]>>;
    };
  };
}

interface AdminUpstreamAccountsClient {
  get(): Promise<TreatyResult<UpstreamAccountView[]>>;
  post(input: CreateUpstreamAccountInput): Promise<TreatyResult<UpstreamAccountView>>;
  (params: { id: string }): {
    auth: {
      start: {
        post(input: StartUpstreamAuthInput): Promise<TreatyResult<UpstreamAuthSessionView>>;
      };
      status: {
        get(): Promise<TreatyResult<UpstreamAuthSessionView>>;
      };
    };
    logout: {
      post(): Promise<TreatyResult<UpstreamAuthSessionView>>;
    };
  };
}

interface AdminUpstreamAuthSessionsClient {
  (params: { id: string }): {
    cancel: {
      post(): Promise<TreatyResult<UpstreamAuthSessionView>>;
    };
  };
}

interface AdminUpstreamInstancesClient {
  get(): Promise<TreatyResult<UpstreamInstanceView[]>>;
  post(input: CreateUpstreamInstanceInput): Promise<TreatyResult<UpstreamInstanceView>>;
  (params: { id: string }): {
    patch(input: UpdateUpstreamInstanceInput): Promise<TreatyResult<UpstreamInstanceView>>;
    disable: {
      post(): Promise<TreatyResult<UpstreamInstanceView>>;
    };
  };
}

interface AdminUpstreamRoutesClient {
  get(): Promise<TreatyResult<UpstreamRouteBindingView[]>>;
  post(input: CreateUpstreamRouteInput): Promise<TreatyResult<UpstreamRouteBindingView>>;
  (params: { id: string }): {
    delete(): Promise<TreatyResult<UpstreamRouteBindingView>>;
  };
}

const defaultTreatyFactory: TreatyFactory = (baseUrl, config) => treaty<App>(baseUrl, config);

/** Creates a dashboard API facade backed by Elysia Eden Treaty. */
export function createDashboardApi(baseUrl = defaultBaseUrl(), factory: TreatyFactory = defaultTreatyFactory): DashboardApi {
  const client = factory(baseUrl, { fetch: { credentials: "include" } });
  const adminUsers = client.api.admin.users as unknown as AdminUsersClient;
  const adminApiKeys = client.api.admin["api-keys"] as unknown as AdminApiKeysClient;
  const adminRuns = client.api.admin.runs as unknown as AdminRunsClient;
  return {
    login: (input) => unwrap<LoginResult>(client.api.admin.login.post(input) as Promise<TreatyResult<LoginResult>>),
    users: () => unwrap<AdminUser[]>(adminUsers.get()),
    createUser: (input) => unwrap<AdminUser>(adminUsers.post(input)),
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
    runEvents: (runId) => unwrap<AgentEvent[]>(adminRuns({ id: runId }).events.get()),
    upstreamAccounts: () => unwrap<UpstreamAccountView[]>(upstreamAccountsClient(client).get()),
    createUpstreamAccount: (input) => unwrap<UpstreamAccountView>(upstreamAccountsClient(client).post(input)),
    startUpstreamAuth: (accountId, input) =>
      unwrap<UpstreamAuthSessionView>(upstreamAccountsClient(client)({ id: accountId }).auth.start.post(input)),
    pollUpstreamAuth: (accountId) =>
      unwrap<UpstreamAuthSessionView>(upstreamAccountsClient(client)({ id: accountId }).auth.status.get()),
    logoutUpstreamAccount: (accountId) =>
      unwrap<UpstreamAuthSessionView>(upstreamAccountsClient(client)({ id: accountId }).logout.post()),
    cancelUpstreamAuth: (sessionId) =>
      unwrap<UpstreamAuthSessionView>(upstreamAuthSessionsClient(client)({ id: sessionId }).cancel.post()),
    upstreamInstances: () => unwrap<UpstreamInstanceView[]>(upstreamInstancesClient(client).get()),
    createUpstreamInstance: (input) => unwrap<UpstreamInstanceView>(upstreamInstancesClient(client).post(input)),
    updateUpstreamInstance: (instanceId, input) =>
      unwrap<UpstreamInstanceView>(upstreamInstancesClient(client)({ id: instanceId }).patch(input)),
    disableUpstreamInstance: (instanceId) =>
      unwrap<UpstreamInstanceView>(upstreamInstancesClient(client)({ id: instanceId }).disable.post()),
    upstreamRoutes: () => unwrap<UpstreamRouteBindingView[]>(upstreamRoutesClient(client).get()),
    createUpstreamRoute: (input) => unwrap<UpstreamRouteBindingView>(upstreamRoutesClient(client).post(input)),
    deleteUpstreamRoute: (routeId) =>
      unwrap<UpstreamRouteBindingView>(upstreamRoutesClient(client)({ id: routeId }).delete())
  };
}

function upstreamAccountsClient(client: DashboardTreaty): AdminUpstreamAccountsClient {
  return client.api.admin.upstream.accounts as unknown as AdminUpstreamAccountsClient;
}

function upstreamAuthSessionsClient(client: DashboardTreaty): AdminUpstreamAuthSessionsClient {
  return client.api.admin.upstream["auth-sessions"] as unknown as AdminUpstreamAuthSessionsClient;
}

function upstreamInstancesClient(client: DashboardTreaty): AdminUpstreamInstancesClient {
  return client.api.admin.upstream.instances as unknown as AdminUpstreamInstancesClient;
}

function upstreamRoutesClient(client: DashboardTreaty): AdminUpstreamRoutesClient {
  return client.api.admin.upstream.routes as unknown as AdminUpstreamRoutesClient;
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
