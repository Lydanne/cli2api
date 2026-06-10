import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

    const eventsResponse = await harness.app.handle(
      new Request(`http://localhost/api/runs/${String(run.id)}/events`, {
        headers: { authorization: `Bearer ${apiKey.token}` }
      })
    );
    expect(eventsResponse.status).toBe(200);
    const events = (await eventsResponse.json()) as Array<Record<string, unknown>>;
    expect(events.some((event) => event.type === "run.completed")).toBe(true);
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
