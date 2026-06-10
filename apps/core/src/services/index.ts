import {
  AdapterRegistry,
  CodexAdapter,
  CodexAuthProvider,
  MockAgentAdapter,
  type AgentAuthProvider
} from "@cli2api/agents-sdk";
import type { CoreDatabase } from "../db/client.js";
import { ApiKeyService } from "./api-keys.js";
import { ProfileService } from "./profiles.js";
import { QuotaService } from "./quotas.js";
import { RuntimeWorkspaceService } from "./runtime-workspaces.js";
import { RunService } from "./runs.js";
import { SessionService } from "./sessions.js";
import { UpstreamService } from "./upstream.js";
import { UserService } from "./users.js";

/** Options accepted when creating the runtime service graph. */
export interface CreateServicesOptions {
  /** Auth providers available for upstream account login flows. */
  authProviders?: AgentAuthProvider[];
  /** Base directory for per-account auth homes. */
  authHomeBase?: string;
  /** Base directory for service-owned model-serving runtime workspaces. */
  runtimeWorkspaceBase?: string;
}

/** Runtime service graph used by HTTP routes and CLI commands. */
export interface Services {
  /** Admin user service. */
  users: UserService;
  /** Admin session service. */
  sessions: SessionService;
  /** Downstream API key service. */
  apiKeys: ApiKeyService;
  /** Adapter profile service. */
  profiles: ProfileService;
  /** Quota service. */
  quotas: QuotaService;
  /** Run execution service. */
  runs: RunService;
  /** Adapter registry. */
  adapters: AdapterRegistry;
  /** Upstream account pool service. */
  upstream: UpstreamService;
}

/** Creates the default service graph. */
export function createServices(database: CoreDatabase, options: CreateServicesOptions = {}): Services {
  const adapters = new AdapterRegistry();
  adapters.register(new MockAgentAdapter());
  adapters.register(new CodexAdapter());
  const authProviders = options.authProviders ?? [new CodexAuthProvider()];

  const users = new UserService(database);
  const sessions = new SessionService(database);
  const apiKeys = new ApiKeyService(database);
  const runtimeWorkspaces = new RuntimeWorkspaceService(options.runtimeWorkspaceBase);
  const profiles = new ProfileService(database, runtimeWorkspaces);
  const quotas = new QuotaService(database);
  const upstream = new UpstreamService(
    database,
    authProviders,
    options.authHomeBase ?? "/data/codex-homes",
    runtimeWorkspaces
  );
  const runs = new RunService(database, profiles, quotas, adapters, upstream);

  return { users, sessions, apiKeys, profiles, quotas, runs, adapters, upstream };
}
