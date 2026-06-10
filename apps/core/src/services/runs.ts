import { randomUUID } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import {
  ErrorCode,
  createCli2ApiError,
  normalizeUsage,
  parseJsonObject,
  stringifyJson,
  type AgentEvent,
  type AgentUsage,
  type CreateRunRequest,
  type RunResponse
} from "@cli2api/shared";
import type { AdapterRegistry } from "@cli2api/agents-sdk";
import type { CoreDatabase } from "../db/client.js";
import { runEvents, runs } from "../db/schema.js";
import type { ApiKeyRow } from "./api-keys.js";
import { ProfileService } from "./profiles.js";
import { QuotaService } from "./quotas.js";

/** Service that creates runs, executes adapters, and persists events. */
export class RunService {
  /** Creates a run service. */
  public constructor(
    private readonly database: CoreDatabase,
    private readonly profiles: ProfileService,
    private readonly quotas: QuotaService,
    private readonly adapters: AdapterRegistry
  ) {}

  /** Creates and executes a run synchronously for MVP API flows. */
  public async createAndExecute(key: ApiKeyRow, request: CreateRunRequest): Promise<RunResponse> {
    if (!request.prompt || typeof request.prompt !== "string") {
      throw createCli2ApiError(ErrorCode.INVALID_REQUEST, "prompt is required", 400);
    }
    const profile = this.profiles.resolve(request.profileId);
    this.quotas.assertAllowed(key);

    const runId = randomUUID();
    const startedAt = Date.now();
    this.database.db
      .insert(runs)
      .values({
        id: runId,
        apiKeyId: key.id,
        profileId: profile.id,
        status: "running",
        prompt: request.prompt,
        output: null,
        errorCode: null,
        errorMessage: null,
        usageJson: stringifyJson(normalizeUsage(undefined)),
        createdAt: startedAt,
        completedAt: null,
        durationMs: null
      })
      .run();

    this.quotas.start(key.id);
    let output = "";
    let usage: AgentUsage = normalizeUsage(undefined);
    let seq = 0;

    try {
      const adapter = this.adapters.get(profile.type);
      for await (const event of adapter.run({ runId, prompt: request.prompt, profile })) {
        this.storeEvent(runId, seq++, event);
        if (event.type === "output.delta") {
          output += event.delta;
        }
        if (event.type === "usage.updated" || event.type === "run.completed") {
          usage = normalizeUsage(event.usage);
        }
        if (event.type === "run.failed") {
          throw createCli2ApiError(event.code as ErrorCode, event.message, 500);
        }
      }

      const completedAt = Date.now();
      this.database.db
        .update(runs)
        .set({
          status: "completed",
          output,
          usageJson: stringifyJson(usage),
          completedAt,
          durationMs: completedAt - startedAt
        })
        .where(eq(runs.id, runId))
        .run();
      this.quotas.complete(key.id, usage);
      return this.require(runId);
    } catch (error) {
      const failed = error instanceof Error ? error : new Error("Run failed");
      const code = "code" in failed ? String(failed.code) : ErrorCode.RUN_FAILED;
      const completedAt = Date.now();
      this.database.db
        .update(runs)
        .set({
          status: "failed",
          output,
          errorCode: code,
          errorMessage: failed.message,
          usageJson: stringifyJson(usage),
          completedAt,
          durationMs: completedAt - startedAt
        })
        .where(eq(runs.id, runId))
        .run();
      this.quotas.complete(key.id, usage);
      throw createCli2ApiError(code as ErrorCode, failed.message, 500);
    }
  }

  /** Returns one public run response by id. */
  public require(runId: string): RunResponse {
    const row = this.database.db.select().from(runs).where(eq(runs.id, runId)).get();
    if (!row) {
      throw createCli2ApiError(ErrorCode.INVALID_REQUEST, `Run not found: ${runId}`, 404);
    }
    return {
      id: row.id,
      profileId: row.profileId,
      status: row.status as RunResponse["status"],
      prompt: row.prompt,
      output: row.output,
      errorCode: row.errorCode,
      errorMessage: row.errorMessage,
      usage: normalizeUsage(parseJsonObject(row.usageJson, {}))
    };
  }

  /** Lists recent runs for the management dashboard. */
  public list(): RunResponse[] {
    return this.database.db
      .select()
      .from(runs)
      .orderBy(asc(runs.createdAt))
      .all()
      .map((row) => this.require(row.id));
  }

  /** Returns normalized stored events for a run. */
  public events(runId: string): AgentEvent[] {
    return this.database.db
      .select()
      .from(runEvents)
      .where(eq(runEvents.runId, runId))
      .orderBy(asc(runEvents.seq))
      .all()
      .map((row) => parseJsonObject(row.payloadJson, { type: row.type, runId }) as AgentEvent);
  }

  private storeEvent(runId: string, seq: number, event: AgentEvent): void {
    this.database.db
      .insert(runEvents)
      .values({
        id: randomUUID(),
        runId,
        seq,
        type: event.type,
        payloadJson: stringifyJson(event),
        createdAt: Date.now()
      })
      .run();
  }
}
