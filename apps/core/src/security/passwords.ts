import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

const iterations = 120_000;
const keyLength = 32;
const digest = "sha256";

/** Hashes an admin password using PBKDF2. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(password, salt, iterations, keyLength, digest).toString("hex");
  return `pbkdf2:${iterations}:${salt}:${hash}`;
}

/** Verifies a plaintext password against a stored PBKDF2 hash. */
export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, iterationText, salt, expected] = stored.split(":");
  if (scheme !== "pbkdf2" || !iterationText || !salt || !expected) {
    return false;
  }
  const actual = pbkdf2Sync(password, salt, Number(iterationText), keyLength, digest);
  const expectedBuffer = Buffer.from(expected, "hex");
  return expectedBuffer.length === actual.length && timingSafeEqual(expectedBuffer, actual);
}
