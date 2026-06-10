import { AdapterRegistry, CodexAdapter, MockAgentAdapter } from "@cli2api/agents-sdk";
import type { CoreDatabase } from "../db/client.js";
import { ApiKeyService } from "./api-keys.js";
import { ProfileService } from "./profiles.js";
import { QuotaService } from "./quotas.js";
import { RunService } from "./runs.js";
import { SessionService } from "./sessions.js";
import { UserService } from "./users.js";

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
}

/** Creates the default service graph. */
export function createServices(database: CoreDatabase): Services {
  const adapters = new AdapterRegistry();
  adapters.register(new MockAgentAdapter());
  adapters.register(new CodexAdapter());

  const users = new UserService(database);
  const sessions = new SessionService(database);
  const apiKeys = new ApiKeyService(database);
  const profiles = new ProfileService(database);
  const quotas = new QuotaService(database);
  const runs = new RunService(database, profiles, quotas, adapters);

  return { users, sessions, apiKeys, profiles, quotas, runs, adapters };
}
