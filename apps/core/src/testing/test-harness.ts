import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Elysia } from "elysia";
import { MockAgentAdapter, type AgentProvider } from "@cli2api/agents-sdk";
import { createApp } from "../app.js";
import { openCoreDatabase, type CoreDatabase } from "../db/client.js";
import { migrateDatabase } from "../db/migrate.js";
import { createServices, type Services } from "../services/index.js";

/** Test harness returned to core integration tests. */
export interface TestHarness {
  /** Elysia app under test. */
  app: Elysia;
  /** Core database handle. */
  database: CoreDatabase;
  /** Runtime services. */
  services: Services;
  /** Base directory for service-owned runtime workspaces. */
  runtimeWorkspaceBase: string;
  /** Logs into the seeded admin and returns a Cookie header. */
  login: () => Promise<string>;
  /** Creates a deterministic mock profile through the admin API. */
  createMockProfile: (cookie: string, id: string) => Promise<{ id: string }>;
  /** Creates an API key through the admin API. */
  createApiKey: (cookie: string, input: Record<string, unknown>) => Promise<{ token: string }>;
  /** Closes database resources and removes temp files. */
  close: () => Promise<void>;
}

/** Creates an isolated core app with a temporary SQLite database. */
export async function createTestHarness(): Promise<TestHarness> {
  const dir = await mkdtemp(join(tmpdir(), "cli2api-core-"));
  const database = openCoreDatabase(join(dir, "test.sqlite"));
  migrateDatabase(database);
  const runtimeWorkspaceBase = join(dir, "runtime-workspaces");
  const services = createServices(database, {
    homeDir: dir,
    runtimeWorkspaceBase,
    agentProviders: [new MockAgentAdapter(), createFakeCodexProvider()]
  });
  services.users.createAdmin("admin@example.com", "password");
  const app = createApp({ database, services });

  return {
    app,
    database,
    services,
    runtimeWorkspaceBase,
    login: async () => {
      const response = await app.handle(
        new Request("http://localhost/api/admin/login", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: "admin@example.com", password: "password" })
        })
      );
      const cookie = response.headers.get("set-cookie");
      if (!cookie) {
        throw new Error("login did not return a session cookie");
      }
      return cookie;
    },
    createMockProfile: async (cookie, id) => {
      const response = await app.handle(
        new Request("http://localhost/api/admin/profiles", {
          method: "POST",
          headers: { cookie, "content-type": "application/json" },
          body: JSON.stringify({
            id,
            type: "mock",
            name: id,
            cwd: process.cwd(),
            enabled: true
          })
        })
      );
      if (response.status !== 200) {
        throw new Error(await response.text());
      }
      return (await response.json()) as { id: string };
    },
    createApiKey: async (cookie, input) => {
      const response = await app.handle(
        new Request("http://localhost/api/admin/api-keys", {
          method: "POST",
          headers: { cookie, "content-type": "application/json" },
          body: JSON.stringify(input)
        })
      );
      if (response.status !== 200) {
        throw new Error(await response.text());
      }
      return (await response.json()) as { token: string };
    },
    close: async () => {
      database.sqlite.close();
      await rm(dir, { recursive: true, force: true });
    }
  };
}

function createFakeCodexProvider(): AgentProvider {
  return {
    type: "codex",
    run: async function* (input) {
      yield { type: "run.started", runId: input.runId };
      yield { type: "run.completed", runId: input.runId, output: "" };
    },
    listModels: () => [
      {
        id: "gpt-5.5",
        name: "GPT-5.5",
        type: "codex",
        source: "codex",
        config: { model: "gpt-5.5" }
      },
      {
        id: "gpt-5.4",
        name: "GPT-5.4",
        type: "codex",
        source: "codex",
        config: { model: "gpt-5.4" }
      },
      {
        id: "gpt-5.4-mini",
        name: "GPT-5.4-Mini",
        type: "codex",
        source: "codex",
        config: { model: "gpt-5.4-mini" }
      }
    ]
  };
}
