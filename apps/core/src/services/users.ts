import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { ErrorCode, createCli2ApiError } from "@cli2api/shared";
import type { CoreDatabase } from "../db/client.js";
import { apiKeys, users } from "../db/schema.js";
import { hashPassword, verifyPassword } from "../security/passwords.js";

/** User row shape returned by admin services. */
export type UserRow = typeof users.$inferSelect;

/** Service that manages admin users and password verification. */
export class UserService {
  /** Creates a user service. */
  public constructor(private readonly database: CoreDatabase) {}

  /** Creates an admin user with a hashed password. */
  public createAdmin(email: string, password: string): UserRow {
    const now = Date.now();
    const row = {
      id: randomUUID(),
      email,
      passwordHash: hashPassword(password),
      role: "admin",
      disabledAt: null,
      createdAt: now,
      updatedAt: now
    };
    this.database.db.insert(users).values(row).run();
    return row;
  }

  /** Changes an existing user's password. */
  public resetPassword(email: string, password: string): void {
    const now = Date.now();
    this.database.db
      .update(users)
      .set({ passwordHash: hashPassword(password), updatedAt: now })
      .where(eq(users.email, email))
      .run();
  }

  /** Verifies login credentials, bootstrapping the first admin when no users exist. */
  public verifyLogin(email: string, password: string): UserRow {
    const normalizedEmail = email.trim();
    if (!this.hasAnyUser()) {
      if (!normalizedEmail || !password) {
        throw createCli2ApiError(ErrorCode.AUTH_FAILED, "Invalid email or password", 401);
      }
      return this.createAdmin(normalizedEmail, password);
    }

    const user = this.database.db.select().from(users).where(eq(users.email, normalizedEmail)).get();
    if (!user || user.disabledAt || !verifyPassword(password, user.passwordHash)) {
      throw createCli2ApiError(ErrorCode.AUTH_FAILED, "Invalid email or password", 401);
    }
    return user;
  }

  /** Lists users for the management dashboard. */
  public list(): UserRow[] {
    return this.database.db.select().from(users).all();
  }

  /** Deletes an admin user when it is not the current or last active admin. */
  public delete(id: string, currentUserId: string): UserRow {
    const user = this.database.db.select().from(users).where(eq(users.id, id)).get();
    if (!user) {
      throw createCli2ApiError(ErrorCode.INVALID_REQUEST, `User not found: ${id}`, 404);
    }
    if (id === currentUserId) {
      throw createCli2ApiError(ErrorCode.INVALID_REQUEST, "Cannot delete the current admin user", 409);
    }
    const activeAdmins = this.database.db
      .select()
      .from(users)
      .all()
      .filter((entry) => entry.role === "admin" && !entry.disabledAt);
    if (activeAdmins.length <= 1) {
      throw createCli2ApiError(ErrorCode.INVALID_REQUEST, "Cannot delete the last active admin user", 409);
    }
    const hasApiKeys = this.database.db
      .select({ id: apiKeys.id })
      .from(apiKeys)
      .where(eq(apiKeys.userId, id))
      .limit(1)
      .get();
    if (hasApiKeys) {
      throw createCli2ApiError(ErrorCode.INVALID_REQUEST, "User owns API keys and cannot be deleted", 409);
    }
    this.database.db.delete(users).where(eq(users.id, id)).run();
    return user;
  }

  private hasAnyUser(): boolean {
    return Boolean(this.database.db.select({ id: users.id }).from(users).limit(1).get());
  }
}
