<script setup lang="ts">
import {
  Activity,
  Database,
  GitBranch,
  Globe2,
  KeyRound,
  Play,
  RefreshCw,
  Server,
  Users
} from "lucide-vue-next";
import Button from "primevue/button";
import Message from "primevue/message";
import Toolbar from "primevue/toolbar";
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { localeOptions, type Locale } from "../lib/i18n";
import { useDashboardState } from "../lib/dashboard-state";
import { dashboardTabRoutes, type DashboardRouteName } from "../router";

const route = useRoute();
const router = useRouter();
const { error, locale, refresh, setLocale, text, summary } = useDashboardState();

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
const selectedRoute = computed<DashboardRouteName>(() => (isDashboardRouteName(route.name) ? route.name : "overview"));
const currentTitle = computed(() => navItems.value.find((item) => item[0] === selectedRoute.value)?.[2] ?? text("overview"));

function navigate(name: DashboardRouteName): void {
  void router.push({ name });
}

function isDashboardRouteName(value: unknown): value is DashboardRouteName {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(dashboardTabRoutes, value);
}
</script>

<template>
  <section class="grid min-h-screen grid-cols-1 lg:grid-cols-[248px_1fr]">
    <aside class="border-b border-slate-200 bg-white px-4 py-4 lg:border-b-0 lg:border-r">
      <div class="flex items-center justify-between gap-3 lg:block">
        <div class="px-1">
          <h1 class="text-xl font-semibold tracking-normal">cli2api</h1>
          <p class="mt-1 text-xs text-slate-500">{{ text("subtitle") }}</p>
        </div>
        <div class="hidden rounded border border-slate-200 px-2 py-1 text-xs text-slate-500 sm:block lg:mt-4">
          {{ text("availableSlots") }} {{ summary.availableSlots }}
        </div>
      </div>

      <nav class="mt-4 grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-1">
        <button
          v-for="item in navItems"
          :key="item[0]"
          class="flex min-h-10 w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition"
          :class="selectedRoute === item[0] ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'"
          :data-testid="`nav-${item[0]}`"
          type="button"
          @click="navigate(item[0])"
        >
          <component :is="item[1]" :size="16" />
          <span>{{ item[2] }}</span>
        </button>
      </nav>
    </aside>

    <section class="min-w-0 p-4 sm:p-6">
      <Toolbar class="mb-5 border border-slate-200 bg-white shadow-sm">
        <template #start>
          <div>
            <h2 class="text-2xl font-semibold tracking-normal">{{ currentTitle }}</h2>
            <p class="text-sm text-slate-500">
              {{ text("downstreamKeys") }} {{ summary.activeApiKeys }} /
              {{ text("accountPoolHealth") }} {{ summary.authenticatedAccounts }} /
              {{ text("activeRoutes") }} {{ summary.routedProfiles }}
            </p>
          </div>
        </template>
        <template #end>
          <div class="flex items-center gap-2">
            <select
              :value="locale"
              class="min-h-9 rounded-md border border-slate-300 bg-white px-2 text-sm"
              data-testid="locale-switch"
              :aria-label="text('language')"
              @change="setLocale(($event.target as HTMLSelectElement).value as Locale)"
            >
              <option v-for="option in localeOptions" :key="option.value" :value="option.value">
                {{ option.label }}
              </option>
            </select>
            <Button outlined size="small" @click="refresh()">
              <RefreshCw :size="15" />
              <span class="ml-2">{{ text("refresh") }}</span>
            </Button>
          </div>
        </template>
      </Toolbar>

      <Message v-if="error" class="mb-4" severity="error">{{ error }}</Message>
      <RouterView />
    </section>
  </section>
</template>
