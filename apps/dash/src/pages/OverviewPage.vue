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
import { createSetupProgressState, type SetupProgressStep } from "../lib/overview";
import type { DashboardRouteName } from "../router";

const {
  accounts,
  instances,
  keys,
  profiles,
  runSessions,
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
  { label: text("activeSessions"), value: summary.value.activeSessions },
  { label: text("failed"), value: summary.value.failedRuns }
]);
const recentRuns = computed(() => runs.value.slice(-6).reverse());
const recentSessions = computed(() => runSessions.value.slice(-6).reverse());
const setupSteps = computed<Array<SetupProgressStep<DashboardRouteName>>>(() => [
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
const setupProgress = computed(() => createSetupProgressState(setupSteps.value));
const endpointReady = computed(() =>
  ["account", "instance", "profile", "key"].every((key) => setupSteps.value.find((step) => step.key === key)?.done)
);

function goTo(route: DashboardRouteName): void {
  void router.push({ name: route });
}
</script>

<template>
  <div class="space-y-5">
    <section v-if="setupProgress.visible" class="app-panel rounded-md p-5">
      <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <div class="flex flex-wrap items-center gap-2">
            <p class="text-sm font-semibold">{{ text("setupProgress") }}</p>
            <Tag :severity="endpointReady ? 'success' : 'warn'" :value="endpointReady ? text('ready') : text('notReady')" />
            <span class="app-shell-badge rounded px-2 py-1 text-xs font-medium">
              {{ setupProgress.completedSteps }} / {{ setupProgress.steps.length }}
            </span>
          </div>
          <p class="app-muted mt-2 text-sm">{{ text("endpointStatus") }}</p>
        </div>

        <div class="app-panel-muted flex flex-col gap-3 rounded-md p-3 sm:min-w-80 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="app-field-label text-xs font-medium">{{ text("nextAction") }}</p>
            <p class="mt-1 text-sm font-semibold">{{ setupProgress.nextStep?.label }}</p>
          </div>
          <Button v-if="setupProgress.nextStep" class="shrink-0 justify-center" outlined @click="goTo(setupProgress.nextStep.route)">
            <span>{{ text("goConfigure") }}</span>
            <ArrowRight class="ml-2" :size="15" />
          </Button>
        </div>
      </div>

      <div class="app-progress-track mt-5 h-1.5 overflow-hidden rounded">
        <div class="app-progress-bar h-full rounded transition-all" :style="{ width: setupProgress.progressPercent }" />
      </div>

      <ol class="app-step-list mt-4 overflow-hidden rounded-md">
        <li v-for="(step, index) in setupProgress.steps" :key="step.key" class="app-step-cell">
          <button
            class="app-step-button flex min-h-16 w-full items-center gap-3 px-3 py-3 text-left transition"
            :class="{ 'is-done': step.done }"
            type="button"
            @click="goTo(step.route)"
          >
            <span
              class="app-step-marker flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
              :class="{ 'is-done': step.done }"
            >
              <Check v-if="step.done" :size="15" />
              <span v-else>{{ index + 1 }}</span>
            </span>
            <span class="min-w-0 flex-1">
              <span class="flex flex-wrap items-center justify-between gap-2">
                <span class="min-w-0 text-sm font-medium">{{ step.label }}</span>
                <span class="app-step-count rounded px-1.5 py-0.5 text-xs font-semibold">{{ step.count }}</span>
              </span>
              <span class="app-muted mt-1 block text-xs">{{ step.done ? text("done") : text("nextAction") }}</span>
            </span>
            <ArrowRight class="app-subtle shrink-0" :size="15" />
          </button>
        </li>
      </ol>
    </section>

    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
      <Card v-for="card in metricCards" :key="card.label" class="app-card">
        <template #content>
          <p class="app-metric-label text-xs font-medium uppercase">{{ card.label }}</p>
          <p class="mt-2 text-3xl font-semibold tracking-normal">{{ card.value }}</p>
        </template>
      </Card>
    </div>

    <div class="grid grid-cols-1 gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <Card class="app-card">
        <template #title>{{ text("instances") }}</template>
        <template #content>
          <DataTable :value="instances" dataKey="id" size="small" stripedRows>
            <Column :header="text('name')">
              <template #body="{ data }">
                <div>
                  <p class="font-medium">{{ data.name }}</p>
                  <p class="app-code-muted font-mono text-xs">{{ data.id }}</p>
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

      <Card class="app-card">
        <template #title>{{ text("sessions") }}</template>
        <template #content>
          <div class="grid grid-cols-3 gap-3 text-sm">
            <div class="app-surface-tile rounded p-3">
              <p class="app-muted">{{ text("profiles") }}</p>
              <p class="mt-1 text-xl font-semibold">{{ profiles.length }}</p>
            </div>
            <div class="app-surface-tile rounded p-3">
              <p class="app-muted">{{ text("activeSessions") }}</p>
              <p class="mt-1 text-xl font-semibold">{{ runSessions.length }}</p>
            </div>
            <div class="app-surface-tile rounded p-3">
              <p class="app-muted">{{ text("accounts") }}</p>
              <p class="mt-1 text-xl font-semibold">{{ accounts.length }}</p>
            </div>
          </div>
          <DataTable class="mt-4" :value="recentSessions" dataKey="id" size="small">
            <Column field="userId" :header="text('user')" />
            <Column field="sessionId" :header="text('session')" />
            <Column :header="text('instance')">
              <template #body="{ data }">{{ instanceName(data.upstreamInstanceId) }}</template>
            </Column>
            <template #empty>{{ text("noRows") }}</template>
          </DataTable>
        </template>
      </Card>
    </div>

    <Card class="app-card">
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
