import { randomUUID } from "node:crypto";
import { normalizeUsage, type AgentUsage } from "@cli2api/shared";
import { ErrorCode, createCli2ApiError } from "@cli2api/shared";
import type { CoreDatabase } from "../db/client.js";
import type { ApiKeyRow } from "./api-keys.js";

/** Single-process quota service for API key limits. */
export class QuotaService {
  private readonly activeRuns = new Map<string, number>();

  /** Creates a quota service. */
  public constructor(private readonly database: CoreDatabase) {}

  /** Verifies an API key is allowed to start another run. */
  public assertAllowed(key: ApiKeyRow): void {
    const active = this.activeRuns.get(key.id) ?? 0;
    if (active >= key.maxConcurrentRuns) {
      throw createCli2ApiError(ErrorCode.QUOTA_EXCEEDED, "Concurrent run limit exceeded", 429, {
        limit: "maxConcurrentRuns"
      });
    }
    if (this.countRunsSince(key.id, Date.now() - 60_000) >= key.rpmLimit) {
      throw createCli2ApiError(ErrorCode.RATE_LIMITED, "Request per minute limit exceeded", 429, {
        limit: "rpmLimit"
      });
    }
    if (this.countRunsSince(key.id, startOfUtcDay()) >= key.dailyRunLimit) {
      throw createCli2ApiError(ErrorCode.QUOTA_EXCEEDED, "Daily run limit exceeded", 429, {
        limit: "dailyRunLimit"
      });
    }
    if (this.monthlyTokens(key.id) >= key.monthlyTokenLimit) {
      throw createCli2ApiError(ErrorCode.QUOTA_EXCEEDED, "Monthly token limit exceeded", 429, {
        limit: "monthlyTokenLimit"
      });
    }
  }

  /** Marks a run as active for concurrency checks. */
  public start(keyId: string): void {
    this.activeRuns.set(keyId, (this.activeRuns.get(keyId) ?? 0) + 1);
  }

  /** Clears active run accounting and updates usage buckets. */
  public complete(keyId: string, usage: Partial<AgentUsage>): void {
    const active = Math.max(0, (this.activeRuns.get(keyId) ?? 1) - 1);
    this.activeRuns.set(keyId, active);
    this.addUsage(keyId, "day", utcDayKey(), usage);
    this.addUsage(keyId, "month", utcMonthKey(), usage);
  }

  private countRunsSince(keyId: string, since: number): number {
    const row = this.database.sqlite
      .prepare("SELECT COUNT(*) AS count FROM runs WHERE api_key_id = ? AND created_at >= ?")
      .get(keyId, since) as { count: number };
    return row.count;
  }

  private monthlyTokens(keyId: string): number {
    const row = this.database.sqlite
      .prepare(
        "SELECT total_tokens AS totalTokens FROM usage_buckets WHERE api_key_id = ? AND bucket_type = 'month' AND bucket_key = ?"
      )
      .get(keyId, utcMonthKey()) as { totalTokens?: number } | undefined;
    return row?.totalTokens ?? 0;
  }

  private addUsage(keyId: string, bucketType: string, bucketKey: string, usageInput: Partial<AgentUsage>): void {
    const usage = normalizeUsage(usageInput);
    this.database.sqlite
      .prepare(
        `INSERT INTO usage_buckets (
          id, api_key_id, bucket_type, bucket_key, run_count, input_tokens, output_tokens, total_tokens, updated_at
        ) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)
        ON CONFLICT(api_key_id, bucket_type, bucket_key)
        DO UPDATE SET
          run_count = run_count + 1,
          input_tokens = input_tokens + excluded.input_tokens,
          output_tokens = output_tokens + excluded.output_tokens,
          total_tokens = total_tokens + excluded.total_tokens,
          updated_at = excluded.updated_at`
      )
      .run(
        randomUUID(),
        keyId,
        bucketType,
        bucketKey,
        usage.inputTokens,
        usage.outputTokens,
        usage.totalTokens,
        Date.now()
      );
  }
}

function startOfUtcDay(): number {
  const now = new Date();
  return Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
}

function utcDayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function utcMonthKey(): string {
  return new Date().toISOString().slice(0, 7);
}
