<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Tag from "primevue/tag";
import { useDashboardState } from "../lib/dashboard-state";

const {
  createRun,
  formattedRunEvents,
  instanceName,
  loadRunEvents,
  profileOptions,
  prompt,
  runs,
  selectedProfile,
  selectedRunId,
  statusLabel,
  statusSeverity,
  text
} = useDashboardState();
</script>

<template>
  <div class="space-y-5">
    <Card class="border border-slate-200 shadow-sm">
      <template #title>{{ text("runs") }}</template>
      <template #content>
        <form class="mb-4 grid grid-cols-1 gap-2 lg:grid-cols-[240px_1fr_auto]" @submit.prevent="createRun">
          <Select
            v-model="selectedProfile"
            data-testid="run-profile"
            optionLabel="label"
            optionValue="value"
            :options="profileOptions"
          />
          <InputText v-model="prompt" data-testid="run-prompt" :placeholder="text('prompt')" />
          <Button data-testid="run-submit" :label="text('createRun')" type="submit" />
        </form>

        <DataTable :value="runs" dataKey="id" size="small" stripedRows>
          <Column :header="text('id')">
            <template #body="{ data }">
              <span data-testid="run-id" class="font-mono text-xs">{{ data.id }}</span>
            </template>
          </Column>
          <Column field="profileId" :header="text('profile')" />
          <Column field="prompt" :header="text('prompt')" />
          <Column :header="text('instance')">
            <template #body="{ data }">
              <div>
                <p>{{ instanceName(data.upstreamInstanceId) }}</p>
                <p v-if="data.upstreamInstanceId" class="font-mono text-xs text-slate-500">{{ data.upstreamInstanceId }}</p>
              </div>
            </template>
          </Column>
          <Column :header="text('status')">
            <template #body="{ data }">
              <Tag :severity="statusSeverity(data.status)" :value="statusLabel(data.status)" />
            </template>
          </Column>
          <Column :header="text('output')">
            <template #body="{ data }">
              {{ data.output || data.errorCode }}
            </template>
          </Column>
          <Column :header="text('actions')" headerStyle="width: 130px">
            <template #body="{ data }">
              <Button :label="text('viewEvents')" outlined size="small" @click="loadRunEvents(data)" />
            </template>
          </Column>
          <template #empty>{{ text("noRows") }}</template>
        </DataTable>
      </template>
    </Card>

    <section
      v-if="selectedRunId"
      class="rounded-md border border-slate-800 bg-slate-950 p-4 text-slate-100 shadow-sm"
      data-testid="run-events"
    >
      <div class="mb-3">
        <h3 class="text-sm font-semibold">{{ text("events") }}</h3>
        <p class="font-mono text-xs text-slate-300">{{ selectedRunId }}</p>
      </div>
      <pre class="max-h-80 overflow-auto whitespace-pre-wrap text-xs">{{ formattedRunEvents }}</pre>
    </section>
  </div>
</template>
