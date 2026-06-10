import { describe, expect, it } from "vitest";
import { summarizeOverview } from "./overview";

describe("summarizeOverview", () => {
  it("builds operational counts from profiles, keys, and runs", () => {
    expect(
      summarizeOverview({
        profiles: [
          { id: "mock", enabled: true, type: "mock" },
          { id: "codex", enabled: false, type: "codex" }
        ],
        apiKeys: [{ enabled: 1 }, { enabled: 0 }],
        runs: [{ status: "completed" }, { status: "failed" }, { status: "running" }]
      })
    ).toEqual({
      enabledProfiles: 1,
      activeApiKeys: 1,
      runningRuns: 1,
      failedRuns: 1,
      completedRuns: 1
    });
  });
});
