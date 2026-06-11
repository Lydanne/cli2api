<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Tag from "primevue/tag";
import { ref } from "vue";
import CreateActionDialog from "../components/CreateActionDialog.vue";
import FormField from "../components/FormField.vue";
import { useDashboardState } from "../lib/dashboard-state";

const {
  createRun,
  formattedRunEvents,
  instanceName,
  loadRunEvents,
  profileOptions,
  prompt,
  runToken,
  runs,
  selectedProfile,
  selectedRunId,
  statusLabel,
  statusSeverity,
  text
} = useDashboardState();

const createDialogVisible = ref(false);

async function submitCreateRun(): Promise<void> {
  if (await createRun()) {
    createDialogVisible.value = false;
  }
}
</script>

<template>
  <div class="space-y-5">
    <Card class="app-card">
      <template #title>{{ text("runs") }}</template>
      <template #content>
        <div class="mb-4 flex justify-end">
          <CreateActionDialog
            v-model:visible="createDialogVisible"
            :action-label="text('createRun')"
            action-test-id="run-submit"
            :cancel-label="text('cancel')"
            :description="text('createRunDescription')"
            :title="text('createRun')"
            @submit="submitCreateRun"
          >
            <FormField :help="text('runProfileHelp')" :label="text('profile')">
              <Select
                v-model="selectedProfile"
                class="w-full"
                data-testid="run-profile"
                optionLabel="label"
                optionValue="value"
                :options="profileOptions"
              />
            </FormField>
            <FormField :help="text('runTokenHelp')" :label="text('clientToken')">
              <InputText v-model="runToken" class="w-full" :placeholder="text('clientToken')" type="password" />
            </FormField>
            <FormField :help="text('runPromptHelp')" :label="text('prompt')">
              <InputText v-model="prompt" class="w-full" data-testid="run-prompt" :placeholder="text('prompt')" />
            </FormField>
          </CreateActionDialog>
        </div>

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
                <p v-if="data.upstreamInstanceId" class="app-code-muted font-mono text-xs">{{ data.upstreamInstanceId }}</p>
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
      class="app-events rounded-md p-4"
      data-testid="run-events"
    >
      <div class="mb-3">
        <h3 class="text-sm font-semibold">{{ text("events") }}</h3>
        <p class="app-events-id font-mono text-xs">{{ selectedRunId }}</p>
      </div>
      <pre class="max-h-80 overflow-auto whitespace-pre-wrap text-xs">{{ formattedRunEvents }}</pre>
    </section>
  </div>
</template>
