import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  ErrorCode,
  createCli2ApiError,
  parseJsonObject,
  stringifyJson,
  type AdapterProfile
} from "@cli2api/shared";
import type { CoreDatabase } from "../db/client.js";
import { adapterProfiles } from "../db/schema.js";

/** Adapter profile creation input accepted by admin APIs and CLI. */
export type CreateProfileInput = Omit<AdapterProfile, "enabled"> & { enabled?: boolean };

/** Service that manages upstream adapter profiles. */
export class ProfileService {
  /** Creates a profile service. */
  public constructor(private readonly database: CoreDatabase) {}

  /** Creates an adapter profile. */
  public create(input: CreateProfileInput): AdapterProfile {
    const now = Date.now();
    this.database.db
      .insert(adapterProfiles)
      .values({
        id: input.id || randomUUID(),
        type: input.type,
        name: input.name,
        cwd: input.cwd,
        enabled: input.enabled === false ? 0 : 1,
        sandbox: input.sandbox ?? null,
        approvalPolicy: input.approvalPolicy ?? null,
        envJson: stringifyJson(input.env ?? {}),
        configJson: stringifyJson(input.config ?? {}),
        createdAt: now,
        updatedAt: now
      })
      .run();
    return this.require(input.id);
  }

  /** Returns all adapter profiles. */
  public list(includeDisabled = true): AdapterProfile[] {
    const rows = this.database.db.select().from(adapterProfiles).all();
    return rows.map(toProfile).filter((profile) => includeDisabled || profile.enabled);
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
    return toProfile(row);
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
