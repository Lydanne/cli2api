import { access, readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { Elysia } from "elysia";
import { listAgentModels } from "@cli2api/agents-sdk";
import type { OpenAiModel } from "@cli2api/shared";
import type { CoreDatabase } from "./db/client.js";
import { errorResponse, jsonResponse, sseResponse } from "./http/responses.js";
import { requireAdmin, requireApiKey } from "./http/auth.js";
import { chatPrompt, responsesPrompt, toChatPayload, toResponsesPayload } from "./http/compat.js";
import { createServices, type Services } from "./services/index.js";
import { createSessionCookie } from "./services/sessions.js";

/** Runtime context used to construct the Elysia application. */
export interface AppContext {
  /** Core database handle. */
  database: CoreDatabase;
  /** Optional prebuilt services, mainly for tests. */
  services?: Services;
}

/** Creates the cli2api Elysia application. */
export function createApp(context: AppContext) {
  const services = context.services ?? createServices(context.database);

  return new Elysia()
    .get("/api/health", () => ({ ok: true, service: "cli2api-core" }))
    .get("/", async () => serveDashboardFile("index.html"))
    .get("/assets/:file", async ({ params }) => serveDashboardFile(`assets/${params.file}`))
    .post("/api/admin/login", async ({ request }) => {
      try {
        const body = (await request.json()) as { email?: string; password?: string };
        const user = services.users.verifyLogin(String(body.email ?? ""), String(body.password ?? ""));
        const token = services.sessions.create(user.id);
        return jsonResponse(
          { user: { id: user.id, email: user.email, role: user.role } },
          200,
          { "set-cookie": createSessionCookie(token) }
        );
      } catch (error) {
        return errorResponse(error);
      }
    })
    .get("/api/admin/users", ({ request }) => {
      try {
        requireAdmin(services, request);
        return services.users.list().map((user) => ({
          id: user.id,
          email: user.email,
          role: user.role,
          disabledAt: user.disabledAt
        }));
      } catch (error) {
        return errorResponse(error);
      }
    })
    .post("/api/admin/users", async ({ request }) => {
      try {
        requireAdmin(services, request);
        const body = (await request.json()) as { email?: string; password?: string };
        const user = services.users.createAdmin(String(body.email), String(body.password));
        return jsonResponse({ id: user.id, email: user.email, role: user.role });
      } catch (error) {
        return errorResponse(error);
      }
    })
    .delete("/api/admin/users/:id", ({ params, request }) => {
      try {
        const currentUser = requireAdmin(services, request);
        const user = services.users.delete(params.id, currentUser.id);
        return jsonResponse({ id: user.id, email: user.email, role: user.role, disabledAt: user.disabledAt });
      } catch (error) {
        return errorResponse(error);
      }
    })
    .get("/api/admin/profiles", ({ request }) => {
      try {
        requireAdmin(services, request);
        return services.profiles.list();
      } catch (error) {
        return errorResponse(error);
      }
    })
    .get("/api/admin/agent-models", ({ request }) => {
      try {
        requireAdmin(services, request);
        return listAgentModels();
      } catch (error) {
        return errorResponse(error);
      }
    })
    .post("/api/admin/profiles/import-agent-models", ({ request }) => {
      try {
        requireAdmin(services, request);
        return jsonResponse(services.profiles.importAgentModels(listAgentModels()));
      } catch (error) {
        return errorResponse(error);
      }
    })
    .post("/api/admin/profiles", async ({ request }) => {
      try {
        requireAdmin(services, request);
        const body = (await request.json()) as Parameters<typeof services.profiles.create>[0];
        return jsonResponse(services.profiles.create(body));
      } catch (error) {
        return errorResponse(error);
      }
    })
    .delete("/api/admin/profiles/:id", ({ params, request }) => {
      try {
        requireAdmin(services, request);
        return jsonResponse(services.profiles.delete(params.id));
      } catch (error) {
        return errorResponse(error);
      }
    })
    .get("/api/admin/upstream/accounts", ({ request }) => {
      try {
        requireAdmin(services, request);
        return services.upstream.listAccounts();
      } catch (error) {
        return errorResponse(error);
      }
    })
    .post("/api/admin/upstream/accounts", async ({ request }) => {
      try {
        requireAdmin(services, request);
        const body = (await request.json()) as Parameters<typeof services.upstream.createAccount>[0];
        return jsonResponse(services.upstream.createAccount(body));
      } catch (error) {
        return errorResponse(error);
      }
    })
    .delete("/api/admin/upstream/accounts/:id", ({ params, request }) => {
      try {
        requireAdmin(services, request);
        return jsonResponse(services.upstream.deleteAccount(params.id));
      } catch (error) {
        return errorResponse(error);
      }
    })
    .post("/api/admin/upstream/accounts/:id/auth/start", async ({ params, request }) => {
      try {
        requireAdmin(services, request);
        const body = (await request.json()) as Parameters<typeof services.upstream.startAuth>[1];
        return jsonResponse(await services.upstream.startAuth(params.id, body));
      } catch (error) {
        return errorResponse(error);
      }
    })
    .get("/api/admin/upstream/accounts/:id/auth/status", async ({ params, request }) => {
      try {
        requireAdmin(services, request);
        return jsonResponse(await services.upstream.pollAuthStatus(params.id));
      } catch (error) {
        return errorResponse(error);
      }
    })
    .post("/api/admin/upstream/accounts/:id/logout", async ({ params, request }) => {
      try {
        requireAdmin(services, request);
        return jsonResponse(await services.upstream.logoutAccount(params.id));
      } catch (error) {
        return errorResponse(error);
      }
    })
    .post("/api/admin/upstream/auth-sessions/:id/cancel", ({ params, request }) => {
      try {
        requireAdmin(services, request);
        return jsonResponse(services.upstream.cancelAuthSession(params.id));
      } catch (error) {
        return errorResponse(error);
      }
    })
    .get("/api/admin/upstream/instances", ({ request }) => {
      try {
        requireAdmin(services, request);
        return services.upstream.listInstances();
      } catch (error) {
        return errorResponse(error);
      }
    })
    .post("/api/admin/upstream/instances", async ({ request }) => {
      try {
        requireAdmin(services, request);
        const body = (await request.json()) as Parameters<typeof services.upstream.createInstance>[0];
        return jsonResponse(services.upstream.createInstance(body));
      } catch (error) {
        return errorResponse(error);
      }
    })
    .patch("/api/admin/upstream/instances/:id", async ({ params, request }) => {
      try {
        requireAdmin(services, request);
        const body = (await request.json()) as Parameters<typeof services.upstream.updateInstance>[1];
        return jsonResponse(services.upstream.updateInstance(params.id, body));
      } catch (error) {
        return errorResponse(error);
      }
    })
    .post("/api/admin/upstream/instances/:id/disable", ({ params, request }) => {
      try {
        requireAdmin(services, request);
        return jsonResponse(services.upstream.disableInstance(params.id));
      } catch (error) {
        return errorResponse(error);
      }
    })
    .delete("/api/admin/upstream/instances/:id", ({ params, request }) => {
      try {
        requireAdmin(services, request);
        return jsonResponse(services.upstream.deleteInstance(params.id));
      } catch (error) {
        return errorResponse(error);
      }
    })
    .get("/api/admin/upstream/routes", ({ request }) => {
      try {
        requireAdmin(services, request);
        return services.upstream.listRouteBindings();
      } catch (error) {
        return errorResponse(error);
      }
    })
    .post("/api/admin/upstream/routes", async ({ request }) => {
      try {
        requireAdmin(services, request);
        const body = (await request.json()) as Parameters<typeof services.upstream.createRouteBinding>[0];
        return jsonResponse(services.upstream.createRouteBinding(body));
      } catch (error) {
        return errorResponse(error);
      }
    })
    .delete("/api/admin/upstream/routes/:id", ({ params, request }) => {
      try {
        requireAdmin(services, request);
        return jsonResponse(services.upstream.deleteRouteBinding(params.id));
      } catch (error) {
        return errorResponse(error);
      }
    })
    .get("/api/admin/api-keys", ({ request }) => {
      try {
        requireAdmin(services, request);
        return services.apiKeys.list().map((key) => ({ ...key, keyHash: undefined }));
      } catch (error) {
        return errorResponse(error);
      }
    })
    .post("/api/admin/api-keys", async ({ request }) => {
      try {
        const user = requireAdmin(services, request);
        const body = (await request.json()) as {
          userId?: string;
          name?: string;
          maxConcurrentRuns?: number;
          rpmLimit?: number;
          dailyRunLimit?: number;
          monthlyTokenLimit?: number;
        };
        const created = services.apiKeys.create({
          userId: body.userId ?? user.id,
          name: String(body.name ?? "API Key"),
          maxConcurrentRuns: body.maxConcurrentRuns,
          rpmLimit: body.rpmLimit,
          dailyRunLimit: body.dailyRunLimit,
          monthlyTokenLimit: body.monthlyTokenLimit
        });
        return jsonResponse({ ...created.record, keyHash: undefined, token: created.token });
      } catch (error) {
        return errorResponse(error);
      }
    })
    .post("/api/admin/api-keys/:id/revoke", ({ params, request }) => {
      try {
        requireAdmin(services, request);
        services.apiKeys.revoke(params.id);
        return { ok: true };
      } catch (error) {
        return errorResponse(error);
      }
    })
    .delete("/api/admin/api-keys/:id", ({ params, request }) => {
      try {
        requireAdmin(services, request);
        services.apiKeys.delete(params.id);
        return { ok: true };
      } catch (error) {
        return errorResponse(error);
      }
    })
    .get("/api/admin/usage", ({ request }) => {
      try {
        requireAdmin(services, request);
        return services.quotas.listUsage();
      } catch (error) {
        return errorResponse(error);
      }
    })
    .get("/api/admin/runs", ({ request }) => {
      try {
        requireAdmin(services, request);
        return services.runs.list();
      } catch (error) {
        return errorResponse(error);
      }
    })
    .get("/api/admin/runs/:id/events", ({ params, request }) => {
      try {
        requireAdmin(services, request);
        return services.runs.events(params.id);
      } catch (error) {
        return errorResponse(error);
      }
    })
    .post("/api/runs", async ({ request }) => {
      try {
        const key = requireApiKey(services, request);
        const body = (await request.json()) as { prompt?: string; profileId?: string; metadata?: Record<string, unknown> };
        return jsonResponse(
          await services.runs.createAndExecute(key, {
            prompt: String(body.prompt ?? ""),
            profileId: body.profileId,
            metadata: body.metadata
          })
        );
      } catch (error) {
        return errorResponse(error);
      }
    })
    .get("/api/runs/:id", ({ params, request }) => {
      try {
        const key = requireApiKey(services, request);
        return services.runs.requireForKey(params.id, key.id);
      } catch (error) {
        return errorResponse(error);
      }
    })
    .get("/api/runs/:id/events", ({ params, request }) => {
      try {
        const key = requireApiKey(services, request);
        const events = services.runs.eventsForKey(params.id, key.id);
        return request.headers.get("accept")?.includes("text/event-stream") ? sseResponse(events) : events;
      } catch (error) {
        return errorResponse(error);
      }
    })
    .get("/v1/models", ({ request }) => {
      try {
        requireApiKey(services, request);
        const data: OpenAiModel[] = services.profiles
          .list(false)
          .map((profile) => ({ object: "model", id: profile.id, owned_by: "cli2api" }));
        return { object: "list", data };
      } catch (error) {
        return errorResponse(error);
      }
    })
    .post("/v1/responses", async ({ request }) => {
      try {
        const key = requireApiKey(services, request);
        const body = (await request.json()) as { model?: string; input?: unknown; stream?: boolean };
        const run = await services.runs.createAndExecute(key, {
          prompt: responsesPrompt(body.input),
          profileId: body.model
        });
        return body.stream ? sseResponse([{ type: "response.output_text.delta", delta: run.output ?? "" }]) : toResponsesPayload(run);
      } catch (error) {
        return errorResponse(error);
      }
    })
    .post("/v1/chat/completions", async ({ request }) => {
      try {
        const key = requireApiKey(services, request);
        const body = (await request.json()) as { model?: string; messages?: unknown; stream?: boolean };
        const run = await services.runs.createAndExecute(key, {
          prompt: chatPrompt(body.messages),
          profileId: body.model
        });
        return body.stream ? sseResponse([{ choices: [{ delta: { content: run.output ?? "" } }] }]) : toChatPayload(run);
      } catch (error) {
        return errorResponse(error);
      }
    });
}

/** Elysia application type consumed by Eden Treaty clients. */
export type App = ReturnType<typeof createApp>;

async function serveDashboardFile(relativePath: string): Promise<Response> {
  for (const root of dashboardRoots()) {
    const path = resolve(root, relativePath);
    if (!isInsideRoot(root, path)) {
      return new Response("Not found", { status: 404 });
    }

    try {
      await access(path);
      return new Response(await readFile(path), {
        headers: { "content-type": contentType(path) }
      });
    } catch {
      continue;
    }
  }

  return new Response("Dashboard is not built. Run pnpm --filter @cli2api/dash build.", {
    status: 404
  });
}

function dashboardRoots(): string[] {
  if (process.env.CLI2API_DASH_DIST) {
    return [resolve(process.env.CLI2API_DASH_DIST)];
  }

  const cwd = process.cwd();
  // Support both repo-root commands and package-scoped pnpm filter commands.
  return [resolve(cwd, "apps/dash/dist"), resolve(cwd, "../../apps/dash/dist")];
}

function isInsideRoot(root: string, path: string): boolean {
  const normalizedRoot = root.endsWith(sep) ? root : `${root}${sep}`;
  return path === root || path.startsWith(normalizedRoot);
}

function contentType(path: string): string {
  switch (extname(path)) {
    case ".html":
      return "text/html; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".js":
      return "text/javascript; charset=utf-8";
    default:
      return "application/octet-stream";
  }
}
