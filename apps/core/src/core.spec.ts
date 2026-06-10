import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { openCoreDatabase } from "./db/client.js";
import { migrateDatabase } from "./db/migrate.js";
import { createServices } from "./services/index.js";
import { createTestHarness, type TestHarness } from "./testing/test-harness.js";

async function json(response: Response): Promise<Record<string, unknown>> {
  return (await response.json()) as Record<string, unknown>;
}

describe("@cli2api/core HTTP contracts", () => {
  let harness: TestHarness;

  beforeEach(async () => {
    harness = await createTestHarness();
  });

  afterEach(async () => {
    await harness.close();
  });

  it("logs in an admin, creates a profile, creates an API key, and runs native API requests", async () => {
    const cookie = await harness.login();
    const profile = await harness.createMockProfile(cookie, "mock-default");
    const apiKey = await harness.createApiKey(cookie, { name: "e2e-key", dailyRunLimit: 10 });

    const runResponse = await harness.app.handle(
      new Request("http://localhost/api/runs", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey.token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          prompt: "hello from native",
          profileId: profile.id,
          cwd: "/this-must-be-ignored"
        })
      })
    );

    expect(runResponse.status).toBe(200);
    const run = await json(runResponse);
    expect(run.status).toBe("completed");
    expect(run.output).toContain("hello from native");
    const storedProfile = harness.services.profiles.require(profile.id);
    expect(storedProfile).toMatchObject({
      sandbox: "read-only",
      approvalPolicy: "never"
    });
    expect(storedProfile.cwd.startsWith(join(harness.runtimeWorkspaceBase, "profiles"))).toBe(true);
    expect(storedProfile.cwd).not.toBe("/this-must-be-ignored");

    const eventsResponse = await harness.app.handle(
      new Request(`http://localhost/api/runs/${String(run.id)}/events`, {
        headers: { authorization: `Bearer ${apiKey.token}` }
      })
    );
    expect(eventsResponse.status).toBe(200);
    const events = (await eventsResponse.json()) as Array<Record<string, unknown>>;
    expect(events.some((event) => event.type === "run.completed")).toBe(true);
  });

  it("bootstraps the first admin account from the first login only", async () => {
    const dir = await mkdtemp(join(tmpdir(), "cli2api-first-admin-"));
    const database = openCoreDatabase(join(dir, "test.sqlite"));
    migrateDatabase(database);
    const services = createServices(database, { homeDir: dir, runtimeWorkspaceBase: join(dir, "runtime-workspaces") });
    const app = createApp({ database, services });

    try {
      const firstLogin = await app.handle(
        new Request("http://localhost/api/admin/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: "owner@example.com", password: "change-me" })
        })
      );
      const cookie = firstLogin.headers.get("set-cookie");

      expect(firstLogin.status).toBe(200);
      expect(cookie).toContain("cli2api_session=");
      expect(await json(firstLogin)).toMatchObject({
        user: { email: "owner@example.com", role: "admin" }
      });

      const usersResponse = await app.handle(
        new Request("http://localhost/api/admin/users", {
          headers: { cookie: String(cookie) }
        })
      );
      expect(usersResponse.status).toBe(200);
      expect(await usersResponse.json()).toMatchObject([
        { email: "owner@example.com", role: "admin", disabledAt: null }
      ]);

      const secondEmailLogin = await app.handle(
        new Request("http://localhost/api/admin/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: "second@example.com", password: "change-me" })
        })
      );

      expect(secondEmailLogin.status).toBe(401);
      expect(services.users.list()).toHaveLength(1);
    } finally {
      database.sqlite.close();
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("exposes enabled profiles through /v1/models and maps responses requests to runs", async () => {
    const cookie = await harness.login();
    const profile = await harness.createMockProfile(cookie, "mock-responses");
    const apiKey = await harness.createApiKey(cookie, { name: "responses-key" });

    const modelsResponse = await harness.app.handle(
      new Request("http://localhost/v1/models", {
        headers: { authorization: `Bearer ${apiKey.token}` }
      })
    );
    expect(modelsResponse.status).toBe(200);
    const models = await json(modelsResponse);
    expect(models.data).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: profile.id, object: "model" })])
    );

    const response = await harness.app.handle(
      new Request("http://localhost/v1/responses", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey.token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({ model: profile.id, input: "hello responses" })
      })
    );

    expect(response.status).toBe(200);
    const body = await json(response);
    expect(body.output_text).toContain("hello responses");
  });

  it("maps chat completions requests to runs and can return SSE frames", async () => {
    const cookie = await harness.login();
    const profile = await harness.createMockProfile(cookie, "mock-chat");
    const apiKey = await harness.createApiKey(cookie, { name: "chat-key" });

    const response = await harness.app.handle(
      new Request("http://localhost/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey.token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({
          model: profile.id,
          stream: true,
          messages: [{ role: "user", content: "hello chat" }]
        })
      })
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(await response.text()).toContain("data:");
  });

  it("rejects API keys that exceed run quotas", async () => {
    const cookie = await harness.login();
    const profile = await harness.createMockProfile(cookie, "mock-quota");
    const apiKey = await harness.createApiKey(cookie, { name: "quota-key", dailyRunLimit: 0 });

    const response = await harness.app.handle(
      new Request("http://localhost/api/runs", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey.token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({ prompt: "blocked", profileId: profile.id })
      })
    );

    expect(response.status).toBe(429);
    expect(await json(response)).toMatchObject({
      error: { code: "QUOTA_EXCEEDED" }
    });

    const runsResponse = await harness.app.handle(
      new Request("http://localhost/api/admin/runs", {
        headers: { cookie }
      })
    );
    const runs = (await runsResponse.json()) as Array<Record<string, unknown>>;
    const failedRun = runs.find((run) => run.prompt === "blocked");
    expect(failedRun).toMatchObject({
      status: "failed",
      errorCode: "QUOTA_EXCEEDED",
      profileId: profile.id
    });

    const eventsResponse = await harness.app.handle(
      new Request(`http://localhost/api/admin/runs/${String(failedRun?.id)}/events`, {
        headers: { cookie }
      })
    );
    expect(eventsResponse.status).toBe(200);
    const events = (await eventsResponse.json()) as Array<Record<string, unknown>>;
    expect(events).toContainEqual(expect.objectContaining({ type: "run.failed", code: "QUOTA_EXCEEDED" }));
  });

  it("scopes downstream run reads to the API key that created the run", async () => {
    const cookie = await harness.login();
    const profile = await harness.createMockProfile(cookie, "mock-owner");
    const ownerKey = await harness.createApiKey(cookie, { name: "owner-key" });
    const otherKey = await harness.createApiKey(cookie, { name: "other-key" });

    const runResponse = await harness.app.handle(
      new Request("http://localhost/api/runs", {
        method: "POST",
        headers: {
          authorization: `Bearer ${ownerKey.token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({ prompt: "owned run", profileId: profile.id })
      })
    );
    const run = await json(runResponse);

    const ownerRead = await harness.app.handle(
      new Request(`http://localhost/api/runs/${String(run.id)}`, {
        headers: { authorization: `Bearer ${ownerKey.token}` }
      })
    );
    expect(ownerRead.status).toBe(200);

    const crossRead = await harness.app.handle(
      new Request(`http://localhost/api/runs/${String(run.id)}`, {
        headers: { authorization: `Bearer ${otherKey.token}` }
      })
    );
    expect(crossRead.status).toBe(404);
    expect(await json(crossRead)).toMatchObject({ error: { code: "INVALID_REQUEST" } });

    const crossEvents = await harness.app.handle(
      new Request(`http://localhost/api/runs/${String(run.id)}/events`, {
        headers: { authorization: `Bearer ${otherKey.token}` }
      })
    );
    expect(crossEvents.status).toBe(404);

    const adminEvents = await harness.app.handle(
      new Request(`http://localhost/api/admin/runs/${String(run.id)}/events`, {
        headers: { cookie }
      })
    );
    expect(adminEvents.status).toBe(200);
    const events = (await adminEvents.json()) as Array<Record<string, unknown>>;
    expect(events).toContainEqual(expect.objectContaining({ type: "run.completed" }));
  });

  it("lets admins inspect usage buckets and revoke API keys", async () => {
    const cookie = await harness.login();
    const profile = await harness.createMockProfile(cookie, "mock-admin-ops");
    const keyResponse = await harness.app.handle(
      new Request("http://localhost/api/admin/api-keys", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ name: "ops-key", dailyRunLimit: 10 })
      })
    );
    const key = (await keyResponse.json()) as { id: string; token: string };

    const runResponse = await harness.app.handle(
      new Request("http://localhost/api/runs", {
        method: "POST",
        headers: {
          authorization: `Bearer ${key.token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({ prompt: "usage visible", profileId: profile.id })
      })
    );
    expect(runResponse.status).toBe(200);

    const usageResponse = await harness.app.handle(
      new Request("http://localhost/api/admin/usage", {
        headers: { cookie }
      })
    );
    expect(usageResponse.status).toBe(200);
    const usage = (await usageResponse.json()) as Array<Record<string, unknown>>;
    expect(usage).toContainEqual(
      expect.objectContaining({
        apiKeyId: key.id,
        bucketType: "month",
        runCount: 1
      })
    );

    const revokeResponse = await harness.app.handle(
      new Request(`http://localhost/api/admin/api-keys/${key.id}/revoke`, {
        method: "POST",
        headers: { cookie }
      })
    );
    expect(revokeResponse.status).toBe(200);

    const blockedResponse = await harness.app.handle(
      new Request("http://localhost/api/runs", {
        method: "POST",
        headers: {
          authorization: `Bearer ${key.token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({ prompt: "after revoke", profileId: profile.id })
      })
    );
    expect(blockedResponse.status).toBe(401);
  });

  it("lets admins delete unused dashboard data while preserving run history", async () => {
    const cookie = await harness.login();
    const unusedProfile = await harness.createMockProfile(cookie, "mock-unused-delete");
    const usedProfile = await harness.createMockProfile(cookie, "mock-used-delete");
    const unusedKey = await harness.createApiKey(cookie, { name: "unused-delete-key" });
    const usedKey = await harness.createApiKey(cookie, { name: "used-delete-key" });

    const userResponse = await harness.app.handle(
      new Request("http://localhost/api/admin/users", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({ email: "delete-me@example.com", password: "change-me" })
      })
    );
    const user = (await userResponse.json()) as { id: string };

    const runResponse = await harness.app.handle(
      new Request("http://localhost/api/runs", {
        method: "POST",
        headers: {
          authorization: `Bearer ${usedKey.token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({ prompt: "keep history", profileId: usedProfile.id })
      })
    );
    expect(runResponse.status).toBe(200);

    const deleteUnusedProfile = await harness.app.handle(
      new Request(`http://localhost/api/admin/profiles/${unusedProfile.id}`, {
        method: "DELETE",
        headers: { cookie }
      })
    );
    expect(deleteUnusedProfile.status).toBe(200);

    const deleteUsedProfile = await harness.app.handle(
      new Request(`http://localhost/api/admin/profiles/${usedProfile.id}`, {
        method: "DELETE",
        headers: { cookie }
      })
    );
    expect(deleteUsedProfile.status).toBe(409);

    const deleteUnusedKey = await harness.app.handle(
      new Request("http://localhost/api/admin/api-keys/unused-id", {
        method: "DELETE",
        headers: { cookie }
      })
    );
    expect(deleteUnusedKey.status).toBe(404);

    const keys = harness.services.apiKeys.list();
    const unusedKeyRecord = keys.find((key) => key.keyPrefix === unusedKey.token.slice(0, 14));
    expect(unusedKeyRecord).toBeTruthy();
    const deleteRealUnusedKey = await harness.app.handle(
      new Request(`http://localhost/api/admin/api-keys/${String(unusedKeyRecord?.id)}`, {
        method: "DELETE",
        headers: { cookie }
      })
    );
    expect(deleteRealUnusedKey.status).toBe(200);

    const usedKeyRecord = harness.services.apiKeys.list().find((key) => key.keyPrefix === usedKey.token.slice(0, 14));
    const deleteUsedKey = await harness.app.handle(
      new Request(`http://localhost/api/admin/api-keys/${String(usedKeyRecord?.id)}`, {
        method: "DELETE",
        headers: { cookie }
      })
    );
    expect(deleteUsedKey.status).toBe(409);

    const deleteUser = await harness.app.handle(
      new Request(`http://localhost/api/admin/users/${user.id}`, {
        method: "DELETE",
        headers: { cookie }
      })
    );
    expect(deleteUser.status).toBe(200);
  });

  it("serves built dashboard assets when a dist directory is configured", async () => {
    const previous = process.env.CLI2API_DASH_DIST;
    const dir = await mkdtemp(join(tmpdir(), "cli2api-dash-"));
    await mkdir(join(dir, "assets"));
    await writeFile(join(dir, "index.html"), "<div>dashboard</div>");
    await writeFile(join(dir, "assets", "app.js"), "console.log('dash')");
    process.env.CLI2API_DASH_DIST = dir;

    try {
      const index = await harness.app.handle(new Request("http://localhost/"));
      expect(index.status).toBe(200);
      expect(index.headers.get("content-type")).toContain("text/html");
      expect(await index.text()).toContain("dashboard");

      const asset = await harness.app.handle(new Request("http://localhost/assets/app.js"));
      expect(asset.status).toBe(200);
      expect(asset.headers.get("content-type")).toContain("text/javascript");

      process.env.CLI2API_DASH_DIST = join(dir, "missing");
      const missing = await harness.app.handle(new Request("http://localhost/"));
      expect(missing.status).toBe(404);
    } finally {
      if (previous === undefined) {
        delete process.env.CLI2API_DASH_DIST;
      } else {
        process.env.CLI2API_DASH_DIST = previous;
      }
      await rm(dir, { recursive: true, force: true });
    }
  });

  it("serves dashboard assets when the core package is the current working directory", async () => {
    const previous = process.env.CLI2API_DASH_DIST;
    const cwd = process.cwd();
    const root = await mkdtemp(join(tmpdir(), "cli2api-monorepo-"));
    await mkdir(join(root, "apps/core"), { recursive: true });
    await mkdir(join(root, "apps/dash/dist/assets"), { recursive: true });
    await writeFile(join(root, "apps/dash/dist/index.html"), "<div>core cwd dashboard</div>");
    await writeFile(join(root, "apps/dash/dist/assets/app.js"), "console.log('core cwd')");
    delete process.env.CLI2API_DASH_DIST;
    process.chdir(join(root, "apps/core"));

    try {
      const index = await harness.app.handle(new Request("http://localhost/"));
      expect(index.status).toBe(200);
      expect(await index.text()).toContain("core cwd dashboard");

      const asset = await harness.app.handle(new Request("http://localhost/assets/app.js"));
      expect(asset.status).toBe(200);
      expect(asset.headers.get("content-type")).toContain("text/javascript");
    } finally {
      process.chdir(cwd);
      if (previous === undefined) {
        delete process.env.CLI2API_DASH_DIST;
      } else {
        process.env.CLI2API_DASH_DIST = previous;
      }
      await rm(root, { recursive: true, force: true });
    }
  });
});
