import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { ErrorCode, createCli2ApiError } from "@cli2api/shared";
import type { CoreDatabase } from "../db/client.js";
import { sessions, users } from "../db/schema.js";
import type { UserRow } from "./users.js";

const sessionTtlMs = 7 * 24 * 60 * 60 * 1000;

/** Service that manages cookie-backed admin sessions. */
export class SessionService {
  /** Creates a session service. */
  public constructor(private readonly database: CoreDatabase) {}

  /** Creates a session token for a user id. */
  public create(userId: string): string {
    const token = randomUUID();
    this.database.db
      .insert(sessions)
      .values({
        id: token,
        userId,
        expiresAt: Date.now() + sessionTtlMs,
        createdAt: Date.now()
      })
      .run();
    return token;
  }

  /** Resolves a session token to an enabled user or throws an auth error. */
  public requireUser(token: string | null): UserRow {
    if (!token) {
      throw createCli2ApiError(ErrorCode.AUTH_FAILED, "Missing admin session", 401);
    }
    const session = this.database.db.select().from(sessions).where(eq(sessions.id, token)).get();
    if (!session || session.expiresAt < Date.now()) {
      throw createCli2ApiError(ErrorCode.AUTH_FAILED, "Invalid admin session", 401);
    }
    const user = this.database.db.select().from(users).where(eq(users.id, session.userId)).get();
    if (!user || user.disabledAt) {
      throw createCli2ApiError(ErrorCode.AUTH_FAILED, "Invalid admin session", 401);
    }
    return user;
  }
}

/** Reads the `cli2api_session` value from a Cookie header. */
export function readSessionCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) {
    return null;
  }
  const match = cookieHeader.match(/(?:^|;\s*)cli2api_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/** Builds a Set-Cookie header for an admin session token. */
export function createSessionCookie(token: string): string {
  return `cli2api_session=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax`;
}
