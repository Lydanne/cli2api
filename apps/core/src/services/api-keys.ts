import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { ErrorCode, createCli2ApiError } from "@cli2api/shared";
import type { CoreDatabase } from "../db/client.js";
import { apiKeys, runEvents, runs, upstreamRunSessions, usageBuckets } from "../db/schema.js";
import { generateToken, hashToken, tokenPrefix, verifyToken } from "../security/tokens.js";

/** API key quota options accepted by admin APIs and CLI. */
export interface ApiKeyQuotaInput {
  /** Maximum active runs for this key. */
  maxConcurrentRuns?: number;
  /** Request-per-minute limit. */
  rpmLimit?: number;
  /** Daily run limit. */
  dailyRunLimit?: number;
  /** Monthly token limit. */
  monthlyTokenLimit?: number;
}

/** API key creation payload. */
export interface CreateApiKeyInput extends ApiKeyQuotaInput {
  /** Owner user id. */
  userId: string;
  /** Operator-facing API key name. */
  name: string;
}

/** API key row shape. */
export type ApiKeyRow = typeof apiKeys.$inferSelect;

/** API key row returned once with plaintext token. */
export interface CreatedApiKey {
  /** Stored API key record. */
  record: ApiKeyRow;
  /** Plaintext token shown once to the operator. */
  token: string;
}

/** Service that creates, revokes, and authenticates downstream API keys. */
export class ApiKeyService {
  /** Creates an API key service. */
  public constructor(private readonly database: CoreDatabase) {}

  /** Creates an API key and returns the plaintext token once. */
  public create(input: CreateApiKeyInput): CreatedApiKey {
    const token = generateToken("c2a");
    const now = Date.now();
    const record = {
      id: randomUUID(),
      userId: input.userId,
      name: input.name,
      keyPrefix: tokenPrefix(token),
      keyHash: hashToken(token),
      enabled: 1,
      maxConcurrentRuns: input.maxConcurrentRuns ?? 2,
      rpmLimit: input.rpmLimit ?? 60,
      dailyRunLimit: input.dailyRunLimit ?? 1000,
      monthlyTokenLimit: input.monthlyTokenLimit ?? 1000000,
      createdAt: now,
      revokedAt: null
    };
    this.database.db.insert(apiKeys).values(record).run();
    return { record, token };
  }

  /** Authenticates a bearer token against hashed API keys. */
  public authenticate(token: string | null): ApiKeyRow {
    if (!token) {
      throw createCli2ApiError(ErrorCode.AUTH_FAILED, "Missing bearer token", 401);
    }
    const prefix = tokenPrefix(token);
    const candidates = this.database.db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.keyPrefix, prefix))
      .all();
    const key = candidates.find((candidate) => verifyToken(token, candidate.keyHash));
    if (!key || key.enabled !== 1 || key.revokedAt) {
      throw createCli2ApiError(ErrorCode.AUTH_FAILED, "Invalid API key", 401);
    }
    return key;
  }

  /** Revokes an API key by id. */
  public revoke(id: string): void {
    this.database.db
      .update(apiKeys)
      .set({ enabled: 0, revokedAt: Date.now() })
      .where(eq(apiKeys.id, id))
      .run();
  }

  /** Deletes an API key, optionally removing its dependent history first. */
  public delete(id: string, options: { force?: boolean } = {}): void {
    const key = this.database.db.select().from(apiKeys).where(eq(apiKeys.id, id)).get();
    if (!key) {
      throw createCli2ApiError(ErrorCode.INVALID_REQUEST, `API key not found: ${id}`, 404);
    }
    if (options.force) {
      this.forceDelete(id);
      return;
    }
    const hasRunHistory = this.database.db
      .select({ id: runs.id })
      .from(runs)
      .where(eq(runs.apiKeyId, id))
      .limit(1)
      .get();
    const hasUsage = this.database.db
      .select({ id: usageBuckets.id })
      .from(usageBuckets)
      .where(eq(usageBuckets.apiKeyId, id))
      .limit(1)
      .get();
    if (hasRunHistory || hasUsage) {
      throw createCli2ApiError(ErrorCode.INVALID_REQUEST, "API key has usage history; revoke it instead", 409);
    }
    this.database.db.delete(apiKeys).where(eq(apiKeys.id, id)).run();
  }

  // Delete dependent history in child-to-parent order so SQLite never leaves orphaned rows.
  private forceDelete(id: string): void {
    this.database.sqlite
      .transaction(() => {
        const ownedRunIds = this.database.db.select({ id: runs.id }).from(runs).where(eq(runs.apiKeyId, id)).all();
        if (ownedRunIds.length > 0) {
          this.database.db.delete(runEvents).where(inArray(runEvents.runId, ownedRunIds.map((run) => run.id))).run();
        }
        this.database.db.delete(runs).where(eq(runs.apiKeyId, id)).run();
        this.database.db.delete(usageBuckets).where(eq(usageBuckets.apiKeyId, id)).run();
        this.database.db.delete(upstreamRunSessions).where(eq(upstreamRunSessions.apiKeyId, id)).run();
        this.database.db.delete(apiKeys).where(eq(apiKeys.id, id)).run();
      })();
  }

  /** Lists API key records without plaintext tokens. */
  public list(): ApiKeyRow[] {
    return this.database.db.select().from(apiKeys).all();
  }
}
