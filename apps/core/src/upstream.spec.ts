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
import { createServices, type Services } from "./services/index.js";

class FakeCodexAuthProvider implements AgentAuthProvider {
  public readonly type = "codex";

  public started: StartAuthInput[] = [];

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

async function createUpstreamHarness(): Promise<{
  app: ReturnType<typeof createApp>;
  database: CoreDatabase;
  services: Services;
  provider: FakeCodexAuthProvider;
  cookie: string;
  close: () => Promise<void>;
}> {
  const dir = await mkdtemp(join(tmpdir(), "cli2api-upstream-"));
  const database = openCoreDatabase(join(dir, "test.sqlite"));
  migrateDatabase(database);
  const provider = new FakeCodexAuthProvider();
  const services = createServices(database, { authProviders: [provider], authHomeBase: "/data/codex-homes" });
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
      authHome: "/data/codex-homes/acct-codex-1"
    });

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
    expect(harness.provider.started[0]?.authHome).toBe("/data/codex-homes/acct-codex-1");

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
          sandbox: "workspace-write",
          approvalPolicy: "never",
          config: { model: "gpt-5" }
        })
      })
    );

    expect(instanceResponse.status).toBe(200);
    expect(await instanceResponse.json()).toMatchObject({
      id: "inst-codex-1",
      accountId: "acct-codex-3",
      type: "codex",
      name: "Codex 实例 1",
      healthState: "unknown",
      enabled: true,
      currentRuns: 0,
      maxConcurrentRuns: 3,
      config: { model: "gpt-5" }
    });

    const listResponse = await harness.app.handle(
      new Request("http://localhost/api/admin/upstream/instances", {
        headers: { cookie: harness.cookie }
      })
    );

    expect(listResponse.status).toBe(200);
    expect(await listResponse.json()).toMatchObject([
      { id: "inst-codex-1", accountId: "acct-codex-3", enabled: true }
    ]);
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
