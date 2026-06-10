import { randomUUID } from "node:crypto";
import { isAbsolute, relative, resolve } from "node:path";
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
  type UpstreamInstanceResponse
} from "@cli2api/shared";
import { asc, eq } from "drizzle-orm";
import type { CoreDatabase } from "../db/client.js";
import { upstreamAccounts, upstreamAuthSessions, upstreamInstances } from "../db/schema.js";

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
  /** Fixed working directory. */
  cwd: string;
  /** Whether the scheduler may select this instance. */
  enabled?: boolean;
  /** Maximum concurrent runs. */
  maxConcurrentRuns?: number;
  /** Optional sandbox policy. */
  sandbox?: UpstreamInstanceResponse["sandbox"];
  /** Optional approval policy. */
  approvalPolicy?: UpstreamInstanceResponse["approvalPolicy"];
  /** Adapter-specific non-secret config. */
  config?: Record<string, unknown>;
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
    private readonly authHomeBase: string
  ) {
    this.providers = new Map(authProviders.map((provider) => [provider.type, provider]));
  }

  /** Creates an upstream account. */
  public createAccount(input: CreateUpstreamAccountInput): UpstreamAccountResponse {
    const provider = this.requireProvider(input.providerType);
    const id = input.id ?? randomUUID();
    assertSafeId(id);
    const now = Date.now();
    const row = {
      id,
      providerType: provider.type,
      name: input.name,
      authState: "pending",
      authHome: this.resolveAuthHome(id, input.authHome),
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
    const session = await provider.checkRuntime({
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
      cwd: input.cwd,
      enabled: input.enabled === false ? 0 : 1,
      healthState: "unknown",
      currentRuns: 0,
      maxConcurrentRuns: input.maxConcurrentRuns ?? 1,
      sandbox: input.sandbox ?? null,
      approvalPolicy: input.approvalPolicy ?? null,
      configJson: stringifyJson(input.config ?? {}),
      lastError: null,
      createdAt: now,
      updatedAt: now
    };
    this.database.db.insert(upstreamInstances).values(row).run();
    return toInstance(row);
  }

  /** Lists runnable upstream instances. */
  public listInstances(): UpstreamInstanceResponse[] {
    return this.database.db
      .select()
      .from(upstreamInstances)
      .orderBy(asc(upstreamInstances.createdAt))
      .all()
      .map(toInstance);
  }

  /** Selects and occupies an upstream instance matching a profile, if any exist. */
  public selectForProfile(profile: AdapterProfile): UpstreamSelection | null {
    const matchingInstances = this.listInstances().filter((instance) => instance.type === profile.type && instance.enabled);
    if (matchingInstances.length === 0) {
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
    if (pathFromBase.startsWith("..") || isAbsolute(pathFromBase)) {
      throw createCli2ApiError(ErrorCode.INVALID_REQUEST, "authHome must be inside the configured auth home base", 400);
    }
    return candidate;
  }
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
