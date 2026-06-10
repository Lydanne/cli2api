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
  });
});
