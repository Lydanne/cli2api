<script setup lang="ts">
import type { AgentEvent } from "@cli2api/shared";
import {
  Activity,
  Database,
  GitBranch,
  Globe2,
  KeyRound,
  Play,
  Server,
  Users
} from "lucide-vue-next";
import Button from "primevue/button";
import Card from "primevue/card";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import Select from "primevue/select";
import Tag from "primevue/tag";
import Toolbar from "primevue/toolbar";
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ApiError, createDashboardApi } from "./lib/api";
import { summarizeOverview } from "./lib/overview";
import { dashboardTabRoutes, type DashboardRouteName } from "./router";
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
    subtitle: "面向 CLI Agent 的本地运营控制台",
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
    subtitle: "Local operations control plane for CLI agents",
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
const route = useRoute();
const vueRouter = useRouter();
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
const selectedTab = computed<DashboardRouteName>(() => (isDashboardRouteName(route.name) ? route.name : "overview"));
const currentTitle = computed(() => navItems.value.find((item) => item[0] === selectedTab.value)?.[2] ?? text("overview"));
const profileOptions = computed(() => profiles.value.map((profile) => ({ label: profile.id, value: profile.id })));
const accountOptions = computed(() => accounts.value.map((account) => ({ label: account.name, value: account.id })));
const instanceOptions = computed(() => instances.value.map((instance) => ({ label: instance.name, value: instance.id })));
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

async function refresh(options: { silent?: boolean } = {}): Promise<boolean> {
  return action(async () => {
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

function enabledText(value: boolean | number): string {
  return value ? text("enabled") : text("disabled");
}

function statusSeverity(value: boolean | number | string): "success" | "info" | "warn" | "danger" | "secondary" {
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

function isDashboardRouteName(value: unknown): value is DashboardRouteName {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(dashboardTabRoutes, value);
}

function selectTab(tab: DashboardRouteName): void {
  void vueRouter.push({ name: tab });
}

onMounted(async () => {
  loggedIn.value = await refresh({ silent: true });
});
</script>

<template>
  <main class="min-h-screen bg-slate-100 text-slate-900">
    <section v-if="!loggedIn" class="mx-auto flex min-h-screen max-w-md items-center px-4">
      <Card class="w-full border border-slate-200 shadow-sm">
        <template #title>cli2api</template>
        <template #subtitle>{{ text('subtitle') }}</template>
        <template #content>
          <form class="space-y-4" @submit.prevent="login">
            <InputText v-model="email" class="w-full" data-testid="login-email" :placeholder="text('email')" />
            <InputText
              v-model="password"
              class="w-full"
              data-testid="login-password"
              :placeholder="text('password')"
              type="password"
            />
            <Button class="w-full" data-testid="login-submit" :label="text('login')" type="submit" />
            <Message v-if="error" severity="error" size="small">{{ error }}</Message>
          </form>
        </template>
      </Card>
    </section>

    <section v-else class="grid min-h-screen grid-cols-[260px_1fr]">
      <aside class="border-r border-slate-200 bg-white p-4">
        <div class="px-2">
          <h1 class="text-xl font-semibold">cli2api</h1>
          <p class="mt-1 text-xs text-slate-500">{{ text('subtitle') }}</p>
        </div>
        <nav class="mt-6 space-y-1">
          <button
            v-for="item in navItems"
            :key="item[0]"
            class="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm transition"
            :class="selectedTab === item[0] ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'"
            :data-testid="`nav-${item[0]}`"
            @click="selectTab(item[0])"
          >
            <component :is="item[1]" :size="16" />
            <span>{{ item[2] }}</span>
          </button>
        </nav>
      </aside>

      <section class="min-w-0 p-6">
        <Toolbar class="mb-5 border border-slate-200 bg-white">
          <template #start>
            <div>
              <h2 class="text-2xl font-semibold">{{ currentTitle }}</h2>
              <p class="text-sm text-slate-500">{{ text('subtitle') }}</p>
            </div>
          </template>
          <template #end>
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
              <Button :label="text('refresh')" outlined size="small" @click="refresh()" />
            </div>
          </template>
        </Toolbar>

        <Message v-if="error" class="mb-4" severity="error">{{ error }}</Message>

        <div v-if="selectedTab === 'overview'" class="grid grid-cols-5 gap-3">
          <Card v-for="card in [
            [text('enabledProfiles'), summary.enabledProfiles],
            [text('activeKeys'), summary.activeApiKeys],
            [text('running'), summary.runningRuns],
            [text('failed'), summary.failedRuns],
            [text('completed'), summary.completedRuns]
          ]" :key="card[0] as string" class="border border-slate-200 shadow-sm">
            <template #content>
              <p class="text-xs uppercase text-slate-500">{{ card[0] }}</p>
              <p class="mt-2 text-3xl font-semibold">{{ card[1] }}</p>
            </template>
          </Card>
        </div>

        <Card v-if="selectedTab === 'profiles'" class="border border-slate-200 shadow-sm">
          <template #title>{{ text('profiles') }}</template>
          <template #content>
            <div class="mb-4 flex gap-2">
              <InputText v-model="newProfileId" data-testid="profile-id" />
              <Button data-testid="create-profile" :label="text('createMockProfile')" @click="createProfile" />
            </div>
            <DataTable :value="profiles" dataKey="id" size="small" stripedRows>
              <Column field="id" header="Profile" />
              <Column field="type" header="Type" />
              <Column field="cwd" header="CWD" />
              <Column header="Status">
                <template #body="{ data }">
                  <Tag :severity="statusSeverity(data.enabled)" :value="enabledText(data.enabled)" />
                </template>
              </Column>
            </DataTable>
          </template>
        </Card>

        <Card v-if="selectedTab === 'routeBindings'" class="border border-slate-200 shadow-sm">
          <template #title>{{ text('routeBindings') }}</template>
          <template #content>
            <div class="mb-4 grid grid-cols-[1fr_1fr_auto] gap-2">
              <Select
                v-model="selectedRouteProfile"
                data-testid="route-profile"
                optionLabel="label"
                optionValue="value"
                :options="profileOptions"
              />
              <Select
                v-model="selectedRouteInstance"
                data-testid="route-instance"
                optionLabel="label"
                optionValue="value"
                :options="instanceOptions"
              />
              <Button data-testid="create-route" :label="text('createRoute')" @click="createRoute" />
            </div>
            <DataTable :value="routes" dataKey="id" size="small" stripedRows>
              <Column field="profileId" header="Profile" />
              <Column field="instanceId" header="Instance" />
              <Column headerStyle="width: 160px" :header="text('deleteRoute')">
                <template #body="{ data }">
                  <Button
                    :data-testid="`delete-route-${data.id}`"
                    :label="text('deleteRoute')"
                    outlined
                    severity="danger"
                    size="small"
                    @click="deleteRoute(data)"
                  />
                </template>
              </Column>
              <template #empty>{{ text('noRows') }}</template>
            </DataTable>
          </template>
        </Card>

        <Card v-if="selectedTab === 'accounts'" class="border border-slate-200 shadow-sm">
          <template #title>{{ text('accounts') }}</template>
          <template #content>
            <div class="mb-4 grid grid-cols-[180px_1fr_auto] gap-2">
              <InputText v-model="newAccountId" data-testid="account-id" />
              <InputText v-model="newAccountName" data-testid="account-name" />
              <Button data-testid="create-account" :label="text('createAccount')" @click="createAccount" />
            </div>
            <Message v-if="lastAuthSession" class="mb-4" severity="info">
              <p>{{ text('authInstruction') }}</p>
              <p v-if="lastAuthSession.authUrl" class="mt-2">
                {{ text('authUrl') }}:
                <a class="font-mono underline" :href="lastAuthSession.authUrl" target="_blank">{{ lastAuthSession.authUrl }}</a>
              </p>
              <p v-if="lastAuthSession.userCode" class="mt-1 font-mono">{{ text('userCode') }}: {{ lastAuthSession.userCode }}</p>
            </Message>
            <DataTable :value="accounts" dataKey="id" size="small" stripedRows>
              <Column field="name" header="Name" />
              <Column field="id" header="ID" />
              <Column field="providerType" header="Provider" />
              <Column header="Auth">
                <template #body="{ data }">
                  <Tag :severity="statusSeverity(data.authState)" :value="data.authState" />
                </template>
              </Column>
              <Column headerStyle="width: 330px" header="Actions">
                <template #body="{ data }">
                  <div class="flex gap-2">
                    <Button
                      :data-testid="`auth-${data.id}`"
                      :label="text('startAuth')"
                      outlined
                      size="small"
                      @click="startAuth(data)"
                    />
                    <Button
                      :data-testid="`poll-${data.id}`"
                      :label="text('pollAuth')"
                      outlined
                      size="small"
                      @click="pollAuth(data)"
                    />
                    <Button
                      :data-testid="`logout-${data.id}`"
                      :label="text('logout')"
                      outlined
                      severity="secondary"
                      size="small"
                      @click="logoutAccount(data)"
                    />
                  </div>
                </template>
              </Column>
              <template #empty>{{ text('noRows') }}</template>
            </DataTable>
          </template>
        </Card>

        <Card v-if="selectedTab === 'instances'" class="border border-slate-200 shadow-sm">
          <template #title>{{ text('instances') }}</template>
          <template #content>
            <div class="mb-4 grid grid-cols-[180px_160px_1fr_110px_auto] gap-2">
              <Select
                v-model="selectedAccountId"
                data-testid="instance-account"
                optionLabel="label"
                optionValue="value"
                :options="accountOptions"
              />
              <InputText v-model="newInstanceId" data-testid="instance-id" />
              <InputText v-model="newInstanceCwd" data-testid="instance-cwd" />
              <InputText v-model.number="newInstanceConcurrency" data-testid="instance-concurrency" type="number" />
              <Button data-testid="create-instance" :label="text('createInstance')" @click="createInstance" />
            </div>
            <InputText v-model="newInstanceName" class="mb-4 w-full" data-testid="instance-name" />
            <DataTable :value="instances" dataKey="id" size="small" stripedRows>
              <Column header="Name">
                <template #body="{ data }">
                  <InputText v-model="data.name" class="w-full" />
                </template>
              </Column>
              <Column field="id" header="ID" />
              <Column field="type" header="Type" />
              <Column header="CWD">
                <template #body="{ data }">
                  <InputText v-model="data.cwd" class="w-full" />
                </template>
              </Column>
              <Column header="Health">
                <template #body="{ data }">
                  <Tag :severity="statusSeverity(data.healthState)" :value="data.healthState" />
                </template>
              </Column>
              <Column header="Concurrency">
                <template #body="{ data }">
                  <div class="flex items-center gap-2">
                    <span>{{ data.currentRuns }} /</span>
                    <InputText v-model.number="data.maxConcurrentRuns" class="w-16" type="number" />
                  </div>
                </template>
              </Column>
              <Column header="Status">
                <template #body="{ data }">
                  <Tag :severity="statusSeverity(data.enabled)" :value="enabledText(data.enabled)" />
                </template>
              </Column>
              <Column headerStyle="width: 220px" header="Actions">
                <template #body="{ data }">
                  <div class="flex gap-2">
                    <Button :label="text('save')" outlined size="small" @click="saveInstance(data)" />
                    <Button
                      :data-testid="`disable-instance-${data.id}`"
                      :label="text('disableInstance')"
                      outlined
                      severity="danger"
                      size="small"
                      @click="disableInstance(data)"
                    />
                  </div>
                </template>
              </Column>
              <template #empty>{{ text('noRows') }}</template>
            </DataTable>
          </template>
        </Card>

        <Card v-if="selectedTab === 'keys'" class="border border-slate-200 shadow-sm">
          <template #title>{{ text('keys') }}</template>
          <template #content>
            <div class="mb-4 grid grid-cols-[1fr_110px_110px_110px_140px_auto] gap-2">
              <InputText v-model="newKeyName" data-testid="key-name" />
              <InputText v-model.number="newKeyDailyLimit" :aria-label="text('dailyLimit')" type="number" />
              <InputText v-model.number="newKeyRpmLimit" :aria-label="text('rpmLimit')" type="number" />
              <InputText v-model.number="newKeyConcurrentLimit" :aria-label="text('concurrentLimit')" type="number" />
              <InputText v-model.number="newKeyMonthlyTokenLimit" :aria-label="text('monthlyTokenLimit')" type="number" />
              <Button data-testid="create-key" :label="text('createApiKey')" @click="createKey" />
            </div>
            <Message v-if="createdToken" class="mb-4 break-all font-mono text-xs" data-testid="created-token" severity="success">
              {{ createdToken }}
            </Message>
            <DataTable :value="keys" dataKey="id" size="small" stripedRows>
              <Column field="name" header="Name" />
              <Column field="keyPrefix" header="Prefix" />
              <Column header="Status">
                <template #body="{ data }">
                  <Tag :severity="statusSeverity(data.enabled)" :value="enabledText(data.enabled)" />
                </template>
              </Column>
              <Column header="Usage">
                <template #body="{ data }">
                  {{ monthlyUsageByKey.get(data.id)?.runCount ?? 0 }} runs /
                  {{ monthlyUsageByKey.get(data.id)?.totalTokens ?? 0 }} tokens
                </template>
              </Column>
              <Column headerStyle="width: 120px" header="Actions">
                <template #body="{ data }">
                  <Button
                    :data-testid="`revoke-key-${data.name}`"
                    :disabled="data.enabled !== 1"
                    :label="text('revoke')"
                    outlined
                    severity="danger"
                    size="small"
                    @click="revokeKey(data)"
                  />
                </template>
              </Column>
              <template #empty>{{ text('noRows') }}</template>
            </DataTable>
          </template>
        </Card>

        <Card v-if="selectedTab === 'runs'" class="border border-slate-200 shadow-sm">
          <template #title>{{ text('runs') }}</template>
          <template #content>
            <div class="mb-4 grid grid-cols-[220px_1fr_auto] gap-2">
              <Select
                v-model="selectedProfile"
                data-testid="run-profile"
                optionLabel="label"
                optionValue="value"
                :options="profileOptions"
              />
              <InputText v-model="prompt" data-testid="run-prompt" />
              <Button data-testid="run-submit" :label="text('createRun')" @click="createRun" />
            </div>
            <DataTable :value="runs" dataKey="id" size="small" stripedRows>
              <Column header="Run">
                <template #body="{ data }">
                  <span data-testid="run-id" class="font-mono text-xs">{{ data.id }}</span>
                </template>
              </Column>
              <Column field="profileId" header="Profile" />
              <Column field="prompt" header="Prompt" />
              <Column field="upstreamInstanceId" header="Instance" />
              <Column header="Status">
                <template #body="{ data }">
                  <Tag :severity="statusSeverity(data.status)" :value="data.status" />
                </template>
              </Column>
              <Column header="Output">
                <template #body="{ data }">
                  {{ data.output || data.errorCode }}
                </template>
              </Column>
              <Column headerStyle="width: 130px" header="Actions">
                <template #body="{ data }">
                  <Button :label="text('viewEvents')" outlined size="small" @click="loadRunEvents(data)" />
                </template>
              </Column>
            </DataTable>
            <Card v-if="selectedRunId" class="mt-4 bg-slate-950 text-slate-100" data-testid="run-events">
              <template #title>
                <span class="text-sm text-slate-100">{{ text('events') }}</span>
              </template>
              <template #subtitle>
                <span class="font-mono text-xs text-slate-300">{{ selectedRunId }}</span>
              </template>
              <template #content>
                <pre class="max-h-80 overflow-auto whitespace-pre-wrap text-xs">{{ formattedRunEvents }}</pre>
              </template>
            </Card>
          </template>
        </Card>

        <Card v-if="selectedTab === 'users'" class="border border-slate-200 shadow-sm">
          <template #title>{{ text('users') }}</template>
          <template #content>
            <div class="mb-4 grid grid-cols-[1fr_1fr_auto] gap-2">
              <InputText v-model="newUserEmail" data-testid="user-email" :placeholder="text('email')" />
              <InputText v-model="newUserPassword" data-testid="user-password" :placeholder="text('password')" type="password" />
              <Button data-testid="create-user" :label="text('createUser')" @click="createUser" />
            </div>
            <DataTable :value="users" dataKey="id" size="small" stripedRows>
              <Column field="email" :header="text('email')" />
              <Column field="role" header="Role" />
              <Column header="Status">
                <template #body="{ data }">
                  <Tag :severity="statusSeverity(!data.disabledAt)" :value="data.disabledAt ? text('disabled') : text('enabled')" />
                </template>
              </Column>
              <template #empty>{{ text('noRows') }}</template>
            </DataTable>
          </template>
        </Card>
      </section>
    </section>
  </main>
</template>
