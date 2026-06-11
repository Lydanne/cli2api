import type { AgentEvent } from "@cli2api/shared";
import { computed, inject, provide, ref, watch, type ComputedRef, type InjectionKey, type Ref } from "vue";
import { ApiError, createDashboardApi, type DashboardApi } from "./api";
import {
  isThemeMode,
  resolveThemeMode,
  syncDocumentThemeClass,
  themeModeOptions,
  type ResolvedThemeMode,
  type ThemeMode
} from "./dashboard-theme";
import { isLocale, messages, type Locale, type MessageKey } from "./i18n";
import { summarizeOverview } from "./overview";
import type {
  AdapterProfileView,
  AdminUser,
  ApiKeyView,
  RunView,
  UpstreamAccountView,
  UpstreamAuthSessionView,
  UpstreamInstanceView,
  UpstreamRunSessionView,
  UpstreamRouteBindingView,
  UsageBucketView
} from "../types";

/** PrimeVue status severity names used by Tag components. */
export type StatusSeverity = "success" | "info" | "warn" | "danger" | "secondary";

/** Option shape consumed by PrimeVue Select controls. */
export interface SelectOption {
  /** Human label. */
  label: string;
  /** Stable value. */
  value: string;
}

/** Dashboard overview metrics derived from raw API resources. */
export interface OperationsSummary {
  /** Enabled external profiles. */
  enabledProfiles: number;
  /** Active downstream keys. */
  activeApiKeys: number;
  /** Running runs. */
  runningRuns: number;
  /** Failed runs. */
  failedRuns: number;
  /** Completed runs. */
  completedRuns: number;
  /** Authenticated upstream accounts. */
  authenticatedAccounts: number;
  /** Runnable instances that still have capacity. */
  availableInstances: number;
  /** Available concurrent slots across enabled instances. */
  availableSlots: number;
  /** Enabled profiles covered by at least one route binding. */
  routedProfiles: number;
  /** Automatically-created upstream run sessions. */
  activeSessions: number;
  /** Month-to-date run count. */
  monthlyRuns: number;
  /** Month-to-date token count. */
  monthlyTokens: number;
}

/** Shared dashboard state and actions provided to route pages. */
export interface DashboardState {
  locale: Ref<Locale>;
  themeMode: Ref<ThemeMode>;
  resolvedThemeMode: ComputedRef<ResolvedThemeMode>;
  email: Ref<string>;
  password: Ref<string>;
  loggedIn: Ref<boolean>;
  error: Ref<string>;
  users: Ref<AdminUser[]>;
  profiles: Ref<AdapterProfileView[]>;
  keys: Ref<ApiKeyView[]>;
  runs: Ref<RunView[]>;
  usage: Ref<UsageBucketView[]>;
  accounts: Ref<UpstreamAccountView[]>;
  instances: Ref<UpstreamInstanceView[]>;
  routes: Ref<UpstreamRouteBindingView[]>;
  runSessions: Ref<UpstreamRunSessionView[]>;
  newProfileId: Ref<string>;
  newProfileName: Ref<string>;
  newProfileModel: Ref<string>;
  newProfileType: Ref<"codex" | "mock">;
  newKeyName: Ref<string>;
  newKeyDailyLimit: Ref<number>;
  newKeyRpmLimit: Ref<number>;
  newKeyConcurrentLimit: Ref<number>;
  newKeyMonthlyTokenLimit: Ref<number>;
  prompt: Ref<string>;
  selectedProfile: Ref<string>;
  createdToken: Ref<string>;
  runToken: Ref<string>;
  selectedRunId: Ref<string>;
  runEvents: Ref<AgentEvent[]>;
  newUserEmail: Ref<string>;
  newUserPassword: Ref<string>;
  newAccountId: Ref<string>;
  newAccountName: Ref<string>;
  lastAuthSession: Ref<UpstreamAuthSessionView | null>;
  newInstanceId: Ref<string>;
  newInstanceName: Ref<string>;
  selectedAccountId: Ref<string>;
  newInstanceType: Ref<string>;
  newInstanceConcurrency: Ref<number>;
  selectedRouteProfile: Ref<string>;
  selectedRouteInstance: Ref<string>;
  profileOptions: ComputedRef<SelectOption[]>;
  accountOptions: ComputedRef<SelectOption[]>;
  instanceOptions: ComputedRef<SelectOption[]>;
  themeOptions: ComputedRef<Array<SelectOption & { value: ThemeMode }>>;
  profileTypeOptions: SelectOption[];
  instanceTypeOptions: SelectOption[];
  summary: ComputedRef<OperationsSummary>;
  monthlyUsageByKey: ComputedRef<Map<string, UsageBucketView>>;
  formattedRunEvents: ComputedRef<string>;
  text: (key: MessageKey) => string;
  statusLabel: (value: boolean | number | string | null | undefined) => string;
  setLocale: (value: Locale) => void;
  setThemeMode: (value: ThemeMode) => void;
  login: () => Promise<boolean>;
  refresh: (options?: { silent?: boolean }) => Promise<boolean>;
  createProfile: () => Promise<boolean>;
  importAgentModels: () => Promise<boolean>;
  createKey: () => Promise<boolean>;
  createUser: () => Promise<boolean>;
  createRun: () => Promise<boolean>;
  loadRunEvents: (run: RunView) => Promise<boolean>;
  revokeKey: (key: ApiKeyView) => Promise<boolean>;
  createAccount: () => Promise<boolean>;
  startAuth: (account: UpstreamAccountView) => Promise<boolean>;
  pollAuth: (account: UpstreamAccountView) => Promise<boolean>;
  logoutAccount: (account: UpstreamAccountView) => Promise<boolean>;
  createInstance: () => Promise<boolean>;
  saveInstance: (instance: UpstreamInstanceView) => Promise<boolean>;
  disableInstance: (instance: UpstreamInstanceView) => Promise<boolean>;
  createRoute: () => Promise<boolean>;
  deleteRoute: (route: UpstreamRouteBindingView) => Promise<boolean>;
  deleteRunSession: (session: UpstreamRunSessionView) => Promise<boolean>;
  deleteProfile: (profile: AdapterProfileView) => Promise<boolean>;
  deleteKey: (key: ApiKeyView) => Promise<boolean>;
  hardDeleteKey: (key: ApiKeyView) => Promise<boolean>;
  deleteAccount: (account: UpstreamAccountView) => Promise<boolean>;
  deleteInstance: (instance: UpstreamInstanceView) => Promise<boolean>;
  deleteUser: (user: AdminUser) => Promise<boolean>;
  enabledText: (value: boolean | number) => string;
  statusSeverity: (value: boolean | number | string | null | undefined) => StatusSeverity;
  accountName: (accountId: string) => string;
  instanceName: (instanceId: string | null | undefined) => string;
  profileName: (profileId: string) => string;
  profileModel: (profile: AdapterProfileView) => string;
}

const dashboardStateKey: InjectionKey<DashboardState> = Symbol("dashboard-state");

/** Creates the shared dashboard state object. */
export function createDashboardState(client: DashboardApi = createDashboardApi()): DashboardState {
  const locale = ref<Locale>(readInitialLocale());
  const themeMode = ref<ThemeMode>(readInitialThemeMode());
  const systemPrefersDark = ref(readSystemPrefersDark());
  const email = ref("admin@example.com");
  const password = ref("password");
  const loggedIn = ref(false);
  const error = ref("");
  const users = ref<AdminUser[]>([]);
  const profiles = ref<AdapterProfileView[]>([]);
  const keys = ref<ApiKeyView[]>([]);
  const runs = ref<RunView[]>([]);
  const usage = ref<UsageBucketView[]>([]);
  const accounts = ref<UpstreamAccountView[]>([]);
  const instances = ref<UpstreamInstanceView[]>([]);
  const routes = ref<UpstreamRouteBindingView[]>([]);
  const runSessions = ref<UpstreamRunSessionView[]>([]);
  const newProfileId = ref("mock-default");
  const newProfileName = ref("");
  const newProfileModel = ref("");
  const newProfileType = ref<"codex" | "mock">("mock");
  const newKeyName = ref("dev-key");
  const newKeyDailyLimit = ref(100);
  const newKeyRpmLimit = ref(60);
  const newKeyConcurrentLimit = ref(2);
  const newKeyMonthlyTokenLimit = ref(1000000);
  const prompt = ref("hello from dashboard");
  const selectedProfile = ref("");
  const createdToken = ref("");
  const runToken = ref("");
  const selectedRunId = ref("");
  const runEvents = ref<AgentEvent[]>([]);
  const newUserEmail = ref("ops@example.com");
  const newUserPassword = ref("change-me");
  const newAccountId = ref("codex-main");
  const newAccountName = ref("主上游账号");
  const lastAuthSession = ref<UpstreamAuthSessionView | null>(null);
  const newInstanceId = ref("codex-inst-1");
  const newInstanceName = ref("Codex 实例 1");
  const selectedAccountId = ref("");
  const newInstanceType = ref("mock");
  const newInstanceConcurrency = ref(1);
  const selectedRouteProfile = ref("");
  const selectedRouteInstance = ref("");

  const profileTypeOptions = [
    { label: "mock", value: "mock" },
    { label: "codex", value: "codex" }
  ];
  const instanceTypeOptions = [
    { label: "mock", value: "mock" },
    { label: "codex", value: "codex" }
  ];
  const profileOptions = computed(() =>
    profiles.value.map((profile) => ({ label: `${profile.id} · ${profile.type}`, value: profile.id }))
  );
  const accountOptions = computed(() => accounts.value.map((account) => ({ label: account.name, value: account.id })));
  const instanceOptions = computed(() =>
    instances.value.map((instance) => ({ label: `${instance.name} · ${instance.id}`, value: instance.id }))
  );
  const themeOptions = computed<Array<SelectOption & { value: ThemeMode }>>(() =>
    themeModeOptions.map((option) => ({ label: text(themeModeLabelKey(option.value)), value: option.value }))
  );
  const resolvedThemeMode = computed(() => resolveThemeMode(themeMode.value, systemPrefersDark.value));
  const monthlyUsageByKey = computed(() => {
    const buckets = new Map<string, UsageBucketView>();
    for (const bucket of usage.value) {
      if (bucket.bucketType === "month") {
        buckets.set(bucket.apiKeyId, bucket);
      }
    }
    return buckets;
  });
  const summary = computed<OperationsSummary>(() => {
    const base = summarizeOverview({
      profiles: profiles.value,
      apiKeys: keys.value,
      runs: runs.value
    });
    const routedProfileIds = new Set(routes.value.map((route) => route.profileId));
    const availableInstances = instances.value.filter(
      (instance) =>
        instance.enabled &&
        ["unknown", "healthy"].includes(instance.healthState) &&
        instance.currentRuns < instance.maxConcurrentRuns
    );
    const monthlyBuckets = [...monthlyUsageByKey.value.values()];
    return {
      ...base,
      authenticatedAccounts: accounts.value.filter((account) => account.authState === "authenticated" && !account.disabledAt).length,
      availableInstances: availableInstances.length,
      availableSlots: availableInstances.reduce(
        (total, instance) => total + Math.max(instance.maxConcurrentRuns - instance.currentRuns, 0),
        0
      ),
      routedProfiles: profiles.value.filter((profile) => profile.enabled && routedProfileIds.has(profile.id)).length,
      activeSessions: runSessions.value.length,
      monthlyRuns: monthlyBuckets.reduce((total, bucket) => total + bucket.runCount, 0),
      monthlyTokens: monthlyBuckets.reduce((total, bucket) => total + bucket.totalTokens, 0)
    };
  });
  const formattedRunEvents = computed(() => runEvents.value.map((event) => JSON.stringify(event, null, 2)).join("\n\n"));

  function text(key: MessageKey): string {
    return messages[locale.value][key] ?? messages["zh-CN"][key];
  }

  function statusLabel(value: boolean | number | string | null | undefined): string {
    if (value === true || value === 1) return text("enabled");
    if (value === false || value === 0) return text("disabled");
    if (value === null || value === undefined || value === "") return "-";
    return statusMessage(String(value));
  }

  function statusMessage(value: string): string {
    return Object.prototype.hasOwnProperty.call(messages[locale.value], value)
      ? messages[locale.value][value as MessageKey]
      : value;
  }

  function setLocale(value: Locale): void {
    locale.value = value;
    window.localStorage.setItem("cli2api.locale", value);
  }

  function setThemeMode(value: ThemeMode): void {
    themeMode.value = value;
    window.localStorage.setItem("cli2api.theme", value);
  }

  bindSystemThemePreference(systemPrefersDark);
  bindDocumentThemeClass(resolvedThemeMode);

  async function login(): Promise<boolean> {
    return action(async () => {
      await client.login({ email: email.value, password: password.value });
      loggedIn.value = true;
      await refresh();
    });
  }

  async function refresh(options: { silent?: boolean } = {}): Promise<boolean> {
    return action(async () => {
      const [userRows, profileRows, keyRows, runRows, usageRows, accountRows, instanceRows, routeRows, sessionRows] = await Promise.all([
        client.users(),
        client.profiles(),
        client.apiKeys(),
        client.runs(),
        client.usage(),
        client.upstreamAccounts(),
        client.upstreamInstances(),
        client.upstreamRoutes(),
        client.upstreamRunSessions()
      ]);
      users.value = userRows;
      profiles.value = profileRows;
      keys.value = keyRows;
      runs.value = runRows;
      usage.value = usageRows;
      accounts.value = accountRows;
      instances.value = instanceRows;
      routes.value = routeRows;
      runSessions.value = sessionRows;
      selectedProfile.value = selectedProfile.value || profiles.value[0]?.id || "";
      selectedAccountId.value = selectedAccountId.value || accounts.value[0]?.id || "";
      selectedRouteProfile.value = selectedRouteProfile.value || profiles.value[0]?.id || "";
      selectedRouteInstance.value = selectedRouteInstance.value || instances.value[0]?.id || "";
    }, options);
  }

  async function createProfile(): Promise<boolean> {
    return action(async () => {
      const model = newProfileModel.value.trim();
      await client.createProfile({
        id: newProfileId.value,
        type: newProfileType.value,
        name: newProfileName.value || newProfileId.value,
        enabled: true,
        config: model ? { model } : undefined
      });
      await refresh();
    });
  }

  async function importAgentModels(): Promise<boolean> {
    return action(async () => {
      await client.importAgentModels();
      await refresh();
    });
  }

  async function createKey(): Promise<boolean> {
    return action(async () => {
      const created = await client.createApiKey({
        name: newKeyName.value,
        dailyRunLimit: Number(newKeyDailyLimit.value),
        rpmLimit: Number(newKeyRpmLimit.value),
        maxConcurrentRuns: Number(newKeyConcurrentLimit.value),
        monthlyTokenLimit: Number(newKeyMonthlyTokenLimit.value)
      });
      createdToken.value = created.token ?? "";
      runToken.value = created.token ?? "";
      await refresh();
    });
  }

  async function createUser(): Promise<boolean> {
    return action(async () => {
      await client.createUser({ email: newUserEmail.value, password: newUserPassword.value });
      await refresh();
    });
  }

  async function createRun(): Promise<boolean> {
    return action(async () => {
      const token = runToken.value || createdToken.value;
      if (!token) {
        throw new Error(text("createKeyFirst"));
      }
      await client.createRun(token, { prompt: prompt.value, profileId: selectedProfile.value });
      await refresh();
    });
  }

  async function loadRunEvents(run: RunView): Promise<boolean> {
    return action(async () => {
      selectedRunId.value = run.id;
      runEvents.value = await client.runEvents(run.id);
    });
  }

  async function revokeKey(key: ApiKeyView): Promise<boolean> {
    return action(async () => {
      await client.revokeApiKey(key.id);
      await refresh();
    });
  }

  async function createAccount(): Promise<boolean> {
    return action(async () => {
      const account = await client.createUpstreamAccount({
        id: newAccountId.value,
        providerType: "codex",
        name: newAccountName.value
      });
      selectedAccountId.value = account.id;
      await refresh();
    });
  }

  async function startAuth(account: UpstreamAccountView): Promise<boolean> {
    return action(async () => {
      lastAuthSession.value = await client.startUpstreamAuth(account.id, { method: "device" });
      await refresh();
    });
  }

  async function pollAuth(account: UpstreamAccountView): Promise<boolean> {
    return action(async () => {
      lastAuthSession.value = await client.pollUpstreamAuth(account.id);
      await refresh();
    });
  }

  async function logoutAccount(account: UpstreamAccountView): Promise<boolean> {
    return action(async () => {
      lastAuthSession.value = await client.logoutUpstreamAccount(account.id);
      await refresh();
    });
  }

  async function createInstance(): Promise<boolean> {
    return action(async () => {
      await client.createUpstreamInstance({
        id: newInstanceId.value,
        accountId: selectedAccountId.value,
        type: newInstanceType.value,
        name: newInstanceName.value,
        enabled: true,
        maxConcurrentRuns: Number(newInstanceConcurrency.value)
      });
      await refresh();
    });
  }

  async function saveInstance(instance: UpstreamInstanceView): Promise<boolean> {
    return action(async () => {
      await client.updateUpstreamInstance(instance.id, {
        name: instance.name,
        enabled: instance.enabled,
        maxConcurrentRuns: Number(instance.maxConcurrentRuns),
        config: instance.config
      });
      await refresh();
    });
  }

  async function disableInstance(instance: UpstreamInstanceView): Promise<boolean> {
    return action(async () => {
      await client.disableUpstreamInstance(instance.id);
      await refresh();
    });
  }

  async function createRoute(): Promise<boolean> {
    return action(async () => {
      await client.createUpstreamRoute({
        profileId: selectedRouteProfile.value,
        instanceId: selectedRouteInstance.value
      });
      await refresh();
    });
  }

  async function deleteRoute(route: UpstreamRouteBindingView): Promise<boolean> {
    return action(async () => {
      await client.deleteUpstreamRoute(route.id);
      await refresh();
    });
  }

  async function deleteRunSession(session: UpstreamRunSessionView): Promise<boolean> {
    return action(async () => {
      await client.deleteUpstreamRunSession(session.id);
      await refresh();
    });
  }

  async function deleteProfile(profile: AdapterProfileView): Promise<boolean> {
    return action(async () => {
      await client.deleteProfile(profile.id);
      await refresh();
    });
  }

  async function deleteKey(key: ApiKeyView): Promise<boolean> {
    return action(async () => {
      try {
        await client.deleteApiKey(key.id);
      } catch (cause) {
        if (!isUsedApiKeyDeleteRejection(cause)) {
          throw cause;
        }
        await client.revokeApiKey(key.id);
      }
      await refresh();
    });
  }

  async function hardDeleteKey(key: ApiKeyView): Promise<boolean> {
    return action(async () => {
      await client.hardDeleteApiKey(key.id);
      await refresh();
    });
  }

  async function deleteAccount(account: UpstreamAccountView): Promise<boolean> {
    return action(async () => {
      await client.deleteUpstreamAccount(account.id);
      await refresh();
    });
  }

  async function deleteInstance(instance: UpstreamInstanceView): Promise<boolean> {
    return action(async () => {
      await client.deleteUpstreamInstance(instance.id);
      await refresh();
    });
  }

  async function deleteUser(user: AdminUser): Promise<boolean> {
    return action(async () => {
      await client.deleteUser(user.id);
      await refresh();
    });
  }

  async function action(work: () => Promise<void>, options: { silent?: boolean } = {}): Promise<boolean> {
    error.value = "";
    try {
      await work();
      return true;
    } catch (cause) {
      if (!options.silent) {
        error.value = cause instanceof ApiError || cause instanceof Error ? cause.message : "Request failed";
      }
      return false;
    }
  }

  function isUsedApiKeyDeleteRejection(cause: unknown): boolean {
    return (
      cause instanceof ApiError &&
      cause.status === 409 &&
      cause.code === "INVALID_REQUEST" &&
      cause.message.includes("usage history")
    );
  }

  function enabledText(value: boolean | number): string {
    return value ? text("enabled") : text("disabled");
  }

  function statusSeverity(value: boolean | number | string | null | undefined): StatusSeverity {
    if (value === true || value === 1 || value === "completed" || value === "authenticated" || value === "healthy") {
      return "success";
    }
    if (value === "running" || value === "waiting_for_browser" || value === "unknown") {
      return "info";
    }
    if (value === "pending") {
      return "warn";
    }
    if (value === false || value === 0 || value === "failed" || value === "degraded" || value === "disabled") {
      return "danger";
    }
    return "secondary";
  }

  function accountName(accountId: string): string {
    return accounts.value.find((account) => account.id === accountId)?.name ?? accountId;
  }

  function instanceName(instanceId: string | null | undefined): string {
    if (!instanceId) return "-";
    return instances.value.find((instance) => instance.id === instanceId)?.name ?? instanceId;
  }

  function profileName(profileId: string): string {
    return profiles.value.find((profile) => profile.id === profileId)?.name ?? profileId;
  }

  function profileModel(profile: AdapterProfileView): string {
    const model = profile.config?.model;
    return typeof model === "string" && model ? model : "-";
  }

  return {
    locale,
    themeMode,
    resolvedThemeMode,
    email,
    password,
    loggedIn,
    error,
    users,
    profiles,
    keys,
    runs,
    usage,
    accounts,
    instances,
    routes,
    runSessions,
    newProfileId,
    newProfileName,
    newProfileModel,
    newProfileType,
    newKeyName,
    newKeyDailyLimit,
    newKeyRpmLimit,
    newKeyConcurrentLimit,
    newKeyMonthlyTokenLimit,
    prompt,
    selectedProfile,
    createdToken,
    runToken,
    selectedRunId,
    runEvents,
    newUserEmail,
    newUserPassword,
    newAccountId,
    newAccountName,
    lastAuthSession,
    newInstanceId,
    newInstanceName,
    selectedAccountId,
    newInstanceType,
    newInstanceConcurrency,
    selectedRouteProfile,
    selectedRouteInstance,
    profileOptions,
    accountOptions,
    instanceOptions,
    themeOptions,
    profileTypeOptions,
    instanceTypeOptions,
    summary,
    monthlyUsageByKey,
    formattedRunEvents,
    text,
    statusLabel,
    setLocale,
    setThemeMode,
    login,
    refresh,
    createProfile,
    importAgentModels,
    createKey,
    createUser,
    createRun,
    loadRunEvents,
    revokeKey,
    createAccount,
    startAuth,
    pollAuth,
    logoutAccount,
    createInstance,
    saveInstance,
    disableInstance,
    createRoute,
    deleteRoute,
    deleteRunSession,
    deleteProfile,
    deleteKey,
    hardDeleteKey,
    deleteAccount,
    deleteInstance,
    deleteUser,
    enabledText,
    statusSeverity,
    accountName,
    instanceName,
    profileName,
    profileModel
  };
}

/** Provides shared dashboard state to route components. */
export function provideDashboardState(state: DashboardState): void {
  provide(dashboardStateKey, state);
}

/** Reads shared dashboard state from the current component tree. */
export function useDashboardState(): DashboardState {
  const state = inject(dashboardStateKey);
  if (!state) {
    throw new Error("Dashboard state was not provided");
  }
  return state;
}

function readInitialLocale(): Locale {
  if (typeof window === "undefined") {
    return "zh-CN";
  }
  const stored = window.localStorage.getItem("cli2api.locale");
  return stored && isLocale(stored) ? stored : "zh-CN";
}

function readInitialThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return "system";
  }
  const stored = window.localStorage.getItem("cli2api.theme");
  return stored && isThemeMode(stored) ? stored : "system";
}

function readSystemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches === true;
}

function bindSystemThemePreference(systemPrefersDark: Ref<boolean>): void {
  if (typeof window === "undefined" || !window.matchMedia) {
    return;
  }
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  systemPrefersDark.value = media.matches;
  media.addEventListener?.("change", (event) => {
    systemPrefersDark.value = event.matches;
  });
}

function bindDocumentThemeClass(resolvedThemeMode: ComputedRef<ResolvedThemeMode>): void {
  if (typeof document === "undefined") {
    return;
  }
  watch(resolvedThemeMode, (mode) => syncDocumentThemeClass(document.documentElement, mode), { flush: "sync", immediate: true });
}

function themeModeLabelKey(mode: ThemeMode): MessageKey {
  if (mode === "dark") return "themeDark";
  if (mode === "light") return "themeLight";
  return "themeSystem";
}
