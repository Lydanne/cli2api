import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Elysia } from "elysia";
import type {
  AgentAuthProvider,
  AuthSession,
  RuntimeAuthInput,
  SecretLoginInput,
  StartAuthInput
} from "@cli2api/agents-sdk";
import { createApp } from "../app.js";
import { openCoreDatabase, type CoreDatabase } from "../db/client.js";
import { migrateDatabase } from "../db/migrate.js";
import { upstreamAccounts, upstreamInstances } from "../db/schema.js";
import { createServices, type Services } from "../services/index.js";

class FakeCodexAuthProvider implements AgentAuthProvider {
  public readonly type = "codex";

  public started: StartAuthInput[] = [];

  public loggedOut: RuntimeAuthInput[] = [];

  public async startAuth(input: StartAuthInput): Promise<AuthSession> {
    this.started.push(input);
    return {
      id: "auth-session-1",
      providerType: "codex",
      accountId: input.accountId,
      state: "waiting_for_browser",
      authHome: input.authHome,
      authUrl: "https://example.com/device",
      userCode: "ABCD-1234",
      message: "Open browser"
    };
  }

  public async loginWithSecret(input: SecretLoginInput): Promise<AuthSession> {
    return {
      id: "auth-secret-1",
      providerType: "codex",
      accountId: input.accountId,
      state: "authenticated",
      authHome: input.authHome
    };
  }

  public async checkRuntime(input: RuntimeAuthInput): Promise<AuthSession> {
    return {
      id: "auth-status-1",
      providerType: "codex",
      accountId: input.accountId,
      state: "authenticated",
      authHome: input.authHome,
      message: "Logged in"
    };
  }

  public async logout(input: RuntimeAuthInput): Promise<AuthSession> {
    this.loggedOut.push(input);
    return {
      id: "auth-logout-1",
      providerType: "codex",
      accountId: input.accountId,
      state: "pending",
      authHome: input.authHome,
      message: "Logged out"
    };
  }
}

/** Optional seed data and path overrides for upstream integration tests. */
export interface UpstreamHarnessOptions {
  /** Base directory for account auth homes. */
  authHomeBase?: string;
  /** Whether to seed a legacy authenticated instance with unknown health. */
  seedUnknownAuthenticatedInstance?: boolean;
  /** Whether to seed an account using the old container auth-home path. */
  seedLegacyContainerAccount?: boolean;
}

/** Isolated app, database, and seeded admin cookie for upstream tests. */
export interface UpstreamHarness {
  /** Elysia app under test. */
  app: ReturnType<typeof createApp>;
  /** Temporary database handle. */
  database: CoreDatabase;
  /** Service graph under test. */
  services: Services;
  /** Fake Codex auth provider used by account auth routes. */
  provider: AgentAuthProvider & { started: StartAuthInput[]; loggedOut: RuntimeAuthInput[] };
  /** Base directory used for auth homes. */
  authHomeBase: string;
  /** Base directory used for runtime workspaces. */
  runtimeWorkspaceBase: string;
  /** Admin cookie header. */
  cookie: string;
  /** Closes the database and removes temporary files. */
  close: () => Promise<void>;
}

/** Creates an isolated upstream test harness with deterministic auth behavior. */
export async function createUpstreamHarness(options: UpstreamHarnessOptions = {}): Promise<UpstreamHarness> {
  const dir = await mkdtemp(join(tmpdir(), "cli2api-upstream-"));
  const authHomeBase = options?.authHomeBase ?? join(dir, "codex-homes");
  const database = openCoreDatabase(join(dir, "test.sqlite"));
  migrateDatabase(database);
  if (options?.seedLegacyContainerAccount) {
    const now = Date.now();
    database.db
      .insert(upstreamAccounts)
      .values({
        id: "codex-main",
        providerType: "codex",
        name: "主账号",
        authState: "pending",
        authHome: "/data/codex-homes/codex-main",
        disabledAt: null,
        lastAuthError: null,
        createdAt: now,
        updatedAt: now
      })
      .run();
  }
  if (options?.seedUnknownAuthenticatedInstance) {
    const now = Date.now();
    database.db
      .insert(upstreamAccounts)
      .values({
        id: "acct-legacy-healthy",
        providerType: "codex",
        name: "历史认证账号",
        authState: "authenticated",
        authHome: join(authHomeBase, "acct-legacy-healthy"),
        disabledAt: null,
        lastAuthError: null,
        createdAt: now,
        updatedAt: now
      })
      .run();
    database.db
      .insert(upstreamInstances)
      .values({
        id: "inst-legacy-unknown",
        accountId: "acct-legacy-healthy",
        type: "codex",
        name: "历史未知实例",
        cwd: join(dir, "legacy-runtime"),
        enabled: 1,
        healthState: "unknown",
        currentRuns: 0,
        maxConcurrentRuns: 1,
        sandbox: "read-only",
        approvalPolicy: "never",
        configJson: "{}",
        lastError: null,
        createdAt: now,
        updatedAt: now
      })
      .run();
  }
  const provider = new FakeCodexAuthProvider();
  const runtimeWorkspaceBase = join(dir, "runtime-workspaces");
  const services = createServices(database, {
    homeDir: dir,
    authProviders: [provider],
    authHomeBase,
    runtimeWorkspaceBase
  });
  services.users.createAdmin("admin@example.com", "password");
  const app: Elysia = createApp({ database, services });
  const login = await app.handle(
    new Request("http://localhost/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "admin@example.com", password: "password" })
    })
  );
  const cookie = login.headers.get("set-cookie");
  if (!cookie) {
    throw new Error("login did not return a session cookie");
  }
  return {
    app,
    database,
    services,
    provider,
    authHomeBase,
    runtimeWorkspaceBase,
    cookie,
    close: async () => {
      database.sqlite.close();
      await rm(dir, { recursive: true, force: true });
    }
  };
}
