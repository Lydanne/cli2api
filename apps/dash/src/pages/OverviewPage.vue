<script setup lang="ts">
import { ArrowRight, Check } from "lucide-vue-next";
import Button from "primevue/button";
import Card from "primevue/card";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Tag from "primevue/tag";
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useDashboardState } from "../lib/dashboard-state";
import type { DashboardRouteName } from "../router";

interface SetupStep {
  key: string;
  label: string;
  count: number;
  done: boolean;
  route: DashboardRouteName;
}

const {
  accounts,
  instances,
  keys,
  profiles,
  routes,
  runs,
  summary,
  accountName,
  instanceName,
  statusLabel,
  statusSeverity,
  text
} = useDashboardState();
const router = useRouter();

const metricCards = computed(() => [
  { label: text("enabledProfiles"), value: summary.value.enabledProfiles },
  { label: text("activeKeys"), value: summary.value.activeApiKeys },
  { label: text("accountPoolHealth"), value: summary.value.authenticatedAccounts },
  { label: text("availableSlots"), value: summary.value.availableSlots },
  { label: text("failed"), value: summary.value.failedRuns }
]);
const recentRuns = computed(() => runs.value.slice(-6).reverse());
const routeGaps = computed(() => {
  const routed = new Set(routes.value.map((route) => route.profileId));
  return profiles.value.filter((profile) => profile.enabled && !routed.has(profile.id));
});
const setupSteps = computed<SetupStep[]>(() => [
  {
    key: "account",
    label: text("setupAccount"),
    count: accounts.value.filter((account) => account.authState === "authenticated" && !account.disabledAt).length,
    done: summary.value.authenticatedAccounts > 0,
    route: "accounts"
  },
  {
    key: "instance",
    label: text("setupInstance"),
    count: instances.value.filter((instance) => instance.enabled).length,
    done: summary.value.availableInstances > 0,
    route: "instances"
  },
  {
    key: "profile",
    label: text("setupProfile"),
    count: profiles.value.filter((profile) => profile.enabled).length,
    done: summary.value.enabledProfiles > 0,
    route: "profiles"
  },
  {
    key: "route",
    label: text("setupRoute"),
    count: routes.value.length,
    done: summary.value.routedProfiles > 0,
    route: "routeBindings"
  },
  {
    key: "key",
    label: text("setupKey"),
    count: keys.value.filter((key) => key.enabled === 1).length,
    done: summary.value.activeApiKeys > 0,
    route: "keys"
  },
  {
    key: "run",
    label: text("setupRun"),
    count: summary.value.completedRuns,
    done: summary.value.completedRuns > 0,
    route: "runs"
  }
]);
const nextStep = computed(() => setupSteps.value.find((step) => !step.done) ?? setupSteps.value.at(-1));
const completedSetupSteps = computed(() => setupSteps.value.filter((step) => step.done).length);
const setupProgressPercent = computed(() => `${(completedSetupSteps.value / setupSteps.value.length) * 100}%`);
const endpointReady = computed(() =>
  ["account", "instance", "profile", "route", "key"].every((key) => setupSteps.value.find((step) => step.key === key)?.done)
);

function goTo(route: DashboardRouteName): void {
  void router.push({ name: route });
}
</script>

<template>
  <div class="space-y-5">
    <section class="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <p class="text-sm font-semibold text-slate-900">{{ text("setupProgress") }}</p>
            <Tag :severity="endpointReady ? 'success' : 'warn'" :value="endpointReady ? text('ready') : text('notReady')" />
            <span class="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">
              {{ completedSetupSteps }} / {{ setupSteps.length }}
            </span>
          </div>
          <p class="mt-2 text-sm text-slate-500">{{ text("endpointStatus") }}</p>
        </div>

        <div class="flex flex-col gap-3 rounded-md border border-slate-200 bg-slate-50 p-3 sm:min-w-80 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-xs font-medium text-slate-500">{{ text("nextAction") }}</p>
            <p class="mt-1 text-sm font-semibold text-slate-950">{{ nextStep?.label }}</p>
          </div>
          <Button v-if="nextStep" class="shrink-0 justify-center" outlined @click="goTo(nextStep.route)">
            <span>{{ text("goConfigure") }}</span>
            <ArrowRight class="ml-2" :size="15" />
          </Button>
        </div>
      </div>

      <div class="mt-5 h-1.5 overflow-hidden rounded bg-slate-100">
        <div class="h-full rounded bg-emerald-500 transition-all" :style="{ width: setupProgressPercent }" />
      </div>

      <ol class="mt-4 grid grid-cols-1 gap-px overflow-hidden rounded-md border border-slate-200 bg-slate-200 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <li v-for="(step, index) in setupSteps" :key="step.key" class="bg-white">
          <button
            class="flex min-h-24 w-full items-start gap-3 px-3 py-3 text-left transition hover:bg-slate-50"
            :class="step.done ? 'bg-emerald-50/70 hover:bg-emerald-50' : 'bg-white'"
            type="button"
            @click="goTo(step.route)"
          >
            <span
              class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold"
              :class="step.done ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-slate-300 bg-white text-slate-500'"
            >
              <Check v-if="step.done" :size="15" />
              <span v-else>{{ index + 1 }}</span>
            </span>
            <span class="min-w-0 flex-1">
              <span class="flex items-start justify-between gap-2">
                <span class="min-w-0 text-sm font-medium text-slate-900">{{ step.label }}</span>
                <span class="rounded bg-white/80 px-1.5 py-0.5 text-xs font-semibold text-slate-700">{{ step.count }}</span>
              </span>
              <span class="mt-2 block text-xs text-slate-500">{{ step.done ? text("done") : text("nextAction") }}</span>
            </span>
          </button>
        </li>
      </ol>
    </section>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <Card v-for="card in metricCards" :key="card.label" class="border border-slate-200 shadow-sm">
        <template #content>
          <p class="text-xs font-medium uppercase text-slate-500">{{ card.label }}</p>
          <p class="mt-2 text-3xl font-semibold tracking-normal">{{ card.value }}</p>
        </template>
      </Card>
    </div>

    <div class="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <Card class="border border-slate-200 shadow-sm">
        <template #title>{{ text("instances") }}</template>
        <template #content>
          <DataTable :value="instances" dataKey="id" size="small" stripedRows>
            <Column :header="text('name')">
              <template #body="{ data }">
                <div>
                  <p class="font-medium">{{ data.name }}</p>
                  <p class="font-mono text-xs text-slate-500">{{ data.id }}</p>
                </div>
              </template>
            </Column>
            <Column :header="text('account')">
              <template #body="{ data }">{{ accountName(data.accountId) }}</template>
            </Column>
            <Column :header="text('health')">
              <template #body="{ data }">
                <Tag :severity="statusSeverity(data.healthState)" :value="statusLabel(data.healthState)" />
              </template>
            </Column>
            <Column :header="text('concurrency')">
              <template #body="{ data }">{{ data.currentRuns }} / {{ data.maxConcurrentRuns }}</template>
            </Column>
            <template #empty>{{ text("noRows") }}</template>
          </DataTable>
        </template>
      </Card>

      <Card class="border border-slate-200 shadow-sm">
        <template #title>{{ text("routeCoverage") }}</template>
        <template #content>
          <div class="grid grid-cols-3 gap-3 text-sm">
            <div class="rounded border border-slate-200 p-3">
              <p class="text-slate-500">{{ text("profiles") }}</p>
              <p class="mt-1 text-xl font-semibold">{{ profiles.length }}</p>
            </div>
            <div class="rounded border border-slate-200 p-3">
              <p class="text-slate-500">{{ text("activeRoutes") }}</p>
              <p class="mt-1 text-xl font-semibold">{{ routes.length }}</p>
            </div>
            <div class="rounded border border-slate-200 p-3">
              <p class="text-slate-500">{{ text("accounts") }}</p>
              <p class="mt-1 text-xl font-semibold">{{ accounts.length }}</p>
            </div>
          </div>
          <DataTable class="mt-4" :value="routeGaps" dataKey="id" size="small">
            <Column field="id" :header="text('profile')" />
            <Column field="type" :header="text('type')" />
            <Column :header="text('status')">
              <template #body="{ data }">
                <Tag :severity="statusSeverity(data.enabled)" :value="statusLabel(data.enabled)" />
              </template>
            </Column>
            <template #empty>{{ text("noRows") }}</template>
          </DataTable>
        </template>
      </Card>
    </div>

    <Card class="border border-slate-200 shadow-sm">
      <template #title>{{ text("runs") }}</template>
      <template #content>
        <DataTable :value="recentRuns" dataKey="id" size="small" stripedRows>
          <Column :header="text('id')">
            <template #body="{ data }">
              <span class="font-mono text-xs">{{ data.id }}</span>
            </template>
          </Column>
          <Column field="profileId" :header="text('profile')" />
          <Column :header="text('instance')">
            <template #body="{ data }">{{ instanceName(data.upstreamInstanceId) }}</template>
          </Column>
          <Column :header="text('status')">
            <template #body="{ data }">
              <Tag :severity="statusSeverity(data.status)" :value="statusLabel(data.status)" />
            </template>
          </Column>
          <Column field="prompt" :header="text('prompt')" />
          <template #empty>{{ text("noRows") }}</template>
        </DataTable>
      </template>
    </Card>
  </div>
</template>
