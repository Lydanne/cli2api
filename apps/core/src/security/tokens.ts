import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/** Generates an opaque random token with a cli2api prefix. */
export function generateToken(prefix: string): string {
  return `${prefix}_${randomBytes(24).toString("base64url")}`;
}

/** Hashes an API key or session token for database storage. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Compares a plaintext token against a stored hash. */
export function verifyToken(token: string, storedHash: string): boolean {
  const actual = Buffer.from(hashToken(token), "hex");
  const expected = Buffer.from(storedHash, "hex");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Extracts a stable non-secret prefix for operator display and lookup. */
export function tokenPrefix(token: string): string {
  return token.slice(0, 14);
}
