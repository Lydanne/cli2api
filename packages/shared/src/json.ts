/** Parses a JSON object and returns a fallback for invalid or non-object input. */
export function parseJsonObject<T extends Record<string, unknown>>(value: unknown, fallback: T): T {
  if (typeof value !== "string") {
    return fallback;
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as T;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

/** Serializes a JSON-compatible value for SQLite text columns. */
export function stringifyJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}
