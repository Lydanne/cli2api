import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";
import {
  AgentsSDK,
  type AgentAuthProvider,
  type AgentProvider
} from "@cli2api/agents-sdk";
import { CodexAgent } from "@cli2api/agent-codex";
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
  /** Root directory for local cli2api state, config, auth homes, and scratch data. */
  homeDir?: string;
  /** Auth providers available for upstream account login flows. */
  authProviders?: AgentAuthProvider[];
  /** Agent providers available for run execution and model discovery. */
  agentProviders?: AgentProvider[];
  /** Base directory for per-account auth homes. */
  authHomeBase?: string;
  /** Base directory for service-owned model-serving runtime workspaces. */
  runtimeWorkspaceBase?: string;
  /** Base directory for service-owned temporary files. */
  tempDir?: string;
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
  /** Agents SDK facade for provider execution, discovery, and auth. */
  agents: AgentsSDK;
  /** Upstream account pool service. */
  upstream: UpstreamService;
}

/** Creates the default service graph. */
export function createServices(database: CoreDatabase, options: CreateServicesOptions = {}): Services {
  const homeDir = resolveServicePath(options.homeDir ?? join(homedir(), ".cli2api"), process.cwd());
  const authHomeBase = resolveServicePath(options.authHomeBase ?? "codex-homes", homeDir);
  const runtimeWorkspaceBase = resolveServicePath(options.runtimeWorkspaceBase ?? "runtime-workspaces", homeDir);
  const tempDir = resolveServicePath(options.tempDir ?? "tmp", homeDir);
  const codex = CodexAgent.bundle();
  const agents = AgentsSDK.create({
    providers: options.agentProviders ?? [AgentsSDK.mockProvider(), ...codex.providers],
    authProviders: options.authProviders ?? codex.authProviders
  });

  const users = new UserService(database);
  const sessions = new SessionService(database);
  const apiKeys = new ApiKeyService(database);
  mkdirSync(homeDir, { recursive: true });
  mkdirSync(tempDir, { recursive: true });
  const runtimeWorkspaces = new RuntimeWorkspaceService(runtimeWorkspaceBase);
  const profiles = new ProfileService(database, runtimeWorkspaces);
  const quotas = new QuotaService(database);
  const upstream = new UpstreamService(database, agents, authHomeBase, runtimeWorkspaces);
  const runs = new RunService(database, profiles, quotas, agents, upstream);

  return { users, sessions, apiKeys, profiles, quotas, runs, agents, upstream };
}

function resolveServicePath(path: string, baseDir: string): string {
  const expanded = path.replace(/^~(?=$|\/)/u, homedir());
  return resolve(isAbsolute(expanded) ? expanded : join(baseDir, expanded));
}
