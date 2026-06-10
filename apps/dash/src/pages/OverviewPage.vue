<script setup lang="ts">
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
const endpointReady = computed(() =>
  ["account", "instance", "profile", "route", "key"].every((key) => setupSteps.value.find((step) => step.key === key)?.done)
);

function goTo(route: DashboardRouteName): void {
  void router.push({ name: route });
}
</script>

<template>
  <div class="space-y-5">
    <Card class="border border-slate-200 shadow-sm">
      <template #title>{{ text("setupProgress") }}</template>
      <template #content>
        <div class="grid grid-cols-1 gap-3 xl:grid-cols-[180px_1fr_140px]">
          <div class="rounded border border-slate-200 p-3">
            <p class="text-xs font-medium text-slate-500">{{ text("endpointStatus") }}</p>
            <Tag
              class="mt-2"
              :severity="endpointReady ? 'success' : 'warn'"
              :value="endpointReady ? text('ready') : text('notReady')"
            />
          </div>
          <div class="grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-6">
            <button
              v-for="step in setupSteps"
              :key="step.key"
              class="rounded border p-3 text-left transition"
              :class="step.done ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white hover:border-slate-300'"
              type="button"
              @click="goTo(step.route)"
            >
              <p class="text-xs text-slate-500">{{ step.done ? text("done") : text("nextAction") }}</p>
              <p class="mt-1 font-medium">{{ step.label }}</p>
              <p class="mt-2 text-xl font-semibold">{{ step.count }}</p>
            </button>
          </div>
          <Button v-if="nextStep" class="min-h-12 self-stretch" :label="text('goConfigure')" @click="goTo(nextStep.route)" />
        </div>
      </template>
    </Card>

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
