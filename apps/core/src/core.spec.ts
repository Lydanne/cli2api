import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app.js";
import { openCoreDatabase } from "./db/client.js";
import { migrateDatabase } from "./db/migrate.js";
import { apiKeys, runEvents, runs, upstreamRunSessions, usageBuckets } from "./db/schema.js";
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

  it("imports bundled agent SDK models as adapter profiles", async () => {
    const cookie = await harness.login();
    const existing = await harness.app.handle(
      new Request("http://localhost/api/admin/profiles", {
        method: "POST",
        headers: { cookie, "content-type": "application/json" },
        body: JSON.stringify({
          id: "gpt-5.5",
          type: "codex",
          name: "Already Imported",
          enabled: true,
          config: { model: "custom-existing" }
        })
      })
    );
    expect(existing.status).toBe(200);

    const catalogResponse = await harness.app.handle(
      new Request("http://localhost/api/admin/agent-models", {
        headers: { cookie }
      })
    );
    expect(catalogResponse.status).toBe(200);
    expect(await catalogResponse.json()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "gpt-5.5", type: "codex", config: { model: "gpt-5.5" } })
      ])
    );

    const importResponse = await harness.app.handle(
      new Request("http://localhost/api/admin/profiles/import-agent-models", {
        method: "POST",
        headers: { cookie }
      })
    );
    expect(importResponse.status).toBe(200);
    expect(await importResponse.json()).toMatchObject({
      created: [
        { id: "gpt-5.4", type: "codex", config: { model: "gpt-5.4" } },
        { id: "gpt-5.4-mini", type: "codex", config: { model: "gpt-5.4-mini" } }
      ],
      skipped: [{ id: "gpt-5.5" }]
    });
    expect(harness.services.profiles.require("gpt-5.4").config).toEqual({ model: "gpt-5.4" });
    expect(harness.services.profiles.require("gpt-5.5").config).toEqual({ model: "custom-existing" });
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

  it("supports broader OpenAI-compatible text retrieval contracts", async () => {
    const cookie = await harness.login();
    const profile = await harness.createMockProfile(cookie, "mock-openai-wide");
    const apiKey = await harness.createApiKey(cookie, { name: "openai-wide-key" });
    const authHeaders = {
      authorization: `Bearer ${apiKey.token}`,
      "content-type": "application/json"
    };

    const modelResponse = await harness.app.handle(
      new Request(`http://localhost/v1/models/${profile.id}`, {
        headers: { authorization: `Bearer ${apiKey.token}` }
      })
    );
    expect(modelResponse.status).toBe(200);
    expect(await json(modelResponse)).toMatchObject({
      id: profile.id,
      object: "model",
      owned_by: "cli2api"
    });

    const createdResponse = await harness.app.handle(
      new Request("http://localhost/v1/responses", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ model: profile.id, input: "hello stored response" })
      })
    );
    expect(createdResponse.status).toBe(200);
    const created = await json(createdResponse);

    const retrievedResponse = await harness.app.handle(
      new Request(`http://localhost/v1/responses/${String(created.id)}`, {
        headers: { authorization: `Bearer ${apiKey.token}` }
      })
    );
    expect(retrievedResponse.status).toBe(200);
    expect(await json(retrievedResponse)).toMatchObject({
      id: created.id,
      object: "response",
      output_text: expect.stringContaining("hello stored response")
    });

    const inputItemsResponse = await harness.app.handle(
      new Request(`http://localhost/v1/responses/${String(created.id)}/input_items`, {
        headers: { authorization: `Bearer ${apiKey.token}` }
      })
    );
    expect(inputItemsResponse.status).toBe(200);
    expect(await inputItemsResponse.json()).toMatchObject({
      object: "list",
      data: [
        {
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: "hello stored response" }]
        }
      ],
      has_more: false
    });

    const chatResponse = await harness.app.handle(
      new Request("http://localhost/v1/chat/completions", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          model: profile.id,
          messages: [{ role: "user", content: "hello stored chat" }]
        })
      })
    );
    expect(chatResponse.status).toBe(200);
    const chat = await json(chatResponse);

    const retrievedChat = await harness.app.handle(
      new Request(`http://localhost/v1/chat/completions/${String(chat.id)}`, {
        headers: { authorization: `Bearer ${apiKey.token}` }
      })
    );
    expect(retrievedChat.status).toBe(200);
    expect(await json(retrievedChat)).toMatchObject({
      id: chat.id,
      object: "chat.completion",
      choices: [
        {
          message: { role: "assistant", content: expect.stringContaining("hello stored chat") },
          finish_reason: "stop"
        }
      ]
    });

    const chatMessages = await harness.app.handle(
      new Request(`http://localhost/v1/chat/completions/${String(chat.id)}/messages`, {
        headers: { authorization: `Bearer ${apiKey.token}` }
      })
    );
    expect(chatMessages.status).toBe(200);
    expect(await chatMessages.json()).toMatchObject({
      object: "list",
      data: [{ role: "user", content: expect.stringContaining("hello stored chat") }],
      has_more: false
    });

    const completionResponse = await harness.app.handle(
      new Request("http://localhost/v1/completions", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ model: profile.id, prompt: "hello legacy completion" })
      })
    );
    expect(completionResponse.status).toBe(200);
    expect(await json(completionResponse)).toMatchObject({
      object: "text_completion",
      model: profile.id,
      choices: [{ text: expect.stringContaining("hello legacy completion"), finish_reason: "stop" }]
    });
  });

  it("uses OpenAI-shaped errors for compatibility failures and unsupported families", async () => {
    const cookie = await harness.login();
    const apiKey = await harness.createApiKey(cookie, { name: "openai-error-key" });

    const unauthenticated = await harness.app.handle(new Request("http://localhost/v1/models"));
    expect(unauthenticated.status).toBe(401);
    expect(await json(unauthenticated)).toMatchObject({
      error: {
        type: "invalid_request_error",
        code: "auth_failed",
        param: null
      }
    });

    const missingModel = await harness.app.handle(
      new Request("http://localhost/v1/models/missing-model", {
        headers: { authorization: `Bearer ${apiKey.token}` }
      })
    );
    expect(missingModel.status).toBe(404);
    expect(await json(missingModel)).toMatchObject({
      error: {
        type: "invalid_request_error",
        code: "profile_not_found",
        param: "model"
      }
    });

    const unsupported = await harness.app.handle(
      new Request("http://localhost/v1/embeddings", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey.token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({ model: "text-embedding-3-small", input: "hello" })
      })
    );
    expect(unsupported.status).toBe(501);
    expect(await json(unsupported)).toMatchObject({
      error: {
        type: "invalid_request_error",
        code: "unsupported_endpoint",
        param: null
      }
    });

    for (const endpoint of [
      "/v1/conversations",
      "/v1/evals",
      "/v1/realtime/sessions",
      "/v1/videos",
      "/v1/skills",
      "/v1/chatkit/threads",
      "/v1/organization/projects"
    ]) {
      const unsupportedFamily = await harness.app.handle(
        new Request(`http://localhost${endpoint}`, {
          method: "POST",
          headers: { authorization: `Bearer ${apiKey.token}` }
        })
      );
      expect(unsupportedFamily.status).toBe(501);
      expect(await json(unsupportedFamily)).toMatchObject({
        error: {
          type: "invalid_request_error",
          code: "unsupported_endpoint",
          param: null
        }
      });
    }
  });

  it("supports Cherry Studio style model discovery preflight and detection", async () => {
    const cookie = await harness.login();
    const profile = await harness.createMockProfile(cookie, "mock-cherry");
    const apiKey = await harness.createApiKey(cookie, { name: "cherry-key" });

    const preflight = await harness.app.handle(
      new Request("http://localhost/v1/models", {
        method: "OPTIONS",
        headers: {
          origin: "app://cherry-studio",
          "access-control-request-method": "GET",
          "access-control-request-headers": "authorization,content-type"
        }
      })
    );
    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-origin")).toBe("*");
    expect(preflight.headers.get("access-control-allow-methods")).toContain("GET");
    expect(preflight.headers.get("access-control-allow-headers")).toContain("authorization");

    const modelsResponse = await harness.app.handle(
      new Request("http://localhost/v1/models", {
        headers: {
          authorization: `Bearer ${apiKey.token}`,
          origin: "app://cherry-studio"
        }
      })
    );
    expect(modelsResponse.status).toBe(200);
    expect(modelsResponse.headers.get("access-control-allow-origin")).toBe("*");
    expect(await modelsResponse.json()).toMatchObject({
      object: "list",
      data: [
        {
          id: profile.id,
          object: "model",
          created: expect.any(Number),
          owned_by: "cli2api",
          permission: [],
          permissions: []
        }
      ]
    });

    const detectionResponse = await harness.app.handle(
      new Request("http://localhost/v1/chat/completions", {
        method: "POST",
        headers: {
          authorization: `Bearer ${apiKey.token}`,
          "content-type": "application/json",
          origin: "app://cherry-studio"
        },
        body: JSON.stringify({
          model: profile.id,
          messages: [{ role: "user", content: "ping" }]
        })
      })
    );
    expect(detectionResponse.status).toBe(200);
    expect(detectionResponse.headers.get("access-control-allow-origin")).toBe("*");
    expect(await detectionResponse.json()).toMatchObject({
      object: "chat.completion",
      created: expect.any(Number),
      model: profile.id,
      choices: [{ message: { role: "assistant", content: expect.any(String) } }]
    });
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

  it("force deletes a used API key together with its run, event, usage, and session history", async () => {
    const cookie = await harness.login();
    const profile = await harness.createMockProfile(cookie, "mock-force-delete");
    const key = await harness.createApiKey(cookie, { name: "force-delete-key" });

    const runResponse = await harness.app.handle(
      new Request("http://localhost/api/runs", {
        method: "POST",
        headers: {
          authorization: `Bearer ${key.token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({ prompt: "delete all history", profileId: profile.id })
      })
    );
    expect(runResponse.status).toBe(200);
    const run = (await runResponse.json()) as { id: string };
    const keyRecord = harness.services.apiKeys.list().find((entry) => entry.keyPrefix === key.token.slice(0, 14));
    expect(keyRecord).toBeTruthy();

    harness.database.db
      .insert(upstreamRunSessions)
      .values({
        id: "session-force-delete",
        apiKeyId: String(keyRecord?.id),
        profileId: profile.id,
        userId: "default",
        sessionId: "default",
        upstreamInstanceId: "inst-force-delete",
        runCount: 1,
        createdAt: 1,
        updatedAt: 1,
        lastUsedAt: 1
      })
      .run();

    const safeDelete = await harness.app.handle(
      new Request(`http://localhost/api/admin/api-keys/${String(keyRecord?.id)}`, {
        method: "DELETE",
        headers: { cookie }
      })
    );
    expect(safeDelete.status).toBe(409);

    const forceDelete = await harness.app.handle(
      new Request(`http://localhost/api/admin/api-keys/${String(keyRecord?.id)}?force=true`, {
        method: "DELETE",
        headers: { cookie }
      })
    );
    expect(forceDelete.status).toBe(200);
    expect(harness.database.db.select().from(apiKeys).where(eq(apiKeys.id, String(keyRecord?.id))).all()).toHaveLength(0);
    expect(harness.database.db.select().from(runs).where(eq(runs.apiKeyId, String(keyRecord?.id))).all()).toHaveLength(0);
    expect(harness.database.db.select().from(runEvents).where(eq(runEvents.runId, run.id)).all()).toHaveLength(0);
    expect(harness.database.db.select().from(usageBuckets).where(eq(usageBuckets.apiKeyId, String(keyRecord?.id))).all()).toHaveLength(0);
    expect(
      harness.database.db.select().from(upstreamRunSessions).where(eq(upstreamRunSessions.apiKeyId, String(keyRecord?.id))).all()
    ).toHaveLength(0);
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
