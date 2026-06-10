import { describe, expect, it } from "vitest";
import {
  ErrorCode,
  createCli2ApiError,
  isTerminalAgentEvent,
  normalizeUsage,
  parseJsonObject
} from "./index.js";

describe("@cli2api/shared contracts", () => {
  it("creates stable API errors with machine-readable codes", () => {
    const error = createCli2ApiError(ErrorCode.QUOTA_EXCEEDED, "Quota exceeded", 429, {
      limit: "dailyRuns"
    });

    expect(error.code).toBe("QUOTA_EXCEEDED");
    expect(error.status).toBe(429);
    expect(error.details).toEqual({ limit: "dailyRuns" });
  });

  it("recognizes terminal agent events", () => {
    expect(isTerminalAgentEvent({ type: "run.completed", runId: "run_1" })).toBe(true);
    expect(isTerminalAgentEvent({ type: "output.delta", runId: "run_1", delta: "hi" })).toBe(false);
  });

  it("normalizes missing usage fields to zero", () => {
    expect(normalizeUsage({ inputTokens: 3 })).toEqual({
      inputTokens: 3,
      outputTokens: 0,
      totalTokens: 3
    });
  });

  it("parses JSON objects with a fallback for invalid input", () => {
    expect(parseJsonObject("{\"ok\":true}", { ok: false })).toEqual({ ok: true });
    expect(parseJsonObject("[]", { ok: false })).toEqual({ ok: false });
    expect(parseJsonObject(null, { ok: false })).toEqual({ ok: false });
  });
});
