import type { AgentEvent } from "@cli2api/shared";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createDashboardState } from "./dashboard-state";
import { isLocale } from "./i18n";
import type {
  CreateApiKeyInput,
  CreateProfileInput,
  CreateRunInput,
  CreateUpstreamAccountInput,
  CreateUpstreamInstanceInput,
  CreateUpstreamRouteInput,
  DashboardApi,
  LoginInput,
  StartUpstreamAuthInput,
  UpdateUpstreamInstanceInput
} from "./api";
import type {
  AdapterProfileView,
  AdminUser,
  ApiKeyView,
  RunView,
  UpstreamAccountView,
  UpstreamAuthSessionView,
  UpstreamInstanceView,
  UpstreamRouteBindingView,
  UsageBucketView
} from "../types";

interface FakeResources {
  users: AdminUser[];
  profiles: AdapterProfileView[];
  keys: ApiKeyView[];
  runs: RunView[];
  usage: UsageBucketView[];
  accounts: UpstreamAccountView[];
  instances: UpstreamInstanceView[];
  routes: UpstreamRouteBindingView[];
  events: AgentEvent[];
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("dashboard state", () => {
  it("refreshes resources and derives product metrics", async () => {
    const { api, resources } = createFakeApi();
    seedResources(resources);
    const state = createDashboardState(api);

    await expect(state.refresh()).resolves.toBe(true);

    expect(state.summary.value).toMatchObject({
      activeApiKeys: 1,
      authenticatedAccounts: 1,
      availableInstances: 1,
      availableSlots: 2,
      completedRuns: 1,
      enabledProfiles: 1,
      failedRuns: 1,
      monthlyRuns: 2,
      monthlyTokens: 30,
      routedProfiles: 1,
      runningRuns: 1
    });
    expect(state.profileOptions.value[0]?.label).toContain("mock-main");
    expect(state.accountOptions.value[0]?.label).toBe("主账号");
    expect(state.instanceOptions.value[0]?.label).toContain("实例 1");
    expect(state.monthlyUsageByKey.value.get("key-1")?.totalTokens).toBe(30);
    expect(state.statusLabel("authenticated")).toBe("已认证");
    expect(state.statusSeverity("failed")).toBe("danger");
    expect(state.accountName("acct-1")).toBe("主账号");
    expect(state.instanceName("inst-1")).toBe("实例 1");
    expect(state.profileName("mock-main")).toBe("Mock Main");
  });

  it("runs the dashboard action flow through the API facade", async () => {
    const { api, resources } = createFakeApi();
    const state = createDashboardState(api);

    await expect(state.login()).resolves.toBe(true);
    expect(state.loggedIn.value).toBe(true);

    state.newProfileId.value = "mock-main";
    state.newProfileName.value = "Mock Main";
    await expect(state.createProfile()).resolves.toBe(true);
    expect(resources.profiles).toHaveLength(1);

    state.newAccountId.value = "acct-1";
    state.newAccountName.value = "主账号";
    await expect(state.createAccount()).resolves.toBe(true);
    await expect(state.startAuth(resources.accounts[0] as UpstreamAccountView)).resolves.toBe(true);
    expect(state.lastAuthSession.value?.userCode).toBe("E2E-1234");
    await expect(state.pollAuth(resources.accounts[0] as UpstreamAccountView)).resolves.toBe(true);
    expect(resources.accounts[0]?.authState).toBe("authenticated");

    state.newInstanceId.value = "inst-1";
    state.newInstanceName.value = "实例 1";
    state.selectedAccountId.value = "acct-1";
    state.newInstanceConcurrency.value = 2;
    await expect(state.createInstance()).resolves.toBe(true);
    expect(resources.instances[0]).toMatchObject({
      id: "inst-1",
      cwd: "/runtime/instances/inst-1",
      sandbox: "read-only",
      approvalPolicy: "never"
    });

    state.selectedRouteProfile.value = "mock-main";
    state.selectedRouteInstance.value = "inst-1";
    await expect(state.createRoute()).resolves.toBe(true);
    expect(resources.routes).toHaveLength(1);

    state.newKeyName.value = "dev";
    await expect(state.createKey()).resolves.toBe(true);
    expect(state.createdToken.value).toMatch(/^c2a_/u);
    expect(state.runToken.value).toBe(state.createdToken.value);

    state.selectedProfile.value = "mock-main";
    state.prompt.value = "hello";
    await expect(state.createRun()).resolves.toBe(true);
    expect(resources.runs[0]).toMatchObject({ prompt: "hello", status: "completed" });
    await expect(state.loadRunEvents(resources.runs[0] as RunView)).resolves.toBe(true);
    expect(state.formattedRunEvents.value).toContain("run.completed");

    await expect(state.revokeKey(resources.keys[0] as ApiKeyView)).resolves.toBe(true);
    expect(resources.keys[0]?.enabled).toBe(0);
    await expect(state.disableInstance(resources.instances[0] as UpstreamInstanceView)).resolves.toBe(true);
    expect(resources.instances[0]?.enabled).toBe(false);
    await expect(state.deleteRoute(resources.routes[0] as UpstreamRouteBindingView)).resolves.toBe(true);
    expect(resources.routes).toHaveLength(0);
    await expect(state.deleteInstance(resources.instances[0] as UpstreamInstanceView)).resolves.toBe(true);
    expect(resources.instances).toHaveLength(0);
    await expect(state.logoutAccount(resources.accounts[0] as UpstreamAccountView)).resolves.toBe(true);
    expect(resources.accounts[0]?.authState).toBe("pending");
    await expect(state.deleteAccount(resources.accounts[0] as UpstreamAccountView)).resolves.toBe(true);
    expect(resources.accounts).toHaveLength(0);
    await expect(state.deleteProfile(resources.profiles[0] as AdapterProfileView)).resolves.toBe(true);
    expect(resources.profiles).toHaveLength(0);
    await expect(state.deleteKey(resources.keys[0] as ApiKeyView)).resolves.toBe(true);
    expect(resources.keys).toHaveLength(0);

    state.newUserEmail.value = "ops@example.com";
    await expect(state.createUser()).resolves.toBe(true);
    expect(resources.users.some((user) => user.email === "ops@example.com")).toBe(true);
    await expect(state.deleteUser(resources.users[0] as AdminUser)).resolves.toBe(true);
    expect(resources.users).toHaveLength(0);
  });

  it("handles locale persistence and action errors", async () => {
    const localStorage = new Map<string, string>();
    vi.stubGlobal("window", {
      localStorage: {
        getItem: (key: string) => localStorage.get(key) ?? null,
        setItem: (key: string, value: string) => localStorage.set(key, value)
      }
    });
    const { api } = createFakeApi();
    const state = createDashboardState(api);

    expect(isLocale("zh-CN")).toBe(true);
    expect(isLocale("fr-FR")).toBe(false);
    state.setLocale("en-US");
    expect(localStorage.get("cli2api.locale")).toBe("en-US");
    expect(state.text("overview")).toBe("Overview");
    expect(state.enabledText(0)).toBe("Disabled");
    expect(state.statusLabel(false)).toBe("Disabled");
    expect(state.statusLabel("custom-state")).toBe("custom-state");

    state.createdToken.value = "";
    state.runToken.value = "";
    await expect(state.createRun()).resolves.toBe(false);
    expect(state.error.value).toBe("Create or enter a client key first.");
  });
});

function createFakeApi(): { api: DashboardApi; resources: FakeResources } {
  const resources: FakeResources = {
    users: [],
    profiles: [],
    keys: [],
    runs: [],
    usage: [],
    accounts: [],
    instances: [],
    routes: [],
    events: [{ type: "run.completed", runId: "run-1", output: "ok" }]
  };

  const api: DashboardApi = {
    login: vi.fn(async (input: LoginInput) => ({
      user: { id: "user-1", email: input.email, role: "admin" }
    })),
    users: vi.fn(async () => resources.users),
    createUser: vi.fn(async (input) => {
      const user = { id: `user-${resources.users.length + 1}`, email: input.email, role: "admin", disabledAt: null };
      resources.users.push(user);
      return user;
    }),
    deleteUser: vi.fn(async (id: string) => removeById(resources.users, id)),
    profiles: vi.fn(async () => resources.profiles),
    createProfile: vi.fn(async (input: CreateProfileInput) => {
      const profile: AdapterProfileView = {
        id: input.id,
        type: input.type,
        name: input.name,
        cwd: `/runtime/profiles/${input.id}`,
        enabled: input.enabled
      };
      resources.profiles.push(profile);
      return profile;
    }),
    deleteProfile: vi.fn(async (id: string) => removeById(resources.profiles, id)),
    apiKeys: vi.fn(async () => resources.keys),
    createApiKey: vi.fn(async (input: CreateApiKeyInput) => {
      const key = {
        id: `key-${resources.keys.length + 1}`,
        name: input.name,
        keyPrefix: "c2a_test",
        enabled: 1,
        maxConcurrentRuns: input.maxConcurrentRuns ?? 2,
        rpmLimit: input.rpmLimit ?? 60,
        dailyRunLimit: input.dailyRunLimit ?? 100,
        monthlyTokenLimit: input.monthlyTokenLimit ?? 1000000,
        token: "c2a_test_token"
      };
      resources.keys.push(key);
      return key;
    }),
    revokeApiKey: vi.fn(async (id: string) => {
      const key = resources.keys.find((entry) => entry.id === id);
      if (key) key.enabled = 0;
      return { ok: true };
    }),
    deleteApiKey: vi.fn(async (id: string) => {
      removeById(resources.keys, id);
      return { ok: true };
    }),
    usage: vi.fn(async () => resources.usage),
    runs: vi.fn(async () => resources.runs),
    createRun: vi.fn(async (_token: string, input: CreateRunInput) => {
      const run = {
        id: `run-${resources.runs.length + 1}`,
        profileId: input.profileId,
        status: "completed",
        prompt: input.prompt,
        output: `mock: ${input.prompt}`,
        errorCode: null,
        upstreamInstanceId: resources.instances[0]?.id ?? null
      };
      resources.runs.push(run);
      return run;
    }),
    runEvents: vi.fn(async () => resources.events),
    upstreamAccounts: vi.fn(async () => resources.accounts),
    createUpstreamAccount: vi.fn(async (input: CreateUpstreamAccountInput) => {
      const account = createAccount(input.id ?? `acct-${resources.accounts.length + 1}`, input.name, "pending");
      resources.accounts.push(account);
      return account;
    }),
    deleteUpstreamAccount: vi.fn(async (accountId: string) => removeById(resources.accounts, accountId)),
    startUpstreamAuth: vi.fn(async (accountId: string, _input: StartUpstreamAuthInput) =>
      createAuthSession(accountId, "waiting_for_browser")
    ),
    pollUpstreamAuth: vi.fn(async (accountId: string) => {
      setAccountState(resources, accountId, "authenticated");
      return createAuthSession(accountId, "authenticated");
    }),
    logoutUpstreamAccount: vi.fn(async (accountId: string) => {
      setAccountState(resources, accountId, "pending");
      return createAuthSession(accountId, "pending");
    }),
    cancelUpstreamAuth: vi.fn(async (sessionId: string) => ({
      id: sessionId,
      accountId: "acct-1",
      providerType: "codex",
      state: "canceled",
      authUrl: null,
      userCode: null,
      expiresAt: null,
      message: null,
      createdAt: 1,
      updatedAt: 1
    })),
    upstreamInstances: vi.fn(async () => resources.instances),
    createUpstreamInstance: vi.fn(async (input: CreateUpstreamInstanceInput) => {
      const instance = createInstance(input);
      resources.instances.push(instance);
      return instance;
    }),
    updateUpstreamInstance: vi.fn(async (instanceId: string, input: UpdateUpstreamInstanceInput) => {
      const instance = resources.instances.find((entry) => entry.id === instanceId);
      if (!instance) throw new Error("not found");
      Object.assign(instance, input);
      return instance;
    }),
    disableUpstreamInstance: vi.fn(async (instanceId: string) => {
      const instance = resources.instances.find((entry) => entry.id === instanceId);
      if (!instance) throw new Error("not found");
      instance.enabled = false;
      instance.healthState = "disabled";
      return instance;
    }),
    deleteUpstreamInstance: vi.fn(async (instanceId: string) => removeById(resources.instances, instanceId)),
    upstreamRoutes: vi.fn(async () => resources.routes),
    createUpstreamRoute: vi.fn(async (input: CreateUpstreamRouteInput) => {
      const route = {
        id: `route-${resources.routes.length + 1}`,
        profileId: input.profileId,
        instanceId: input.instanceId,
        createdAt: 1,
        updatedAt: 1
      };
      resources.routes.push(route);
      return route;
    }),
    deleteUpstreamRoute: vi.fn(async (routeId: string) => {
      const index = resources.routes.findIndex((route) => route.id === routeId);
      const [route] = resources.routes.splice(index, 1);
      return route as UpstreamRouteBindingView;
    })
  };

  return { api, resources };
}

function seedResources(resources: FakeResources): void {
  resources.users.push({ id: "user-1", email: "admin@example.com", role: "admin", disabledAt: null });
  resources.profiles.push({ id: "mock-main", type: "mock", name: "Mock Main", cwd: "/runtime/profiles/mock-main", enabled: true });
  resources.keys.push({
    id: "key-1",
    name: "dev",
    keyPrefix: "c2a_dev",
    enabled: 1,
    maxConcurrentRuns: 2,
    rpmLimit: 60,
    dailyRunLimit: 100,
    monthlyTokenLimit: 1000000
  });
  resources.runs.push(
    {
      id: "run-1",
      profileId: "mock-main",
      status: "running",
      prompt: "hello",
      output: null,
      errorCode: null,
      upstreamInstanceId: "inst-1"
    },
    {
      id: "run-2",
      profileId: "mock-main",
      status: "failed",
      prompt: "fail",
      output: "",
      errorCode: "RUN_FAILED",
      upstreamInstanceId: "inst-1"
    },
    {
      id: "run-3",
      profileId: "mock-main",
      status: "completed",
      prompt: "done",
      output: "done",
      errorCode: null,
      upstreamInstanceId: "inst-1"
    }
  );
  resources.usage.push({
    id: "usage-1",
    apiKeyId: "key-1",
    bucketType: "month",
    bucketKey: "2026-06",
    runCount: 2,
    inputTokens: 10,
    outputTokens: 20,
    totalTokens: 30
  });
  resources.accounts.push(createAccount("acct-1", "主账号", "authenticated"));
  resources.instances.push(
    createInstance({
      id: "inst-1",
      accountId: "acct-1",
      type: "mock",
      name: "实例 1",
      enabled: true,
      maxConcurrentRuns: 3
    })
  );
  resources.instances[0].currentRuns = 1;
  resources.instances[0].healthState = "healthy";
  resources.routes.push({ id: "route-1", profileId: "mock-main", instanceId: "inst-1", createdAt: 1, updatedAt: 1 });
}

function createAccount(id: string, name: string, authState: UpstreamAccountView["authState"]): UpstreamAccountView {
  return {
    id,
    providerType: "codex",
    name,
    authState,
    authHome: `/data/codex-homes/${id}`,
    disabledAt: null,
    lastAuthError: null,
    createdAt: 1,
    updatedAt: 1
  };
}

function createAuthSession(accountId: string, state: UpstreamAuthSessionView["state"]): UpstreamAuthSessionView {
  return {
    id: `session-${state}`,
    accountId,
    providerType: "codex",
    state,
    authUrl: state === "waiting_for_browser" ? "https://example.com/device" : null,
    userCode: state === "waiting_for_browser" ? "E2E-1234" : null,
    expiresAt: null,
    message: null,
    createdAt: 1,
    updatedAt: 1
  };
}

function createInstance(input: CreateUpstreamInstanceInput): UpstreamInstanceView {
  return {
    id: input.id ?? "inst-1",
    accountId: input.accountId,
    type: input.type,
    name: input.name,
    cwd: `/runtime/instances/${input.id ?? "inst-1"}`,
    enabled: input.enabled ?? true,
    healthState: "unknown",
    currentRuns: 0,
    maxConcurrentRuns: input.maxConcurrentRuns ?? 1,
    sandbox: "read-only",
    approvalPolicy: "never",
    config: input.config ?? {},
    lastError: null,
    createdAt: 1,
    updatedAt: 1
  };
}

function setAccountState(resources: FakeResources, accountId: string, state: UpstreamAccountView["authState"]): void {
  const account = resources.accounts.find((entry) => entry.id === accountId);
  if (account) {
    account.authState = state;
  }
}

function removeById<T extends { id: string }>(items: T[], id: string): T {
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) {
    throw new Error(`not found: ${id}`);
  }
  const [removed] = items.splice(index, 1);
  return removed as T;
}
