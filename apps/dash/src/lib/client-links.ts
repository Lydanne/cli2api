/** Builds the downstream OpenAI-compatible base URL for this dashboard origin. */
export function buildClientBaseUrl(origin = browserOrigin()): string {
  const normalizedOrigin = origin.trim().replace(/\/+$/u, "");
  return normalizedOrigin ? `${normalizedOrigin}/v1` : "/v1";
}

function browserOrigin(): string {
  return typeof window === "undefined" ? "" : window.location.origin;
}
