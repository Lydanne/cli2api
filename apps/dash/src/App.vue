<script setup lang="ts">
import { Activity, KeyRound, Play, Server, Users } from "lucide-vue-next";
import { computed, onMounted, ref } from "vue";
import { ApiError, createDashboardApi } from "./lib/api";
import { summarizeOverview } from "./lib/overview";
import type { AdapterProfileView, ApiKeyView, AdminUser, RunView } from "./types";

const client = createDashboardApi();
const email = ref("admin@example.com");
const password = ref("password");
const loggedIn = ref(false);
const error = ref("");
const users = ref<AdminUser[]>([]);
const profiles = ref<AdapterProfileView[]>([]);
const keys = ref<ApiKeyView[]>([]);
const runs = ref<RunView[]>([]);
const selectedTab = ref("overview");
const newProfileId = ref("mock-default");
const newKeyName = ref("dev-key");
const prompt = ref("hello from dashboard");
const selectedProfile = ref("");
const createdToken = ref("");

const summary = computed(() =>
  summarizeOverview({
    profiles: profiles.value,
    apiKeys: keys.value,
    runs: runs.value
  })
);

async function login() {
  await action(async () => {
    await client.login({ email: email.value, password: password.value });
    loggedIn.value = true;
    await refresh();
  });
}

async function refresh(options: { silent?: boolean } = {}) {
  await action(async () => {
    const [userRows, profileRows, keyRows, runRows] = await Promise.all([
      client.users(),
      client.profiles(),
      client.apiKeys(),
      client.runs()
    ]);
    users.value = userRows;
    profiles.value = profileRows;
    keys.value = keyRows;
    runs.value = runRows;
    selectedProfile.value = profiles.value[0]?.id ?? "";
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
      dailyRunLimit: 100,
      rpmLimit: 60,
      maxConcurrentRuns: 2
    });
    createdToken.value = created.token ?? "";
    await refresh();
  });
}

async function createRun() {
  await action(async () => {
    if (!createdToken.value) {
      throw new Error("Create an API key first.");
    }
    await client.createRun(createdToken.value, { prompt: prompt.value, profileId: selectedProfile.value });
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
          <input v-model="email" class="w-full rounded border px-3 py-2" data-testid="login-email" placeholder="Email" />
          <input
            v-model="password"
            class="w-full rounded border px-3 py-2"
            data-testid="login-password"
            placeholder="Password"
            type="password"
          />
          <button class="w-full rounded bg-slate-900 px-3 py-2 text-white">Login</button>
        </div>
        <p v-if="error" class="mt-3 text-sm text-red-600">{{ error }}</p>
      </form>
    </section>

    <section v-else class="grid min-h-screen grid-cols-[240px_1fr]">
      <aside class="border-r border-slate-200 bg-white p-4">
        <h1 class="text-lg font-semibold">cli2api</h1>
        <nav class="mt-6 space-y-1">
          <button
            v-for="item in [
              ['overview', Activity, 'Overview'],
              ['runs', Play, 'Runs'],
              ['keys', KeyRound, 'API Keys'],
              ['profiles', Server, 'Profiles'],
              ['users', Users, 'Users']
            ]"
            :key="item[0] as string"
            class="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm"
            :class="selectedTab === item[0] ? 'bg-slate-900 text-white' : 'hover:bg-slate-100'"
            :data-testid="`nav-${item[0]}`"
            @click="selectedTab = item[0] as string"
          >
            <component :is="item[1]" :size="16" />
            {{ item[2] }}
          </button>
        </nav>
      </aside>

      <section class="p-6">
        <header class="flex items-center justify-between">
          <div>
            <h2 class="text-2xl font-semibold capitalize">{{ selectedTab }}</h2>
            <p class="text-sm text-slate-500">Operational control plane for CLI adapters.</p>
          </div>
          <button class="rounded border border-slate-300 bg-white px-3 py-2 text-sm" @click="refresh">Refresh</button>
        </header>

        <p v-if="error" class="mt-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{{ error }}</p>

        <div v-if="selectedTab === 'overview'" class="mt-6 grid grid-cols-5 gap-3">
          <div v-for="card in [
            ['Enabled profiles', summary.enabledProfiles],
            ['Active keys', summary.activeApiKeys],
            ['Running', summary.runningRuns],
            ['Failed', summary.failedRuns],
            ['Completed', summary.completedRuns]
          ]" :key="card[0] as string" class="rounded border bg-white p-4">
            <p class="text-xs uppercase text-slate-500">{{ card[0] }}</p>
            <p class="mt-2 text-2xl font-semibold">{{ card[1] }}</p>
          </div>
        </div>

        <div v-if="selectedTab === 'profiles'" class="mt-6 space-y-4">
          <div class="rounded border bg-white p-4">
            <div class="flex gap-2">
              <input v-model="newProfileId" class="rounded border px-3 py-2" data-testid="profile-id" />
              <button class="rounded bg-slate-900 px-3 py-2 text-white" data-testid="create-profile" @click="createProfile">
                Create mock profile
              </button>
            </div>
          </div>
          <table class="w-full rounded border bg-white text-sm">
            <tbody>
              <tr v-for="profile in profiles" :key="profile.id" class="border-t">
                <td class="p-3 font-medium">{{ profile.id }}</td>
                <td class="p-3">{{ profile.type }}</td>
                <td class="p-3">{{ profile.cwd }}</td>
                <td class="p-3">{{ profile.enabled ? 'enabled' : 'disabled' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="selectedTab === 'keys'" class="mt-6 space-y-4">
          <div class="rounded border bg-white p-4">
            <div class="flex gap-2">
              <input v-model="newKeyName" class="rounded border px-3 py-2" data-testid="key-name" />
              <button class="rounded bg-slate-900 px-3 py-2 text-white" data-testid="create-key" @click="createKey">
                Create API key
              </button>
            </div>
            <p v-if="createdToken" class="mt-3 break-all rounded bg-slate-100 p-2 text-xs" data-testid="created-token">
              {{ createdToken }}
            </p>
          </div>
          <table class="w-full rounded border bg-white text-sm">
            <tbody>
              <tr v-for="key in keys" :key="key.id" class="border-t">
                <td class="p-3 font-medium">{{ key.name }}</td>
                <td class="p-3">{{ key.keyPrefix }}</td>
                <td class="p-3">{{ key.enabled ? 'enabled' : 'disabled' }}</td>
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
                Run
              </button>
            </div>
          </div>
          <table class="w-full rounded border bg-white text-sm">
            <tbody>
              <tr v-for="run in runs" :key="run.id" class="border-t align-top" data-testid="run-row">
                <td class="p-3 font-mono text-xs" data-testid="run-id">{{ run.id }}</td>
                <td class="p-3">{{ run.profileId }}</td>
                <td class="p-3">{{ run.status }}</td>
                <td class="p-3">{{ run.output || run.errorCode }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="selectedTab === 'users'" class="mt-6 rounded border bg-white">
          <div v-for="user in users" :key="user.id" class="flex justify-between border-t p-3 text-sm">
            <span>{{ user.email }}</span>
            <span>{{ user.role }}</span>
          </div>
        </div>
      </section>
    </section>
  </main>
</template>
