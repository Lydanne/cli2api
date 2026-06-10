import { describe, expect, it, vi } from "vitest";
import { ApiClient, ApiError } from "./api.js";

describe("dashboard ApiClient", () => {
  it("sends JSON requests and returns parsed responses", async () => {
    const fetcher = vi.fn(async () => Response.json({ ok: true }));
    const client = new ApiClient("/api", fetcher);

    await expect(client.post("/admin/profiles", { id: "mock" })).resolves.toEqual({ ok: true });
    expect(fetcher).toHaveBeenCalledWith("/api/admin/profiles", {
      method: "POST",
      credentials: "include",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: "mock" })
    });
  });

  it("throws stable API errors", async () => {
    const fetcher = vi.fn(async () =>
      Response.json({ error: { code: "AUTH_FAILED", message: "no" } }, { status: 401 })
    );
    const client = new ApiClient("/api", fetcher);

    await expect(client.get("/admin/users")).rejects.toMatchObject({
      code: "AUTH_FAILED",
      status: 401
    });
    expect(ApiError).toBeDefined();
  });

  it("keeps the default browser fetch bound to globalThis", async () => {
    const previous = globalThis.fetch;
    const calls: Array<RequestInfo | URL> = [];
    globalThis.fetch = function strictFetch(
      this: unknown,
      input: RequestInfo | URL,
      _init?: RequestInit
    ): Promise<Response> {
      if (this !== globalThis) {
        throw new TypeError("Illegal invocation");
      }
      calls.push(input);
      return Promise.resolve(Response.json({ ok: true }));
    } as typeof fetch;

    try {
      const client = new ApiClient("");
      await expect(client.get("/api/health")).resolves.toEqual({ ok: true });
      expect(calls).toEqual(["/api/health"]);
    } finally {
      globalThis.fetch = previous;
    }
  });
});
