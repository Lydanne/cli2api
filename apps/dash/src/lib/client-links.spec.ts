import { describe, expect, it } from "vitest";
import { buildClientBaseUrl } from "./client-links";

describe("buildClientBaseUrl", () => {
  it("builds the same-origin OpenAI-compatible base URL", () => {
    expect(buildClientBaseUrl("http://127.0.0.1:4517")).toBe("http://127.0.0.1:4517/v1");
  });

  it("normalizes origins with trailing slashes", () => {
    expect(buildClientBaseUrl("https://cli2api.example.com/")).toBe("https://cli2api.example.com/v1");
  });
});
