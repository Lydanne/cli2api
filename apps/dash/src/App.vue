<script setup lang="ts">
import type { AgentEvent } from "@cli2api/shared";
import {
  Activity,
  Ban,
  Database,
  Eye,
  GitBranch,
  Globe2,
  KeyRound,
  LogOut,
  Play,
  Save,
  Server,
  Trash2,
  UserPlus,
  Users
} from "lucide-vue-next";
import { computed, onMounted, ref } from "vue";
import { ApiError, createDashboardApi } from "./lib/api";
import { summarizeOverview } from "./lib/overview";
import type {
  AdapterProfileView,
  ApiKeyView,
  AdminUser,
  RunView,
  UpstreamAccountView,
  UpstreamAuthSessionView,
  UpstreamInstanceView,
  UpstreamRouteBindingView,
  UsageBucketView
} from "./types";

const messages = {
  "zh-CN": {
    login: "登录",
    email: "邮箱",
    password: "密码",
    overview: "概览",
    runs: "运行记录",
    keys: "API 密钥",
    profiles: "路由配置",
    routeBindings: "路由绑定",
    accounts: "上游账号",
    instances: "实例池",
    users: "用户",
    subtitle: "面向 CLI Agent 的本地运营控制台。",
    refresh: "刷新",
    enabledProfiles: "启用路由",
    activeKeys: "可用密钥",
    running: "运行中",
    failed: "失败",
    completed: "完成",
    createMockProfile: "创建 Mock 路由",
    createApiKey: "创建 API 密钥",
    createUser: "创建用户",
    createRun: "运行",
    createAccount: "创建账号",
    startAuth: "网页认证",
    pollAuth: "刷新认证",
    logout: "退出登录",
    createInstance: "创建实例",
    save: "保存",
    disableInstance: "停用实例",
    createRoute: "绑定路由",
    deleteRoute: "删除绑定",
    viewEvents: "查看事件",
    revoke: "吊销",
    dailyLimit: "日运行",
    rpmLimit: "每分钟",
    concurrentLimit: "并发",
    monthlyTokenLimit: "月 Token",
    events: "事件",
    enabled: "启用",
    disabled: "停用",
    createKeyFirst: "请先创建 API 密钥。",
    authInstruction: "打开认证链接并输入验证码，完成后点击刷新认证。",
    authUrl: "认证链接",
    userCode: "验证码",
    noRows: "暂无数据",
    language: "语言"
  },
  "en-US": {
    login: "Login",
    email: "Email",
    password: "Password",
    overview: "Overview",
    runs: "Runs",
    keys: "API Keys",
    profiles: "Routes",
    routeBindings: "Route Bindings",
    accounts: "Upstream Accounts",
    instances: "Instances",
    users: "Users",
    subtitle: "Local operations control plane for CLI agents.",
    refresh: "Refresh",
    enabledProfiles: "Enabled routes",
    activeKeys: "Active keys",
    running: "Running",
    failed: "Failed",
    completed: "Completed",
    createMockProfile: "Create mock route",
    createApiKey: "Create API key",
    createUser: "Create user",
    createRun: "Run",
    createAccount: "Create account",
    startAuth: "Browser auth",
    pollAuth: "Refresh auth",
    logout: "Logout",
    createInstance: "Create instance",
    save: "Save",
    disableInstance: "Disable instance",
    createRoute: "Bind route",
    deleteRoute: "Delete binding",
    viewEvents: "View events",
    revoke: "Revoke",
    dailyLimit: "Daily runs",
    rpmLimit: "RPM",
    concurrentLimit: "Concurrent",
    monthlyTokenLimit: "Monthly tokens",
    events: "Events",
    enabled: "enabled",
    disabled: "disabled",
    createKeyFirst: "Create an API key first.",
    authInstruction: "Open the auth URL, enter the code, then refresh auth.",
    authUrl: "Auth URL",
    userCode: "User code",
    noRows: "No data",
    language: "Language"
  }
} as const;

type Locale = keyof typeof messages;
type MessageKey = keyof (typeof messages)["zh-CN"];

const client = createDashboardApi();
const locale = ref<Locale>(readInitialLocale());
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
const selectedTab = ref("overview");
const newProfileId = ref("mock-default");
const newKeyName = ref("dev-key");
const newKeyDailyLimit = ref(100);
const newKeyRpmLimit = ref(60);
const newKeyConcurrentLimit = ref(2);
const newKeyMonthlyTokenLimit = ref(1000000);
const prompt = ref("hello from dashboard");
const selectedProfile = ref("");
const createdToken = ref("");
const selectedRunId = ref("");
const runEvents = ref<AgentEvent[]>([]);
const newUserEmail = ref("ops@example.com");
const newUserPassword = ref("change-me");
const newAccountId = ref("codex-main");
const newAccountName = ref("主 Codex 账号");
const lastAuthSession = ref<UpstreamAuthSessionView | null>(null);
const newInstanceId = ref("codex-inst-1");
const newInstanceName = ref("Codex 实例 1");
const selectedAccountId = ref("");
const newInstanceType = ref("mock");
const newInstanceCwd = ref("/workspace");
const newInstanceConcurrency = ref(1);
const selectedRouteProfile = ref("");
const selectedRouteInstance = ref("");

const navItems = computed(
  () =>
    [
      ["overview", Activity, text("overview")],
      ["runs", Play, text("runs")],
      ["keys", KeyRound, text("keys")],
      ["profiles", Server, text("profiles")],
      ["routeBindings", GitBranch, text("routeBindings")],
      ["accounts", Globe2, text("accounts")],
      ["instances", Database, text("instances")],
      ["users", Users, text("users")]
    ] as const
);
const summary = computed(() =>
  summarizeOverview({
    profiles: profiles.value,
    apiKeys: keys.value,
    runs: runs.value
  })
);
const monthlyUsageByKey = computed(() => {
  const buckets = new Map<string, UsageBucketView>();
  for (const bucket of usage.value) {
    if (bucket.bucketType === "month") {
      buckets.set(bucket.apiKeyId, bucket);
    }
  }
  return buckets;
});
const formattedRunEvents = computed(() => runEvents.value.map((event) => JSON.stringify(event, null, 2)).join("\n\n"));

function text(key: MessageKey): string {
  return messages[locale.value][key] ?? messages["zh-CN"][key];
}

function setLocale(value: Locale): void {
  locale.value = value;
  window.localStorage.setItem("cli2api.locale", value);
}

function readInitialLocale(): Locale {
  if (typeof window === "undefined") {
    return "zh-CN";
  }
  return (window.localStorage.getItem("cli2api.locale") as Locale) || "zh-CN";
}

async function login() {
  await action(async () => {
    await client.login({ email: email.value, password: password.value });
    loggedIn.value = true;
    await refresh();
  });
}

async function refresh(options: { silent?: boolean } = {}) {
  await action(async () => {
    const [userRows, profileRows, keyRows, runRows, usageRows, accountRows, instanceRows, routeRows] = await Promise.all([
      client.users(),
      client.profiles(),
      client.apiKeys(),
      client.runs(),
      client.usage(),
      client.upstreamAccounts(),
      client.upstreamInstances(),
      client.upstreamRoutes()
    ]);
    users.value = userRows;
    profiles.value = profileRows;
    keys.value = keyRows;
    runs.value = runRows;
    usage.value = usageRows;
    accounts.value = accountRows;
    instances.value = instanceRows;
    routes.value = routeRows;
    selectedProfile.value = selectedProfile.value || profiles.value[0]?.id || "";
    selectedAccountId.value = selectedAccountId.value || accounts.value[0]?.id || "";
    selectedRouteProfile.value = selectedRouteProfile.value || profiles.value[0]?.id || "";
    selectedRouteInstance.value = selectedRouteInstance.value || instances.value[0]?.id || "";
  }, options);
}

async function createProfile() {
  await action(async () => {
    await client.createProfile({
      id: newProfileId.value,
      type: "mock",
      name: newProfileId.value,
      cwd: window.location.origin,
      enabled: true
    });
    await refresh();
  });
}

async function createKey() {
  await action(async () => {
    const created = await client.createApiKey({
      name: newKeyName.value,
      dailyRunLimit: Number(newKeyDailyLimit.value),
      rpmLimit: Number(newKeyRpmLimit.value),
      maxConcurrentRuns: Number(newKeyConcurrentLimit.value),
      monthlyTokenLimit: Number(newKeyMonthlyTokenLimit.value)
    });
    createdToken.value = created.token ?? "";
    await refresh();
  });
}

async function createUser() {
  await action(async () => {
    await client.createUser({ email: newUserEmail.value, password: newUserPassword.value });
    await refresh();
  });
}

async function createRun() {
  await action(async () => {
    if (!createdToken.value) {
      throw new Error(text("createKeyFirst"));
    }
    await client.createRun(createdToken.value, { prompt: prompt.value, profileId: selectedProfile.value });
    await refresh();
  });
}

async function loadRunEvents(run: RunView) {
  await action(async () => {
    selectedRunId.value = run.id;
    runEvents.value = await client.runEvents(run.id);
  });
}

async function revokeKey(key: ApiKeyView) {
  await action(async () => {
    await client.revokeApiKey(key.id);
    await refresh();
  });
}

async function createAccount() {
  await action(async () => {
    const account = await client.createUpstreamAccount({
      id: newAccountId.value,
      providerType: "codex",
      name: newAccountName.value
    });
    selectedAccountId.value = account.id;
    await refresh();
  });
}

async function startAuth(account: UpstreamAccountView) {
  await action(async () => {
    lastAuthSession.value = await client.startUpstreamAuth(account.id, { method: "device" });
    await refresh();
  });
}

async function pollAuth(account: UpstreamAccountView) {
  await action(async () => {
    lastAuthSession.value = await client.pollUpstreamAuth(account.id);
    await refresh();
  });
}

async function logoutAccount(account: UpstreamAccountView) {
  await action(async () => {
    lastAuthSession.value = await client.logoutUpstreamAccount(account.id);
    await refresh();
  });
}

async function createInstance() {
  await action(async () => {
    await client.createUpstreamInstance({
      id: newInstanceId.value,
      accountId: selectedAccountId.value,
      type: newInstanceType.value,
      name: newInstanceName.value,
      cwd: newInstanceCwd.value,
      enabled: true,
      maxConcurrentRuns: Number(newInstanceConcurrency.value)
    });
    await refresh();
  });
}

async function saveInstance(instance: UpstreamInstanceView) {
  await action(async () => {
    await client.updateUpstreamInstance(instance.id, {
      name: instance.name,
      cwd: instance.cwd,
      enabled: instance.enabled,
      maxConcurrentRuns: Number(instance.maxConcurrentRuns)
    });
    await refresh();
  });
}

async function disableInstance(instance: UpstreamInstanceView) {
  await action(async () => {
    await client.disableUpstreamInstance(instance.id);
    await refresh();
  });
}

async function createRoute() {
  await action(async () => {
    await client.createUpstreamRoute({
      profileId: selectedRouteProfile.value,
      instanceId: selectedRouteInstance.value
    });
    await refresh();
  });
}

async function deleteRoute(route: UpstreamRouteBindingView) {
  await action(async () => {
    await client.deleteUpstreamRoute(route.id);
    await refresh();
  });
}

async function action(work: () => Promise<void>, options: { silent?: boolean } = {}) {
  error.value = "";
  try {
    await work();
  } catch (cause) {
    if (!options.silent) {
      error.value = cause instanceof ApiError || cause instanceof Error ? cause.message : "Request failed";
    }
  }
}

function enabledText(value: boolean | number): string {
  return value ? text("enabled") : text("disabled");
}

onMounted(async () => {
  await refresh({ silent: true }).catch(() => undefined);
});
</script>

<template>
  <main class="min-h-screen bg-slate-50 text-slate-900">
    <section v-if="!loggedIn" class="mx-auto flex min-h-screen max-w-sm items-center px-4">
      <form class="w-full rounded border border-slate-200 bg-white p-5 shadow-sm" @submit.prevent="login">
        <h1 class="text-xl font-semibold">cli2api</h1>
        <div class="mt-5 space-y-3">
          <input v-model="email" class="w-full rounded border px-3 py-2" data-testid="login-email" :placeholder="text('email')" />
          <input
            v-model="password"
            class="w-full rounded border px-3 py-2"
            data-testid="login-password"
            :placeholder="text('password')"
            type="password"
          />
          <button class="w-full rounded bg-slate-900 px-3 py-2 text-white" data-testid="login-submit">{{ text('login') }}</button>
        </div>
        <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
      </form>
    </section>

    <section v-else class="grid min-h-screen grid-cols-[240px_1fr]">
      <aside class="border-r border-slate-200 bg-white p-4">
        <h1 class="text-lg font-semibold">cli2api</h1>
        <nav class="mt-6 space-y-1">
          <button
            v-for="item in navItems"
            :key="item[0]"
            class="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm"
            :class="selectedTab === item[0] ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'"
            :data-testid="`nav-${item[0]}`"
            @click="selectedTab = item[0]"
          >
            <component :is="item[1]" :size="16" />
            {{ item[2] }}
          </button>
        </nav>
      </aside>

      <section class="p-6">
        <header class="flex items-center justify-between gap-3">
          <div>
            <h2 class="text-2xl font-semibold">{{ navItems.find((item) => item[0] === selectedTab)?.[2] }}</h2>
            <p class="text-sm text-slate-500">{{ text('subtitle') }}</p>
          </div>
          <div class="flex items-center gap-2">
            <select
              :value="locale"
              class="rounded border border-slate-300 bg-white px-2 py-2 text-sm"
              data-testid="locale-switch"
              :aria-label="text('language')"
              @change="setLocale(($event.target as HTMLSelectElement).value as Locale)"
            >
              <option value="zh-CN">中文</option>
              <option value="en-US">English</option>
            </select>
            <button class="rounded border border-slate-300 bg-white px-3 py-2 text-sm" @click="refresh">{{ text('refresh') }}</button>
          </div>
        </header>

        <p v-if="error" class="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>

        <div v-if="selectedTab === 'overview'" class="mt-6 grid grid-cols-5 gap-3">
          <div
            v-for="card in [
              [text('enabledProfiles'), summary.enabledProfiles],
              [text('activeKeys'), summary.activeApiKeys],
              [text('running'), summary.runningRuns],
              [text('failed'), summary.failedRuns],
              [text('completed'), summary.completedRuns]
            ]"
            :key="card[0] as string"
            class="rounded border bg-white p-4"
          >
            <p class="text-xs uppercase text-slate-500">{{ card[0] }}</p>
            <p class="mt-2 text-2xl font-semibold">{{ card[1] }}</p>
          </div>
        </div>

        <div v-if="selectedTab === 'profiles'" class="mt-6 space-y-4">
          <div class="rounded border bg-white p-4">
            <div class="flex gap-2">
              <input v-model="newProfileId" class="rounded border px-3 py-2" data-testid="profile-id" />
              <button class="rounded bg-slate-900 px-3 py-2 text-white" data-testid="create-profile" @click="createProfile">
                {{ text('createMockProfile') }}
              </button>
            </div>
          </div>
          <table class="w-full rounded border bg-white text-sm">
            <tbody>
              <tr v-for="profile in profiles" :key="profile.id" class="border-t">
                <td class="p-3 font-medium">{{ profile.id }}</td>
                <td class="p-3">{{ profile.type }}</td>
                <td class="p-3">{{ profile.cwd }}</td>
                <td class="p-3">{{ enabledText(profile.enabled) }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="selectedTab === 'routeBindings'" class="mt-6 space-y-4">
          <div class="rounded border bg-white p-4">
            <div class="grid grid-cols-[1fr_1fr_auto] gap-2">
              <select v-model="selectedRouteProfile" class="rounded border px-3 py-2" data-testid="route-profile">
                <option v-for="profile in profiles" :key="profile.id" :value="profile.id">{{ profile.id }}</option>
              </select>
              <select v-model="selectedRouteInstance" class="rounded border px-3 py-2" data-testid="route-instance">
                <option v-for="instance in instances" :key="instance.id" :value="instance.id">{{ instance.name }}</option>
              </select>
              <button class="rounded bg-slate-900 px-3 py-2 text-white" data-testid="create-route" @click="createRoute">
                <GitBranch :size="14" class="inline" />
                {{ text('createRoute') }}
              </button>
            </div>
          </div>
          <table class="w-full rounded border bg-white text-sm">
            <tbody>
              <tr v-for="route in routes" :key="route.id" class="border-t" data-testid="route-row">
                <td class="p-3 font-medium">{{ route.profileId }}</td>
                <td class="p-3 font-mono text-xs">{{ route.instanceId }}</td>
                <td class="p-3 text-right">
                  <button class="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs" @click="deleteRoute(route)">
                    <Trash2 :size="14" />
                    {{ text('deleteRoute') }}
                  </button>
                </td>
              </tr>
              <tr v-if="routes.length === 0">
                <td class="p-3 text-slate-500" colspan="3">{{ text('noRows') }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="selectedTab === 'accounts'" class="mt-6 space-y-4">
          <div class="rounded border bg-white p-4">
            <div class="grid grid-cols-[180px_1fr_auto] gap-2">
              <input v-model="newAccountId" class="rounded border px-3 py-2" data-testid="account-id" />
              <input v-model="newAccountName" class="rounded border px-3 py-2" data-testid="account-name" />
              <button class="rounded bg-slate-900 px-3 py-2 text-white" data-testid="create-account" @click="createAccount">
                {{ text('createAccount') }}
              </button>
            </div>
          </div>
          <div v-if="lastAuthSession" class="rounded border border-blue-200 bg-blue-50 p-3 text-sm">
            <p>{{ text('authInstruction') }}</p>
            <p v-if="lastAuthSession.authUrl" class="mt-2">
              {{ text('authUrl') }}:
              <a class="font-mono text-blue-700 underline" :href="lastAuthSession.authUrl" target="_blank">{{ lastAuthSession.authUrl }}</a>
            </p>
            <p v-if="lastAuthSession.userCode" class="mt-1 font-mono">{{ text('userCode') }}: {{ lastAuthSession.userCode }}</p>
          </div>
          <table class="w-full rounded border bg-white text-sm">
            <tbody>
              <tr v-for="account in accounts" :key="account.id" class="border-t" data-testid="account-row">
                <td class="p-3 font-medium">{{ account.name }}</td>
                <td class="p-3 font-mono text-xs">{{ account.id }}</td>
                <td class="p-3">{{ account.providerType }}</td>
                <td class="p-3">{{ account.authState }}</td>
                <td class="p-3 text-right">
                  <button class="mr-2 rounded border border-slate-300 px-2 py-1 text-xs" @click="startAuth(account)">
                    {{ text('startAuth') }}
                  </button>
                  <button class="rounded border border-slate-300 px-2 py-1 text-xs" @click="pollAuth(account)">
                    {{ text('pollAuth') }}
                  </button>
                  <button class="ml-2 inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs" @click="logoutAccount(account)">
                    <LogOut :size="14" />
                    {{ text('logout') }}
                  </button>
                </td>
              </tr>
              <tr v-if="accounts.length === 0">
                <td class="p-3 text-slate-500" colspan="5">{{ text('noRows') }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="selectedTab === 'instances'" class="mt-6 space-y-4">
          <div class="rounded border bg-white p-4">
            <div class="grid grid-cols-[180px_180px_1fr_120px_auto] gap-2">
              <select v-model="selectedAccountId" class="rounded border px-3 py-2" data-testid="instance-account">
                <option v-for="account in accounts" :key="account.id" :value="account.id">{{ account.name }}</option>
              </select>
              <input v-model="newInstanceId" class="rounded border px-3 py-2" data-testid="instance-id" />
              <input v-model="newInstanceCwd" class="rounded border px-3 py-2" data-testid="instance-cwd" />
              <input
                v-model.number="newInstanceConcurrency"
                class="rounded border px-3 py-2"
                data-testid="instance-concurrency"
                min="1"
                type="number"
              />
              <button class="rounded bg-slate-900 px-3 py-2 text-white" data-testid="create-instance" @click="createInstance">
                {{ text('createInstance') }}
              </button>
            </div>
            <input v-model="newInstanceName" class="mt-2 w-full rounded border px-3 py-2" data-testid="instance-name" />
          </div>
          <table class="w-full rounded border bg-white text-sm">
            <tbody>
              <tr v-for="instance in instances" :key="instance.id" class="border-t" data-testid="instance-row">
                <td class="p-3">
                  <input v-model="instance.name" class="w-full rounded border px-2 py-1 font-medium" />
                </td>
                <td class="p-3 font-mono text-xs">{{ instance.id }}</td>
                <td class="p-3">{{ instance.type }}</td>
                <td class="p-3">
                  <input v-model="instance.cwd" class="w-full rounded border px-2 py-1" />
                </td>
                <td class="p-3">{{ instance.healthState }}</td>
                <td class="p-3">
                  {{ instance.currentRuns }} /
                  <input v-model.number="instance.maxConcurrentRuns" class="w-16 rounded border px-2 py-1" min="1" type="number" />
                </td>
                <td class="p-3">{{ enabledText(instance.enabled) }}</td>
                <td class="p-3 text-right">
                  <button class="mr-2 inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs" @click="saveInstance(instance)">
                    <Save :size="14" />
                    {{ text('save') }}
                  </button>
                  <button class="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs" @click="disableInstance(instance)">
                    <Ban :size="14" />
                    {{ text('disableInstance') }}
                  </button>
                </td>
              </tr>
              <tr v-if="instances.length === 0">
                <td class="p-3 text-slate-500" colspan="8">{{ text('noRows') }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="selectedTab === 'keys'" class="mt-6 space-y-4">
          <div class="rounded border bg-white p-4">
            <div class="grid grid-cols-[1fr_110px_110px_110px_140px_auto] gap-2">
              <input v-model="newKeyName" class="rounded border px-3 py-2" data-testid="key-name" />
              <input v-model.number="newKeyDailyLimit" class="rounded border px-3 py-2" :aria-label="text('dailyLimit')" type="number" />
              <input v-model.number="newKeyRpmLimit" class="rounded border px-3 py-2" :aria-label="text('rpmLimit')" type="number" />
              <input v-model.number="newKeyConcurrentLimit" class="rounded border px-3 py-2" :aria-label="text('concurrentLimit')" type="number" />
              <input v-model.number="newKeyMonthlyTokenLimit" class="rounded border px-3 py-2" :aria-label="text('monthlyTokenLimit')" type="number" />
              <button class="rounded bg-slate-900 px-3 py-2 text-white" data-testid="create-key" @click="createKey">
                {{ text('createApiKey') }}
              </button>
            </div>
            <p v-if="createdToken" class="mt-3 break-all rounded bg-slate-100 p-2 text-xs" data-testid="created-token">
              {{ createdToken }}
            </p>
          </div>
          <table class="w-full rounded border bg-white text-sm">
            <tbody>
              <tr v-for="key in keys" :key="key.id" class="border-t" data-testid="key-row">
                <td class="p-3 font-medium">{{ key.name }}</td>
                <td class="p-3">{{ key.keyPrefix }}</td>
                <td class="p-3">{{ enabledText(key.enabled) }}</td>
                <td class="p-3">
                  {{ monthlyUsageByKey.get(key.id)?.runCount ?? 0 }} runs /
                  {{ monthlyUsageByKey.get(key.id)?.totalTokens ?? 0 }} tokens
                </td>
                <td class="p-3 text-right">
                  <button
                    class="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="key.enabled !== 1"
                    @click="revokeKey(key)"
                  >
                    <Ban :size="14" />
                    {{ text('revoke') }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="selectedTab === 'runs'" class="mt-6 space-y-4">
          <div class="rounded border bg-white p-4">
            <div class="grid grid-cols-[180px_1fr_auto] gap-2">
              <select v-model="selectedProfile" class="rounded border px-3 py-2" data-testid="run-profile">
                <option v-for="profile in profiles" :key="profile.id" :value="profile.id">{{ profile.id }}</option>
              </select>
              <input v-model="prompt" class="rounded border px-3 py-2" data-testid="run-prompt" />
              <button class="rounded bg-slate-900 px-3 py-2 text-white" data-testid="run-submit" @click="createRun">
                {{ text('createRun') }}
              </button>
            </div>
          </div>
          <table class="w-full rounded border bg-white text-sm">
            <tbody>
              <tr v-for="run in runs" :key="run.id" class="border-t align-top" data-testid="run-row">
                <td class="p-3 font-mono text-xs" data-testid="run-id">{{ run.id }}</td>
                <td class="p-3">{{ run.profileId }}</td>
                <td class="p-3">{{ run.upstreamInstanceId || '-' }}</td>
                <td class="p-3">{{ run.status }}</td>
                <td class="p-3">{{ run.output || run.errorCode }}</td>
                <td class="p-3 text-right">
                  <button
                    class="inline-flex items-center gap-1 rounded border border-slate-300 px-2 py-1 text-xs"
                    @click="loadRunEvents(run)"
                  >
                    <Eye :size="14" />
                    {{ text('viewEvents') }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="selectedRunId" class="rounded border bg-white p-4" data-testid="run-events">
            <div class="mb-3 flex items-center justify-between">
              <p class="text-sm font-medium">{{ text('events') }}</p>
              <p class="font-mono text-xs text-slate-500">{{ selectedRunId }}</p>
            </div>
            <pre class="max-h-80 overflow-auto whitespace-pre-wrap rounded bg-slate-950 p-3 text-xs text-slate-100">{{ formattedRunEvents }}</pre>
          </div>
        </div>

        <div v-if="selectedTab === 'users'" class="mt-6 rounded border bg-white">
          <div class="grid grid-cols-[1fr_1fr_auto] gap-2 border-b p-4">
            <input v-model="newUserEmail" class="rounded border px-3 py-2" data-testid="user-email" :placeholder="text('email')" />
            <input v-model="newUserPassword" class="rounded border px-3 py-2" data-testid="user-password" :placeholder="text('password')" />
            <button class="rounded bg-slate-900 px-3 py-2 text-white" data-testid="create-user" @click="createUser">
              <UserPlus :size="14" class="inline" />
              {{ text('createUser') }}
            </button>
          </div>
          <div v-for="user in users" :key="user.id" class="flex justify-between border-t p-3 text-sm">
            <span>{{ user.email }}</span>
            <span>{{ user.role }}</span>
          </div>
        </div>
      </section>
    </section>
  </main>
</template>
