<script setup lang="ts">
import Card from "primevue/card";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Select from "primevue/select";
import { ref } from "vue";
import ConfirmActionButton from "../components/ConfirmActionButton.vue";
import CreateActionDialog from "../components/CreateActionDialog.vue";
import FormField from "../components/FormField.vue";
import { useDashboardState } from "../lib/dashboard-state";

const {
  createRoute,
  deleteRoute,
  instanceName,
  instanceOptions,
  profileName,
  profileOptions,
  routes,
  selectedRouteInstance,
  selectedRouteProfile,
  text
} = useDashboardState();

const createDialogVisible = ref(false);

async function submitCreateRoute(): Promise<void> {
  if (await createRoute()) {
    createDialogVisible.value = false;
  }
}
</script>

<template>
  <Card class="app-card">
    <template #title>{{ text("routeBindings") }}</template>
    <template #content>
      <div class="mb-4 flex justify-end">
        <CreateActionDialog
          v-model:visible="createDialogVisible"
          :action-label="text('createRoute')"
          action-test-id="create-route"
          :cancel-label="text('cancel')"
          :description="text('createRouteDescription')"
          :title="text('createRoute')"
          @submit="submitCreateRoute"
        >
          <FormField :help="text('routeProfileHelp')" :label="text('profile')">
            <Select
              v-model="selectedRouteProfile"
              class="w-full"
              data-testid="route-profile"
              optionLabel="label"
              optionValue="value"
              :options="profileOptions"
            />
          </FormField>
          <FormField :help="text('routeInstanceHelp')" :label="text('instance')">
            <Select
              v-model="selectedRouteInstance"
              class="w-full"
              data-testid="route-instance"
              optionLabel="label"
              optionValue="value"
              :options="instanceOptions"
            />
          </FormField>
        </CreateActionDialog>
      </div>

      <DataTable :value="routes" dataKey="id" size="small" stripedRows>
        <Column :header="text('profile')">
          <template #body="{ data }">
            <div>
              <p class="font-medium">{{ profileName(data.profileId) }}</p>
              <p class="app-code-muted font-mono text-xs">{{ data.profileId }}</p>
            </div>
          </template>
        </Column>
        <Column :header="text('instance')">
          <template #body="{ data }">
            <div>
              <p class="font-medium">{{ instanceName(data.instanceId) }}</p>
              <p class="app-code-muted font-mono text-xs">{{ data.instanceId }}</p>
            </div>
          </template>
        </Column>
        <Column :header="text('actions')" headerStyle="width: 150px">
          <template #body="{ data }">
            <ConfirmActionButton
              :action-test-id="`delete-route-${data.id}`"
              :cancel-label="text('cancel')"
              :confirm-label="text('confirm')"
              :label="text('deleteRoute')"
              :message="text('confirmDeleteMessage')"
              severity="danger"
              :target="data.id"
              :target-label="text('confirmTarget')"
              :title="text('confirmDeleteTitle')"
              @confirm="deleteRoute(data)"
            />
          </template>
        </Column>
        <template #empty>{{ text("noRows") }}</template>
      </DataTable>
    </template>
  </Card>
</template>
