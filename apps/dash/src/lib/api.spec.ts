import { describe, expect, it, vi } from "vitest";
import { ApiError, createDashboardApi, type DashboardTreaty } from "./api";

function treatyResponse<T>(data: T) {
  return {
    data,
    error: null,
    response: new Response(),
    status: 200,
    headers: {}
  };
}

function treatyError(status: number, value: unknown) {
  return {
    data: null,
    error: { status, value },
    response: new Response(null, { status }),
    status,
    headers: {}
  };
}

describe("dashboard Eden API facade", () => {
  it("creates an Eden Treaty client and returns admin users", async () => {
    const fakeClient = {
      api: {
        admin: {
          users: {
            get: vi.fn(async () =>
              treatyResponse([{ id: "user-1", email: "admin@example.com", role: "admin", disabledAt: null }])
            )
          }
        }
      }
    } as unknown as DashboardTreaty;
    const factory = vi.fn(() => fakeClient);

    const api = createDashboardApi("/control", factory);

    await expect(api.users()).resolves.toEqual([
      { id: "user-1", email: "admin@example.com", role: "admin", disabledAt: null }
    ]);
    expect(factory).toHaveBeenCalledWith("/control", {
      fetch: { credentials: "include" }
    });
    expect(fakeClient.api.admin.users.get).toHaveBeenCalledWith();
  });

  it("normalizes Eden errors to ApiError", async () => {
    const fakeClient = {
      api: {
        admin: {
          users: {
            get: vi.fn(async () =>
              treatyError(401, {
                error: { code: "AUTH_FAILED", message: "Missing admin session" }
              })
            )
          }
        }
      }
    } as unknown as DashboardTreaty;
    const api = createDashboardApi("", () => fakeClient);

    await expect(api.users()).rejects.toMatchObject({
      code: "AUTH_FAILED",
      message: "Missing admin session",
      status: 401
    });
    expect(ApiError).toBeDefined();
  });

  it("exposes admin run events, usage buckets, and API key revocation", async () => {
    const fakeClient = {
      api: {
        admin: {
          runs: vi.fn(() => ({
            events: {
              get: vi.fn(async () => treatyResponse([{ type: "run.completed", runId: "run-1" }]))
            }
          })),
          usage: {
            get: vi.fn(async () => treatyResponse([{ apiKeyId: "key-1", bucketType: "month", runCount: 1 }]))
          },
          "api-keys": vi.fn(() => ({
            delete: vi.fn(async () => treatyResponse({ ok: true })),
            revoke: {
              post: vi.fn(async () => treatyResponse({ ok: true }))
            }
          }))
        }
      }
    } as unknown as DashboardTreaty;
    const api = createDashboardApi("", () => fakeClient);

    await expect(api.runEvents("run-1")).resolves.toEqual([{ type: "run.completed", runId: "run-1" }]);
    await expect(api.usage()).resolves.toEqual([{ apiKeyId: "key-1", bucketType: "month", runCount: 1 }]);
    await expect(api.revokeApiKey("key-1")).resolves.toEqual({ ok: true });
    await expect(api.deleteApiKey("key-1")).resolves.toEqual({ ok: true });
  });

  it("exposes upstream account auth and instance APIs", async () => {
    const accountClient = Object.assign(
      vi.fn(() => ({
        delete: vi.fn(async () => treatyResponse({ id: "account-1", deleted: true })),
        auth: {
          start: {
            post: vi.fn(async () => treatyResponse({ id: "session-1", state: "waiting_for_browser" }))
          },
          status: {
            get: vi.fn(async () => treatyResponse({ id: "session-1", state: "authenticated" }))
          }
        },
        logout: {
          post: vi.fn(async () => treatyResponse({ id: "session-logout", state: "pending" }))
        }
      })),
      {
        get: vi.fn(async () => treatyResponse([{ id: "account-1", providerType: "codex", authState: "pending" }])),
        post: vi.fn(async () => treatyResponse({ id: "account-1", providerType: "codex", authState: "pending" }))
      }
    );
    const sessionClient = vi.fn(() => ({
      cancel: {
        post: vi.fn(async () => treatyResponse({ id: "session-1", state: "canceled" }))
      }
    }));
    const instancesClient = Object.assign(
      vi.fn(() => ({
        delete: vi.fn(async () => treatyResponse({ id: "instance-1", deleted: true })),
        patch: vi.fn(async () => treatyResponse({ id: "instance-1", name: "更新实例" })),
        disable: {
          post: vi.fn(async () => treatyResponse({ id: "instance-1", enabled: false }))
        }
      })),
      {
        get: vi.fn(async () => treatyResponse([{ id: "instance-1", accountId: "account-1" }])),
        post: vi.fn(async () => treatyResponse({ id: "instance-1", accountId: "account-1" }))
      }
    );
    const routesClient = Object.assign(
      vi.fn(() => ({
        delete: vi.fn(async () => treatyResponse({ id: "route-1", profileId: "profile-1" }))
      })),
      {
        get: vi.fn(async () => treatyResponse([{ id: "route-1", profileId: "profile-1", instanceId: "instance-1" }])),
        post: vi.fn(async () => treatyResponse({ id: "route-1", profileId: "profile-1", instanceId: "instance-1" }))
      }
    );
    const runSessionsClient = Object.assign(
      vi.fn(() => ({
        delete: vi.fn(async () => treatyResponse({ id: "session-1", userId: "learner-1" }))
      })),
      {
        get: vi.fn(async () => treatyResponse([{ id: "session-1", userId: "learner-1", sessionId: "chat-a" }]))
      }
    );
    const fakeClient = {
      api: {
        admin: {
          upstream: {
            accounts: accountClient,
            "auth-sessions": sessionClient,
            instances: instancesClient,
            routes: routesClient,
            "run-sessions": runSessionsClient
          }
        }
      }
    } as unknown as DashboardTreaty;
    const api = createDashboardApi("", () => fakeClient);

    await expect(api.upstreamAccounts()).resolves.toEqual([
      { id: "account-1", providerType: "codex", authState: "pending" }
    ]);
    await expect(api.createUpstreamAccount({ id: "account-1", providerType: "codex", name: "主账号" })).resolves.toMatchObject({
      id: "account-1"
    });
    await expect(api.startUpstreamAuth("account-1", { method: "device" })).resolves.toMatchObject({
      state: "waiting_for_browser"
    });
    await expect(api.pollUpstreamAuth("account-1")).resolves.toMatchObject({ state: "authenticated" });
    await expect(api.cancelUpstreamAuth("session-1")).resolves.toMatchObject({ state: "canceled" });
    await expect(
      api.createUpstreamInstance({
        id: "instance-1",
        accountId: "account-1",
        type: "mock",
        name: "实例 1",
        enabled: true,
        maxConcurrentRuns: 1
      })
    ).resolves.toMatchObject({ id: "instance-1" });
    await expect(api.upstreamInstances()).resolves.toEqual([{ id: "instance-1", accountId: "account-1" }]);
    await expect(api.logoutUpstreamAccount("account-1")).resolves.toMatchObject({ state: "pending" });
    await expect(api.deleteUpstreamAccount("account-1")).resolves.toMatchObject({ id: "account-1" });
    await expect(api.updateUpstreamInstance("instance-1", { name: "更新实例" })).resolves.toMatchObject({ name: "更新实例" });
    await expect(api.disableUpstreamInstance("instance-1")).resolves.toMatchObject({ enabled: false });
    await expect(api.deleteUpstreamInstance("instance-1")).resolves.toMatchObject({ id: "instance-1" });
    await expect(api.upstreamRoutes()).resolves.toEqual([{ id: "route-1", profileId: "profile-1", instanceId: "instance-1" }]);
    await expect(api.createUpstreamRoute({ profileId: "profile-1", instanceId: "instance-1" })).resolves.toMatchObject({
      id: "route-1"
    });
    await expect(api.deleteUpstreamRoute("route-1")).resolves.toMatchObject({ id: "route-1" });
    await expect(api.upstreamRunSessions()).resolves.toEqual([{ id: "session-1", userId: "learner-1", sessionId: "chat-a" }]);
    await expect(api.deleteUpstreamRunSession("session-1")).resolves.toMatchObject({ id: "session-1" });
  });

  it("creates and deletes admin users and profiles through the facade", async () => {
    const profilesClient = Object.assign(
      vi.fn(() => ({
        delete: vi.fn(async () => treatyResponse({ id: "profile-1", type: "mock" }))
      })),
      {
        get: vi.fn(async () => treatyResponse([])),
        post: vi.fn(async () => treatyResponse({ id: "profile-1", type: "mock" })),
        "import-agent-models": {
          post: vi.fn(async () =>
            treatyResponse({
              created: [{ id: "gpt-5.5", type: "codex", config: { model: "gpt-5.5" } }],
              skipped: []
            })
          )
        }
      }
    );
    const usersClient = Object.assign(
      vi.fn(() => ({
        delete: vi.fn(async () => treatyResponse({ id: "user-2", email: "ops@example.com", role: "admin" }))
      })),
      {
        get: vi.fn(async () => treatyResponse([])),
        post: vi.fn(async () => treatyResponse({ id: "user-2", email: "ops@example.com", role: "admin" }))
      }
    );
    const fakeClient = {
      api: {
        admin: {
          "agent-models": {
            get: vi.fn(async () => treatyResponse([{ id: "gpt-5.5", type: "codex", name: "GPT-5.5" }]))
          },
          profiles: profilesClient,
          users: usersClient
        }
      }
    } as unknown as DashboardTreaty;
    const api = createDashboardApi("", () => fakeClient);

    await expect(api.createUser({ email: "ops@example.com", password: "change-me" })).resolves.toMatchObject({
      email: "ops@example.com"
    });
    await expect(api.deleteUser("user-2")).resolves.toMatchObject({ id: "user-2" });
    await expect(api.createProfile({ id: "profile-1", type: "mock", name: "profile", enabled: true })).resolves.toMatchObject({
      id: "profile-1"
    });
    await expect(api.agentModels()).resolves.toEqual([{ id: "gpt-5.5", type: "codex", name: "GPT-5.5" }]);
    await expect(api.importAgentModels()).resolves.toMatchObject({
      created: [{ id: "gpt-5.5", type: "codex" }],
      skipped: []
    });
    await expect(api.deleteProfile("profile-1")).resolves.toMatchObject({ id: "profile-1" });
  });
});
