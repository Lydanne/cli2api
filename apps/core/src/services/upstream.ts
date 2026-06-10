import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";
import type { AgentAuthProvider, AuthSession } from "@cli2api/agents-sdk";
import {
  type AdapterProfile,
  ErrorCode,
  createCli2ApiError,
  parseJsonObject,
  stringifyJson,
  type UpstreamAccountResponse,
  type UpstreamAuthSessionResponse,
  type UpstreamAuthState,
  type UpstreamHealthState,
  type UpstreamInstanceResponse,
  type UpstreamRouteBindingResponse
} from "@cli2api/shared";
import { asc, eq } from "drizzle-orm";
import type { CoreDatabase } from "../db/client.js";
import {
  adapterProfiles,
  upstreamAccounts,
  upstreamAuthSessions,
  upstreamInstances,
  upstreamRouteBindings,
  runs
} from "../db/schema.js";
import type { RuntimeWorkspaceService } from "./runtime-workspaces.js";

const legacyContainerAuthHomeBase = "/data/codex-homes";

/** Upstream account creation payload accepted by admin APIs. */
export interface CreateUpstreamAccountInput {
  /** Optional stable account id. */
  id?: string;
  /** Upstream provider type, such as `codex`. */
  providerType: string;
  /** Operator-facing display name. */
  name: string;
  /** Optional operator-managed auth home override. */
  authHome?: string;
}

/** Upstream auth start payload accepted by admin APIs. */
export interface StartUpstreamAuthInput {
  /** Auth method. The first dashboard flow uses Codex device auth. */
  method: "device";
}

/** Upstream instance creation payload accepted by admin APIs. */
export interface CreateUpstreamInstanceInput {
  /** Optional stable instance id. */
  id?: string;
  /** Account id bound to this instance. */
  accountId: string;
  /** Adapter implementation type. */
  type: string;
  /** Operator-facing display name. */
  name: string;
  /** Legacy working directory value. Ignored because model serving owns runtime workspaces. */
  cwd?: string;
  /** Whether the scheduler may select this instance. */
  enabled?: boolean;
  /** Maximum concurrent runs. */
  maxConcurrentRuns?: number;
  /** Legacy sandbox policy value. Ignored because model serving forces safe defaults. */
  sandbox?: UpstreamInstanceResponse["sandbox"];
  /** Legacy approval policy value. Ignored because model serving forces safe defaults. */
  approvalPolicy?: UpstreamInstanceResponse["approvalPolicy"];
  /** Adapter-specific non-secret config. */
  config?: Record<string, unknown>;
}

/** Upstream instance update payload accepted by admin APIs. */
export interface UpdateUpstreamInstanceInput {
  /** Operator-facing display name. */
  name?: string;
  /** Legacy working directory value. Ignored because model serving owns runtime workspaces. */
  cwd?: string;
  /** Whether the scheduler may select this instance. */
  enabled?: boolean;
  /** Current health state. */
  healthState?: UpstreamHealthState;
  /** Maximum concurrent runs. */
  maxConcurrentRuns?: number;
  /** Optional sandbox policy. Ignored because model serving forces safe defaults. */
  sandbox?: UpstreamInstanceResponse["sandbox"];
  /** Optional approval policy. Ignored because model serving forces safe defaults. */
  approvalPolicy?: UpstreamInstanceResponse["approvalPolicy"];
  /** Adapter-specific non-secret config. */
  config?: Record<string, unknown>;
  /** Last non-secret error. */
  lastError?: string | null;
}

/** Explicit route binding creation payload accepted by admin APIs. */
export interface CreateUpstreamRouteBindingInput {
  /** Public profile id selected by downstream clients. */
  profileId: string;
  /** Upstream instance id that should run this profile. */
  instanceId: string;
}

/** Runtime upstream selection returned to run execution. */
export interface UpstreamSelection {
  /** Selected upstream instance id. */
  instanceId: string;
  /** Adapter profile with instance-owned runtime settings applied. */
  profile: AdapterProfile;
}

/** Service that manages upstream accounts, auth sessions, and runnable instances. */
export class UpstreamService {
  private readonly providers: Map<string, AgentAuthProvider>;

  /** Creates an upstream account service. */
  public constructor(
    private readonly database: CoreDatabase,
    authProviders: AgentAuthProvider[],
    private readonly authHomeBase: string,
    private readonly runtimeWorkspaces: RuntimeWorkspaceService
  ) {
    this.providers = new Map(authProviders.map((provider) => [provider.type, provider]));
    this.alignLegacyContainerAuthHomes();
  }

  /** Creates an upstream account. */
  public createAccount(input: CreateUpstreamAccountInput): UpstreamAccountResponse {
    const provider = this.requireProvider(input.providerType);
    const id = input.id ?? randomUUID();
    assertSafeId(id);
    const now = Date.now();
    const authHome = this.resolveAuthHome(id, input.authHome);
    this.ensureAuthHome(authHome);
    const row = {
      id,
      providerType: provider.type,
      name: input.name,
      authState: "pending",
      authHome,
      disabledAt: null,
      lastAuthError: null,
      createdAt: now,
      updatedAt: now
    };
    this.database.db.insert(upstreamAccounts).values(row).run();
    return toAccount(row);
  }

  /** Lists upstream accounts. */
  public listAccounts(): UpstreamAccountResponse[] {
    return this.database.db
      .select()
      .from(upstreamAccounts)
      .orderBy(asc(upstreamAccounts.createdAt))
      .all()
      .map(toAccount);
  }

  /** Starts an upstream auth session for one account. */
  public async startAuth(accountId: string, input: StartUpstreamAuthInput): Promise<UpstreamAuthSessionResponse> {
    const account = this.requireAccount(accountId);
    const provider = this.requireProvider(account.providerType);
    this.ensureAuthHome(account.authHome);
    const session = await provider.startAuth({
      accountId: account.id,
      authHome: account.authHome,
      method: input.method
    });
    return this.persistAuthSession(session);
  }

  /** Polls runtime auth status and persists the result. */
  public async pollAuthStatus(accountId: string): Promise<UpstreamAuthSessionResponse> {
    const account = this.requireAccount(accountId);
    const provider = this.requireProvider(account.providerType);
    this.ensureAuthHome(account.authHome);
    const session = await provider.checkRuntime({
      accountId: account.id,
      authHome: account.authHome
    });
    return this.persistAuthSession(session);
  }

  /** Logs out one upstream account through its auth provider. */
  public async logoutAccount(accountId: string): Promise<UpstreamAuthSessionResponse> {
    const account = this.requireAccount(accountId);
    const provider = this.requireProvider(account.providerType);
    this.ensureAuthHome(account.authHome);
    const session = await provider.logout({
      accountId: account.id,
      authHome: account.authHome
    });
    return this.persistAuthSession(session);
  }

  /** Marks an auth session as canceled. */
  public cancelAuthSession(sessionId: string): UpstreamAuthSessionResponse {
    const row = this.database.db
      .select()
      .from(upstreamAuthSessions)
      .where(eq(upstreamAuthSessions.id, sessionId))
      .get();
    if (!row) {
      throw createCli2ApiError("UPSTREAM_NOT_FOUND" as ErrorCode, `Auth session not found: ${sessionId}`, 404);
    }
    const now = Date.now();
    this.database.db
      .update(upstreamAuthSessions)
      .set({ state: "canceled", updatedAt: now })
      .where(eq(upstreamAuthSessions.id, sessionId))
      .run();
    this.updateAccountAuthState(row.accountId, "canceled", null);
    return this.requireAuthSession(sessionId);
  }

  /** Creates a runnable upstream instance bound to one authenticated account. */
  public createInstance(input: CreateUpstreamInstanceInput): UpstreamInstanceResponse {
    const account = this.requireAccount(input.accountId);
    if (account.authState !== "authenticated") {
      throw createCli2ApiError("UPSTREAM_AUTH_FAILED" as ErrorCode, "Upstream account is not authenticated", 400);
    }
    const id = input.id ?? randomUUID();
    assertSafeId(id);
    const now = Date.now();
    const row = {
      id,
      accountId: account.id,
      type: input.type,
      name: input.name,
      cwd: this.runtimeWorkspaces.instanceWorkspace(id),
      enabled: input.enabled === false ? 0 : 1,
      healthState: "unknown",
      currentRuns: 0,
      maxConcurrentRuns: input.maxConcurrentRuns ?? 1,
      sandbox: "read-only",
      approvalPolicy: "never",
      configJson: stringifyJson(input.config ?? {}),
      lastError: null,
      createdAt: now,
      updatedAt: now
    };
    this.database.db.insert(upstreamInstances).values(row).run();
    return this.toRuntimeInstance(row);
  }

  /** Lists runnable upstream instances. */
  public listInstances(): UpstreamInstanceResponse[] {
    return this.database.db
      .select()
      .from(upstreamInstances)
      .orderBy(asc(upstreamInstances.createdAt))
      .all()
      .map((row) => this.toRuntimeInstance(row));
  }

  /** Updates one runnable upstream instance. */
  public updateInstance(instanceId: string, input: UpdateUpstreamInstanceInput): UpstreamInstanceResponse {
    this.requireInstance(instanceId);
    const update: Partial<typeof upstreamInstances.$inferInsert> = {
      updatedAt: Date.now()
    };
    if (input.name !== undefined) update.name = input.name;
    if (input.enabled !== undefined) {
      update.enabled = input.enabled ? 1 : 0;
      if (!input.enabled && input.healthState === undefined) {
        update.healthState = "disabled";
      }
    }
    if (input.healthState !== undefined) update.healthState = input.healthState;
    if (input.maxConcurrentRuns !== undefined) update.maxConcurrentRuns = input.maxConcurrentRuns;
    if (input.config !== undefined) update.configJson = stringifyJson(input.config);
    if (input.lastError !== undefined) update.lastError = input.lastError;

    this.database.db.update(upstreamInstances).set(update).where(eq(upstreamInstances.id, instanceId)).run();
    return this.requireInstance(instanceId);
  }

  /** Disables one runnable upstream instance. */
  public disableInstance(instanceId: string): UpstreamInstanceResponse {
    return this.updateInstance(instanceId, { enabled: false, healthState: "disabled" });
  }

  /** Deletes an unused runnable upstream instance and any route bindings pointing at it. */
  public deleteInstance(instanceId: string): UpstreamInstanceResponse {
    const instance = this.requireInstance(instanceId);
    if (instance.currentRuns > 0) {
      throw createCli2ApiError(ErrorCode.INVALID_REQUEST, "Upstream instance is currently running", 409);
    }
    const hasRunHistory = this.database.db
      .select({ id: runs.id })
      .from(runs)
      .where(eq(runs.upstreamInstanceId, instanceId))
      .limit(1)
      .get();
    if (hasRunHistory) {
      throw createCli2ApiError(ErrorCode.INVALID_REQUEST, "Upstream instance has run history; disable it instead", 409);
    }
    this.database.db.delete(upstreamRouteBindings).where(eq(upstreamRouteBindings.instanceId, instanceId)).run();
    this.database.db.delete(upstreamInstances).where(eq(upstreamInstances.id, instanceId)).run();
    return instance;
  }

  /** Deletes an upstream account that has no runnable instances. */
  public deleteAccount(accountId: string): UpstreamAccountResponse {
    const account = this.requireAccount(accountId);
    const hasInstances = this.database.db
      .select({ id: upstreamInstances.id })
      .from(upstreamInstances)
      .where(eq(upstreamInstances.accountId, accountId))
      .limit(1)
      .get();
    if (hasInstances) {
      throw createCli2ApiError(ErrorCode.INVALID_REQUEST, "Delete this account's executors first", 409);
    }
    this.database.db.delete(upstreamAuthSessions).where(eq(upstreamAuthSessions.accountId, accountId)).run();
    this.database.db.delete(upstreamAccounts).where(eq(upstreamAccounts.id, accountId)).run();
    return account;
  }

  /** Lists explicit profile-to-instance route bindings. */
  public listRouteBindings(): UpstreamRouteBindingResponse[] {
    return this.database.db
      .select()
      .from(upstreamRouteBindings)
      .orderBy(asc(upstreamRouteBindings.createdAt))
      .all()
      .map(toRouteBinding);
  }

  /** Creates one explicit profile-to-instance route binding. */
  public createRouteBinding(input: CreateUpstreamRouteBindingInput): UpstreamRouteBindingResponse {
    const profile = this.requireProfile(input.profileId);
    const instance = this.requireInstance(input.instanceId);
    if (profile.type !== instance.type) {
      throw createCli2ApiError(ErrorCode.INVALID_REQUEST, "route profile type must match instance type", 400);
    }
    const now = Date.now();
    const row = {
      id: randomUUID(),
      profileId: input.profileId,
      instanceId: input.instanceId,
      createdAt: now,
      updatedAt: now
    };
    this.database.db.insert(upstreamRouteBindings).values(row).run();
    return toRouteBinding(row);
  }

  /** Deletes one explicit profile-to-instance route binding. */
  public deleteRouteBinding(bindingId: string): UpstreamRouteBindingResponse {
    const row = this.database.db
      .select()
      .from(upstreamRouteBindings)
      .where(eq(upstreamRouteBindings.id, bindingId))
      .get();
    if (!row) {
      throw createCli2ApiError("UPSTREAM_NOT_FOUND" as ErrorCode, `Route binding not found: ${bindingId}`, 404);
    }
    this.database.db.delete(upstreamRouteBindings).where(eq(upstreamRouteBindings.id, bindingId)).run();
    return toRouteBinding(row);
  }

  /** Selects and occupies an upstream instance matching a profile, if any exist. */
  public selectForProfile(profile: AdapterProfile): UpstreamSelection | null {
    const routedInstanceIds = new Set(
      this.listRouteBindings()
        .filter((binding) => binding.profileId === profile.id)
        .map((binding) => binding.instanceId)
    );
    const matchingInstances = this.listInstances().filter(
      (instance) =>
        instance.type === profile.type &&
        instance.enabled &&
        (routedInstanceIds.size === 0 || routedInstanceIds.has(instance.id))
    );
    if (matchingInstances.length === 0) {
      if (routedInstanceIds.size > 0) {
        throw createCli2ApiError("UPSTREAM_UNAVAILABLE" as ErrorCode, "No available upstream instances", 503);
      }
      return null;
    }

    const candidates = matchingInstances
      .map((instance) => ({ instance, account: this.findAccount(instance.accountId) }))
      .filter(({ account }) => account?.authState === "authenticated" && !account.disabledAt)
      .filter(({ instance }) => ["unknown", "healthy"].includes(instance.healthState))
      .filter(({ instance }) => instance.currentRuns < instance.maxConcurrentRuns)
      .sort((left, right) => left.instance.currentRuns - right.instance.currentRuns || left.instance.id.localeCompare(right.instance.id));

    const selected = candidates[0];
    if (!selected?.account) {
      throw createCli2ApiError("UPSTREAM_UNAVAILABLE" as ErrorCode, "No available upstream instances", 503);
    }

    this.occupyInstance(selected.instance.id);
    return {
      instanceId: selected.instance.id,
      profile: {
        ...profile,
        type: selected.instance.type,
        name: selected.instance.name,
        cwd: selected.instance.cwd,
        sandbox: selected.instance.sandbox ?? profile.sandbox,
        approvalPolicy: selected.instance.approvalPolicy ?? profile.approvalPolicy,
        env: { ...profile.env, CODEX_HOME: selected.account.authHome },
        config: { ...profile.config, ...selected.instance.config }
      }
    };
  }

  /** Releases one occupied upstream instance after a run finishes. */
  public releaseInstance(instanceId: string): void {
    this.database.sqlite
      .prepare(
        `UPDATE upstream_instances
         SET current_runs = CASE WHEN current_runs > 0 THEN current_runs - 1 ELSE 0 END,
             updated_at = ?
         WHERE id = ?`
      )
      .run(Date.now(), instanceId);
  }

  private requireAccount(accountId: string): UpstreamAccountResponse {
    const row = this.database.db
      .select()
      .from(upstreamAccounts)
      .where(eq(upstreamAccounts.id, accountId))
      .get();
    if (!row) {
      throw createCli2ApiError("UPSTREAM_NOT_FOUND" as ErrorCode, `Upstream account not found: ${accountId}`, 404);
    }
    return toAccount(row);
  }

  private findAccount(accountId: string): UpstreamAccountResponse | null {
    const row = this.database.db
      .select()
      .from(upstreamAccounts)
      .where(eq(upstreamAccounts.id, accountId))
      .get();
    return row ? toAccount(row) : null;
  }

  private requireInstance(instanceId: string): UpstreamInstanceResponse {
    const row = this.database.db
      .select()
      .from(upstreamInstances)
      .where(eq(upstreamInstances.id, instanceId))
      .get();
    if (!row) {
      throw createCli2ApiError("UPSTREAM_NOT_FOUND" as ErrorCode, `Upstream instance not found: ${instanceId}`, 404);
    }
    return this.toRuntimeInstance(row);
  }

  private toRuntimeInstance(row: typeof upstreamInstances.$inferSelect): UpstreamInstanceResponse {
    return {
      ...toInstance(row),
      cwd: this.runtimeWorkspaces.instanceWorkspace(row.id),
      sandbox: "read-only",
      approvalPolicy: "never"
    };
  }

  private requireProfile(profileId: string): typeof adapterProfiles.$inferSelect {
    const row = this.database.db
      .select()
      .from(adapterProfiles)
      .where(eq(adapterProfiles.id, profileId))
      .get();
    if (!row || row.enabled !== 1) {
      throw createCli2ApiError(ErrorCode.PROFILE_NOT_FOUND, `Profile not found: ${profileId}`, 404);
    }
    return row;
  }

  private requireAuthSession(sessionId: string): UpstreamAuthSessionResponse {
    const row = this.database.db
      .select()
      .from(upstreamAuthSessions)
      .where(eq(upstreamAuthSessions.id, sessionId))
      .get();
    if (!row) {
      throw createCli2ApiError("UPSTREAM_NOT_FOUND" as ErrorCode, `Auth session not found: ${sessionId}`, 404);
    }
    return toAuthSession(row);
  }

  private requireProvider(providerType: string): AgentAuthProvider {
    const provider = this.providers.get(providerType);
    if (!provider) {
      throw createCli2ApiError(ErrorCode.ADAPTER_UNAVAILABLE, `No auth provider for type: ${providerType}`, 503);
    }
    return provider;
  }

  private persistAuthSession(session: AuthSession): UpstreamAuthSessionResponse {
    const now = Date.now();
    const existing = this.database.db
      .select()
      .from(upstreamAuthSessions)
      .where(eq(upstreamAuthSessions.id, session.id))
      .get();
    const row = {
      id: session.id,
      accountId: session.accountId,
      providerType: session.providerType,
      state: session.state,
      authUrl: session.authUrl ?? null,
      userCode: session.userCode ?? null,
      expiresAt: session.expiresAt ?? null,
      message: session.message ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    };
    if (existing) {
      this.database.db
        .update(upstreamAuthSessions)
        .set(row)
        .where(eq(upstreamAuthSessions.id, session.id))
        .run();
    } else {
      this.database.db.insert(upstreamAuthSessions).values(row).run();
    }
    this.updateAccountAuthState(session.accountId, session.state, session.state === "failed" ? session.message ?? null : null);
    return toAuthSession(row);
  }

  private updateAccountAuthState(accountId: string, state: UpstreamAuthState, error: string | null): void {
    this.database.db
      .update(upstreamAccounts)
      .set({ authState: state, lastAuthError: error, updatedAt: Date.now() })
      .where(eq(upstreamAccounts.id, accountId))
      .run();
  }

  private occupyInstance(instanceId: string): void {
    this.database.sqlite
      .prepare(
        `UPDATE upstream_instances
         SET current_runs = current_runs + 1,
             updated_at = ?
         WHERE id = ?`
      )
      .run(Date.now(), instanceId);
  }

  private resolveAuthHome(accountId: string, authHome?: string): string {
    const base = resolve(this.authHomeBase);
    const candidate = authHome
      ? resolve(isAbsolute(authHome) ? authHome : resolve(base, authHome))
      : resolve(base, accountId);
    const pathFromBase = relative(base, candidate);
    if (isPathOutsideBase(pathFromBase)) {
      throw createCli2ApiError(ErrorCode.INVALID_REQUEST, "authHome must be inside the configured auth home base", 400);
    }
    return candidate;
  }

  private ensureAuthHome(authHome: string): void {
    mkdirSync(authHome, { recursive: true });
  }

  private alignLegacyContainerAuthHomes(): void {
    const currentBase = resolve(this.authHomeBase);
    const legacyBase = resolve(legacyContainerAuthHomeBase);
    if (currentBase === legacyBase) {
      return;
    }

    const accounts = this.database.db
      .select({ id: upstreamAccounts.id, authHome: upstreamAccounts.authHome })
      .from(upstreamAccounts)
      .all();
    for (const account of accounts) {
      const legacyRelativePath = relative(legacyBase, resolve(account.authHome));
      if (isPathOutsideBase(legacyRelativePath)) {
        continue;
      }
      const nextAuthHome = resolve(currentBase, legacyRelativePath);
      if (nextAuthHome === account.authHome) {
        continue;
      }
      this.database.db
        .update(upstreamAccounts)
        .set({ authHome: nextAuthHome, updatedAt: Date.now() })
        .where(eq(upstreamAccounts.id, account.id))
        .run();
    }
  }
}

function isPathOutsideBase(pathFromBase: string): boolean {
  return pathFromBase === ".." || pathFromBase.startsWith(`..${sep}`) || isAbsolute(pathFromBase);
}

function assertSafeId(id: string): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]*$/u.test(id)) {
    throw createCli2ApiError(ErrorCode.INVALID_REQUEST, "id must contain only letters, numbers, dot, underscore, or dash", 400);
  }
}

function toAccount(row: typeof upstreamAccounts.$inferSelect): UpstreamAccountResponse {
  return {
    id: row.id,
    providerType: row.providerType,
    name: row.name,
    authState: row.authState as UpstreamAuthState,
    authHome: row.authHome,
    disabledAt: row.disabledAt,
    lastAuthError: row.lastAuthError,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function toAuthSession(row: typeof upstreamAuthSessions.$inferSelect): UpstreamAuthSessionResponse {
  return {
    id: row.id,
    accountId: row.accountId,
    providerType: row.providerType,
    state: row.state as UpstreamAuthState,
    authUrl: row.authUrl,
    userCode: row.userCode,
    expiresAt: row.expiresAt,
    message: row.message,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function toInstance(row: typeof upstreamInstances.$inferSelect): UpstreamInstanceResponse {
  return {
    id: row.id,
    accountId: row.accountId,
    type: row.type,
    name: row.name,
    cwd: row.cwd,
    enabled: row.enabled === 1,
    healthState: row.healthState as UpstreamHealthState,
    currentRuns: row.currentRuns,
    maxConcurrentRuns: row.maxConcurrentRuns,
    sandbox: row.sandbox as UpstreamInstanceResponse["sandbox"],
    approvalPolicy: row.approvalPolicy as UpstreamInstanceResponse["approvalPolicy"],
    config: parseJsonObject(row.configJson, {}),
    lastError: row.lastError,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}

function toRouteBinding(row: typeof upstreamRouteBindings.$inferSelect): UpstreamRouteBindingResponse {
  return {
    id: row.id,
    profileId: row.profileId,
    instanceId: row.instanceId,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt
  };
}
