import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { Elysia } from "elysia";
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
  const services = createServices(database);
  services.users.createAdmin("admin@example.com", "password");
  const app = createApp({ database, services });

  return {
    app,
    database,
    services,
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
