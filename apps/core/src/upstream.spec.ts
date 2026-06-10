import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type {
  AgentAuthProvider,
  AuthSession,
  RuntimeAuthInput,
  SecretLoginInput,
  StartAuthInput
} from "@cli2api/agents-sdk";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { openCoreDatabase, type CoreDatabase } from "./db/client.js";
import { migrateDatabase } from "./db/migrate.js";
import { upstreamAccounts, upstreamInstances } from "./db/schema.js";
import { createServices, type Services } from "./services/index.js";

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

interface UpstreamHarnessOptions {
  authHomeBase?: string;
  seedUnknownAuthenticatedInstance?: boolean;
  seedLegacyContainerAccount?: boolean;
}

async function createUpstreamHarness(options: UpstreamHarnessOptions = {}): Promise<{
  app: ReturnType<typeof createApp>;
  database: CoreDatabase;
  services: Services;
  provider: FakeCodexAuthProvider;
  authHomeBase: string;
  runtimeWorkspaceBase: string;
  cookie: string;
  close: () => Promise<void>;
}> {
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
  const app = createApp({ database, services });
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

describe("@cli2api/core upstream account pool", () => {
  let harness: Awaited<ReturnType<typeof createUpstreamHarness>>;

  beforeEach(async () => {
    harness = await createUpstreamHarness();
  });

  afterEach(async () => {
    await harness.close();
  });

  it("creates upstream accounts and drives Codex device auth status", async () => {
    const accountResponse = await harness.app.handle(
      new Request("http://localhost/api/admin/upstream/accounts", {
        method: "POST",
        headers: { cookie: harness.cookie, "content-type": "application/json" },
        body: JSON.stringify({ id: "acct-codex-1", providerType: "codex", name: "主 Codex 账号" })
      })
    );

    expect(accountResponse.status).toBe(200);
    expect(await accountResponse.json()).toMatchObject({
      id: "acct-codex-1",
      providerType: "codex",
      name: "主 Codex 账号",
      authState: "pending",
      authHome: join(harness.authHomeBase, "acct-codex-1")
    });
    expect(existsSync(join(harness.authHomeBase, "acct-codex-1"))).toBe(true);

    const startResponse = await harness.app.handle(
      new Request("http://localhost/api/admin/upstream/accounts/acct-codex-1/auth/start", {
        method: "POST",
        headers: { cookie: harness.cookie, "content-type": "application/json" },
        body: JSON.stringify({ method: "device" })
      })
    );

    expect(startResponse.status).toBe(200);
    expect(await startResponse.json()).toMatchObject({
      id: "auth-session-1",
      accountId: "acct-codex-1",
      state: "waiting_for_browser",
      authUrl: "https://example.com/device",
      userCode: "ABCD-1234"
    });
    expect(harness.provider.started[0]?.authHome).toBe(join(harness.authHomeBase, "acct-codex-1"));

    const statusResponse = await harness.app.handle(
      new Request("http://localhost/api/admin/upstream/accounts/acct-codex-1/auth/status", {
        headers: { cookie: harness.cookie }
      })
    );

    expect(statusResponse.status).toBe(200);
    expect(await statusResponse.json()).toMatchObject({
      accountId: "acct-codex-1",
      state: "authenticated"
    });

    const listResponse = await harness.app.handle(
      new Request("http://localhost/api/admin/upstream/accounts", {
        headers: { cookie: harness.cookie }
      })
    );
    expect(await listResponse.json()).toMatchObject([
      { id: "acct-codex-1", authState: "authenticated" }
    ]);
  });

  it("rejects upstream auth homes outside the configured base directory", async () => {
    const accountResponse = await harness.app.handle(
      new Request("http://localhost/api/admin/upstream/accounts", {
        method: "POST",
        headers: { cookie: harness.cookie, "content-type": "application/json" },
        body: JSON.stringify({
          id: "acct-unsafe-home",
          providerType: "codex",
          name: "unsafe",
          authHome: "/tmp/outside-codex-home"
        })
      })
    );

    expect(accountResponse.status).toBe(400);
    expect(await accountResponse.json()).toMatchObject({
      error: { code: "INVALID_REQUEST" }
    });
  });

  it("aligns legacy container auth homes to the configured auth base", async () => {
    const legacyHarness = await createUpstreamHarness({
      authHomeBase: "/root/.cli2api/codex-homes",
      seedLegacyContainerAccount: true
    });
    try {
      expect(legacyHarness.services.upstream.listAccounts()).toMatchObject([
        {
          id: "codex-main",
          authHome: "/root/.cli2api/codex-homes/codex-main"
        }
      ]);
      const stored = legacyHarness.database.sqlite
        .prepare("SELECT auth_home AS authHome FROM upstream_accounts WHERE id = ?")
        .get("codex-main") as { authHome: string } | undefined;
      expect(stored?.authHome).toBe("/root/.cli2api/codex-homes/codex-main");
    } finally {
      await legacyHarness.close();
    }
  });

  it("cancels a pending upstream auth session without calling the provider", async () => {
    await harness.app.handle(
      new Request("http://localhost/api/admin/upstream/accounts", {
        method: "POST",
        headers: { cookie: harness.cookie, "content-type": "application/json" },
        body: JSON.stringify({ id: "acct-codex-2", providerType: "codex", name: "备用账号" })
      })
    );
    await harness.app.handle(
      new Request("http://localhost/api/admin/upstream/accounts/acct-codex-2/auth/start", {
        method: "POST",
        headers: { cookie: harness.cookie, "content-type": "application/json" },
        body: JSON.stringify({ method: "device" })
      })
    );

    const cancelResponse = await harness.app.handle(
      new Request("http://localhost/api/admin/upstream/auth-sessions/auth-session-1/cancel", {
        method: "POST",
        headers: { cookie: harness.cookie }
      })
    );

    expect(cancelResponse.status).toBe(200);
    expect(await cancelResponse.json()).toMatchObject({
      id: "auth-session-1",
      accountId: "acct-codex-2",
      state: "canceled"
    });
  });

  it("logs out accounts and disables upstream instances", async () => {
    await createAuthenticatedAccount("acct-admin-ops");
    const instance = await createInstance("inst-admin-ops", "acct-admin-ops", { maxConcurrentRuns: 2 });

    const logoutResponse = await harness.app.handle(
      new Request("http://localhost/api/admin/upstream/accounts/acct-admin-ops/logout", {
        method: "POST",
        headers: { cookie: harness.cookie }
      })
    );

    expect(logoutResponse.status).toBe(200);
    expect(await logoutResponse.json()).toMatchObject({
      accountId: "acct-admin-ops",
      state: "pending"
    });
    expect(harness.provider.loggedOut[0]?.authHome).toBe(join(harness.authHomeBase, "acct-admin-ops"));

    const updateResponse = await harness.app.handle(
      new Request(`http://localhost/api/admin/upstream/instances/${instance.id}`, {
        method: "PATCH",
        headers: { cookie: harness.cookie, "content-type": "application/json" },
        body: JSON.stringify({ name: "disabled admin instance", maxConcurrentRuns: 4 })
      })
    );

    expect(updateResponse.status).toBe(200);
    expect(await updateResponse.json()).toMatchObject({
      id: instance.id,
      name: "disabled admin instance",
      maxConcurrentRuns: 4
    });

    const disableResponse = await harness.app.handle(
      new Request(`http://localhost/api/admin/upstream/instances/${instance.id}/disable`, {
        method: "POST",
        headers: { cookie: harness.cookie }
      })
    );

    expect(disableResponse.status).toBe(200);
    expect(await disableResponse.json()).toMatchObject({
      id: instance.id,
      enabled: false,
      healthState: "disabled"
    });
  });

  it("creates and lists upstream instances bound to authenticated accounts", async () => {
    await harness.app.handle(
      new Request("http://localhost/api/admin/upstream/accounts", {
        method: "POST",
        headers: { cookie: harness.cookie, "content-type": "application/json" },
        body: JSON.stringify({ id: "acct-codex-3", providerType: "codex", name: "实例账号" })
      })
    );
    await harness.app.handle(
      new Request("http://localhost/api/admin/upstream/accounts/acct-codex-3/auth/status", {
        headers: { cookie: harness.cookie }
      })
    );

    const instanceResponse = await harness.app.handle(
      new Request("http://localhost/api/admin/upstream/instances", {
        method: "POST",
        headers: { cookie: harness.cookie, "content-type": "application/json" },
        body: JSON.stringify({
          id: "inst-codex-1",
          accountId: "acct-codex-3",
          type: "codex",
          name: "Codex 实例 1",
          cwd: process.cwd(),
          enabled: true,
          maxConcurrentRuns: 3,
          sandbox: "danger-full-access",
          approvalPolicy: "on-request",
          config: { model: "gpt-5" }
        })
      })
    );

    expect(instanceResponse.status).toBe(200);
    const instanceBody = (await instanceResponse.json()) as { cwd: string };
    expect(instanceBody).toMatchObject({
      id: "inst-codex-1",
      accountId: "acct-codex-3",
      type: "codex",
      name: "Codex 实例 1",
      healthState: "healthy",
      enabled: true,
      currentRuns: 0,
      maxConcurrentRuns: 3,
      sandbox: "read-only",
      approvalPolicy: "never",
      config: { model: "gpt-5" }
    });
    expect(instanceBody.cwd.startsWith(join(harness.runtimeWorkspaceBase, "instances"))).toBe(true);
    expect(instanceBody.cwd).not.toBe(process.cwd());

    const listResponse = await harness.app.handle(
      new Request("http://localhost/api/admin/upstream/instances", {
        headers: { cookie: harness.cookie }
      })
    );

    expect(listResponse.status).toBe(200);
    expect(await listResponse.json()).toMatchObject([
      { id: "inst-codex-1", accountId: "acct-codex-3", enabled: true, healthState: "healthy" }
    ]);
  });

  it("normalizes existing unknown instances for authenticated accounts", async () => {
    const legacyHarness = await createUpstreamHarness({ seedUnknownAuthenticatedInstance: true });
    try {
      expect(legacyHarness.services.upstream.listInstances()).toMatchObject([
        {
          id: "inst-legacy-unknown",
          accountId: "acct-legacy-healthy",
          enabled: true,
          healthState: "healthy"
        }
      ]);
      const stored = legacyHarness.database.sqlite
        .prepare("SELECT health_state AS healthState FROM upstream_instances WHERE id = ?")
        .get("inst-legacy-unknown") as { healthState: string } | undefined;
      expect(stored?.healthState).toBe("healthy");
    } finally {
      await legacyHarness.close();
    }
  });

  it("selects an available upstream instance when executing a matching run", async () => {
    await createAuthenticatedAccount("acct-run-1");
    const instance = await createInstance("inst-run-1", "acct-run-1", { maxConcurrentRuns: 2 });
    const profile = await createProfile("mock-routed");
    const key = await createApiKey("routed-key");

    const runResponse = await harness.app.handle(
      new Request("http://localhost/api/runs", {
        method: "POST",
        headers: {
          authorization: `Bearer ${key.token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({ prompt: "hello routed", profileId: profile.id })
      })
    );

    expect(runResponse.status).toBe(200);
    expect(await runResponse.json()).toMatchObject({
      status: "completed",
      profileId: "mock-routed",
      upstreamInstanceId: instance.id
    });
    expect(harness.services.upstream.listInstances()).toMatchObject([
      { id: instance.id, currentRuns: 0 }
    ]);
  });

  it("ignores instance workspace and policy override attempts", async () => {
    await createAuthenticatedAccount("acct-policy-override");
    const instance = await createInstance("inst-policy-override", "acct-policy-override", { maxConcurrentRuns: 1 });

    const updateResponse = await harness.app.handle(
      new Request(`http://localhost/api/admin/upstream/instances/${instance.id}`, {
        method: "PATCH",
        headers: { cookie: harness.cookie, "content-type": "application/json" },
        body: JSON.stringify({
          cwd: process.cwd(),
          sandbox: "danger-full-access",
          approvalPolicy: "on-request",
          maxConcurrentRuns: 2
        })
      })
    );

    expect(updateResponse.status).toBe(200);
    const body = (await updateResponse.json()) as { cwd: string };
    expect(body).toMatchObject({
      id: instance.id,
      sandbox: "read-only",
      approvalPolicy: "never",
      maxConcurrentRuns: 2
    });
    expect(body.cwd.startsWith(join(harness.runtimeWorkspaceBase, "instances"))).toBe(true);
    expect(body.cwd).not.toBe(process.cwd());
  });

  it("returns a stable error when matching upstream instances are at capacity", async () => {
    await createAuthenticatedAccount("acct-run-2");
    const instance = await createInstance("inst-run-2", "acct-run-2", { maxConcurrentRuns: 1 });
    const profile = await createProfile("mock-saturated");
    const key = await createApiKey("saturated-key");
    harness.database.sqlite
      .prepare("UPDATE upstream_instances SET current_runs = 1 WHERE id = ?")
      .run(instance.id);

    const runResponse = await harness.app.handle(
      new Request("http://localhost/api/runs", {
        method: "POST",
        headers: {
          authorization: `Bearer ${key.token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({ prompt: "blocked by upstream", profileId: profile.id })
      })
    );

    expect(runResponse.status).toBe(503);
    expect(await runResponse.json()).toMatchObject({
      error: { code: "UPSTREAM_UNAVAILABLE" }
    });
  });

  it("honors explicit profile to upstream instance route bindings", async () => {
    await createAuthenticatedAccount("acct-route-a");
    await createAuthenticatedAccount("acct-route-z");
    await createInstance("aaa-route-inst", "acct-route-a", { maxConcurrentRuns: 2 });
    const boundInstance = await createInstance("zzz-route-inst", "acct-route-z", { maxConcurrentRuns: 2 });
    const profile = await createProfile("mock-explicit-route");
    const key = await createApiKey("route-key");

    const routeResponse = await harness.app.handle(
      new Request("http://localhost/api/admin/upstream/routes", {
        method: "POST",
        headers: { cookie: harness.cookie, "content-type": "application/json" },
        body: JSON.stringify({ profileId: profile.id, instanceId: boundInstance.id })
      })
    );

    expect(routeResponse.status).toBe(200);
    const route = (await routeResponse.json()) as { id: string };

    const listResponse = await harness.app.handle(
      new Request("http://localhost/api/admin/upstream/routes", {
        headers: { cookie: harness.cookie }
      })
    );
    expect(await listResponse.json()).toMatchObject([
      { profileId: profile.id, instanceId: boundInstance.id }
    ]);

    const runResponse = await harness.app.handle(
      new Request("http://localhost/api/runs", {
        method: "POST",
        headers: {
          authorization: `Bearer ${key.token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({ prompt: "explicit route", profileId: profile.id })
      })
    );

    expect(runResponse.status).toBe(200);
    expect(await runResponse.json()).toMatchObject({
      upstreamInstanceId: boundInstance.id
    });

    const deleteResponse = await harness.app.handle(
      new Request(`http://localhost/api/admin/upstream/routes/${route.id}`, {
        method: "DELETE",
        headers: { cookie: harness.cookie }
      })
    );
    expect(deleteResponse.status).toBe(200);
  });

  it("deletes unused upstream instances and accounts but protects run history", async () => {
    await createAuthenticatedAccount("acct-delete-unused");
    const unusedInstance = await createInstance("inst-delete-unused", "acct-delete-unused", { maxConcurrentRuns: 1 });
    const profile = await createProfile("mock-delete-used");
    const key = await createApiKey("delete-history-key");

    const blockedAccountDelete = await harness.app.handle(
      new Request("http://localhost/api/admin/upstream/accounts/acct-delete-unused", {
        method: "DELETE",
        headers: { cookie: harness.cookie }
      })
    );
    expect(blockedAccountDelete.status).toBe(409);

    const deleteInstance = await harness.app.handle(
      new Request(`http://localhost/api/admin/upstream/instances/${unusedInstance.id}`, {
        method: "DELETE",
        headers: { cookie: harness.cookie }
      })
    );
    expect(deleteInstance.status).toBe(200);

    const deleteAccount = await harness.app.handle(
      new Request("http://localhost/api/admin/upstream/accounts/acct-delete-unused", {
        method: "DELETE",
        headers: { cookie: harness.cookie }
      })
    );
    expect(deleteAccount.status).toBe(200);

    await createAuthenticatedAccount("acct-delete-used");
    const usedInstance = await createInstance("inst-delete-used", "acct-delete-used", { maxConcurrentRuns: 1 });
    const runResponse = await harness.app.handle(
      new Request("http://localhost/api/runs", {
        method: "POST",
        headers: {
          authorization: `Bearer ${key.token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({ prompt: "keep instance history", profileId: profile.id })
      })
    );
    expect(runResponse.status).toBe(200);

    const deleteUsedInstance = await harness.app.handle(
      new Request(`http://localhost/api/admin/upstream/instances/${usedInstance.id}`, {
        method: "DELETE",
        headers: { cookie: harness.cookie }
      })
    );
    expect(deleteUsedInstance.status).toBe(409);
  });

  async function createAuthenticatedAccount(id: string): Promise<void> {
    await harness.app.handle(
      new Request("http://localhost/api/admin/upstream/accounts", {
        method: "POST",
        headers: { cookie: harness.cookie, "content-type": "application/json" },
        body: JSON.stringify({ id, providerType: "codex", name: id })
      })
    );
    await harness.app.handle(
      new Request(`http://localhost/api/admin/upstream/accounts/${id}/auth/status`, {
        headers: { cookie: harness.cookie }
      })
    );
  }

  async function createInstance(
    id: string,
    accountId: string,
    options: { maxConcurrentRuns: number }
  ): Promise<{ id: string }> {
    const response = await harness.app.handle(
      new Request("http://localhost/api/admin/upstream/instances", {
        method: "POST",
        headers: { cookie: harness.cookie, "content-type": "application/json" },
        body: JSON.stringify({
          id,
          accountId,
          type: "mock",
          name: id,
          cwd: process.cwd(),
          enabled: true,
          maxConcurrentRuns: options.maxConcurrentRuns
        })
      })
    );
    expect(response.status).toBe(200);
    return (await response.json()) as { id: string };
  }

  async function createProfile(id: string): Promise<{ id: string }> {
    const response = await harness.app.handle(
      new Request("http://localhost/api/admin/profiles", {
        method: "POST",
        headers: { cookie: harness.cookie, "content-type": "application/json" },
        body: JSON.stringify({
          id,
          type: "mock",
          name: id,
          cwd: process.cwd(),
          enabled: true
        })
      })
    );
    expect(response.status).toBe(200);
    return (await response.json()) as { id: string };
  }

  async function createApiKey(name: string): Promise<{ token: string }> {
    const response = await harness.app.handle(
      new Request("http://localhost/api/admin/api-keys", {
        method: "POST",
        headers: { cookie: harness.cookie, "content-type": "application/json" },
        body: JSON.stringify({ name, dailyRunLimit: 10 })
      })
    );
    expect(response.status).toBe(200);
    return (await response.json()) as { token: string };
  }
});
