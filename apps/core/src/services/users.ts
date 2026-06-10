import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { ErrorCode, createCli2ApiError } from "@cli2api/shared";
import type { CoreDatabase } from "../db/client.js";
import { users } from "../db/schema.js";
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

  /** Verifies login credentials and returns the matching user. */
  public verifyLogin(email: string, password: string): UserRow {
    const user = this.database.db.select().from(users).where(eq(users.email, email)).get();
    if (!user || user.disabledAt || !verifyPassword(password, user.passwordHash)) {
      throw createCli2ApiError(ErrorCode.AUTH_FAILED, "Invalid email or password", 401);
    }
    return user;
  }

  /** Lists users for the management dashboard. */
  public list(): UserRow[] {
    return this.database.db.select().from(users).all();
  }
}
