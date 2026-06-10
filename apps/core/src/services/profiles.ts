import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  ErrorCode,
  createCli2ApiError,
  parseJsonObject,
  stringifyJson,
  type AdapterProfile
} from "@cli2api/shared";
import type { AgentModelDefinition } from "@cli2api/agents-sdk";
import type { CoreDatabase } from "../db/client.js";
import { adapterProfiles, runs, upstreamRouteBindings } from "../db/schema.js";
import type { RuntimeWorkspaceService } from "./runtime-workspaces.js";

/** Adapter profile creation input accepted by admin APIs and CLI. */
export type CreateProfileInput = Omit<AdapterProfile, "enabled" | "cwd" | "sandbox" | "approvalPolicy"> &
  Partial<Pick<AdapterProfile, "cwd" | "sandbox" | "approvalPolicy">> & { enabled?: boolean };

/** Result returned after importing SDK model catalog entries as profiles. */
export interface ImportAgentModelsResult {
  /** Profiles created from missing model catalog entries. */
  created: AdapterProfile[];
  /** Catalog entries skipped because their profile id already exists. */
  skipped: AgentModelDefinition[];
}

/** Service that manages upstream adapter profiles. */
export class ProfileService {
  /** Creates a profile service. */
  public constructor(
    private readonly database: CoreDatabase,
    private readonly runtimeWorkspaces: RuntimeWorkspaceService
  ) {}

  /** Creates an adapter profile. */
  public create(input: CreateProfileInput): AdapterProfile {
    const now = Date.now();
    const id = input.id || randomUUID();
    this.database.db
      .insert(adapterProfiles)
      .values({
        id,
        type: input.type,
        name: input.name,
        cwd: this.runtimeWorkspaces.profileWorkspace(id),
        enabled: input.enabled === false ? 0 : 1,
        sandbox: "read-only",
        approvalPolicy: "never",
        envJson: stringifyJson(input.env ?? {}),
        configJson: stringifyJson(input.config ?? {}),
        createdAt: now,
        updatedAt: now
      })
      .run();
    return this.require(id);
  }

  /** Returns all adapter profiles. */
  public list(includeDisabled = true): AdapterProfile[] {
    const rows = this.database.db.select().from(adapterProfiles).all();
    return rows.map((row) => this.toRuntimeProfile(row)).filter((profile) => includeDisabled || profile.enabled);
  }

  /** Imports missing agent model catalog entries as enabled profiles. */
  public importAgentModels(models: readonly AgentModelDefinition[]): ImportAgentModelsResult {
    const created: AdapterProfile[] = [];
    const skipped: AgentModelDefinition[] = [];
    for (const model of models) {
      const existing = this.database.db
        .select({ id: adapterProfiles.id })
        .from(adapterProfiles)
        .where(eq(adapterProfiles.id, model.id))
        .get();
      if (existing) {
        skipped.push({ ...model, config: { ...model.config } });
        continue;
      }
      created.push(
        this.create({
          id: model.id,
          type: model.type,
          name: model.name,
          enabled: true,
          config: model.config
        })
      );
    }
    return { created, skipped };
  }

  /** Resolves an enabled profile by id or throws a stable error. */
  public require(id: string): AdapterProfile {
    const row = this.database.db
      .select()
      .from(adapterProfiles)
      .where(eq(adapterProfiles.id, id))
      .get();
    if (!row || row.enabled !== 1) {
      throw createCli2ApiError(ErrorCode.PROFILE_NOT_FOUND, `Profile not found: ${id}`, 404);
    }
    return this.toRuntimeProfile(row);
  }

  /** Resolves the requested profile or the first enabled profile. */
  public resolve(id?: string): AdapterProfile {
    if (id) {
      return this.require(id);
    }
    const first = this.list(false)[0];
    if (!first) {
      throw createCli2ApiError(ErrorCode.PROFILE_NOT_FOUND, "No enabled adapter profiles", 404);
    }
    return first;
  }

  /** Deletes an unused adapter profile and its route bindings. */
  public delete(id: string): AdapterProfile {
    const row = this.database.db
      .select()
      .from(adapterProfiles)
      .where(eq(adapterProfiles.id, id))
      .get();
    if (!row) {
      throw createCli2ApiError(ErrorCode.PROFILE_NOT_FOUND, `Profile not found: ${id}`, 404);
    }
    const hasRunHistory = this.database.db
      .select({ id: runs.id })
      .from(runs)
      .where(eq(runs.profileId, id))
      .limit(1)
      .get();
    if (hasRunHistory) {
      throw createCli2ApiError(ErrorCode.INVALID_REQUEST, "Profile has run history; disable it instead", 409);
    }
    this.database.db.delete(upstreamRouteBindings).where(eq(upstreamRouteBindings.profileId, id)).run();
    this.database.db.delete(adapterProfiles).where(eq(adapterProfiles.id, id)).run();
    return this.toRuntimeProfile(row);
  }

  private toRuntimeProfile(row: typeof adapterProfiles.$inferSelect): AdapterProfile {
    return {
      ...toProfile(row),
      cwd: this.runtimeWorkspaces.profileWorkspace(row.id),
      sandbox: "read-only",
      approvalPolicy: "never"
    };
  }
}

function toProfile(row: typeof adapterProfiles.$inferSelect): AdapterProfile {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    cwd: row.cwd,
    enabled: row.enabled === 1,
    sandbox: row.sandbox as AdapterProfile["sandbox"],
    approvalPolicy: row.approvalPolicy as AdapterProfile["approvalPolicy"],
    env: parseJsonObject(row.envJson, {}),
    config: parseJsonObject(row.configJson, {})
  };
}
