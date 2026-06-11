<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import Select from "primevue/select";
import { ref } from "vue";
import CreateActionDialog from "../components/CreateActionDialog.vue";
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
          :title="text('createRoute')"
          @submit="submitCreateRoute"
        >
          <Select
            v-model="selectedRouteProfile"
            class="w-full"
            data-testid="route-profile"
            optionLabel="label"
            optionValue="value"
            :options="profileOptions"
          />
          <Select
            v-model="selectedRouteInstance"
            class="w-full"
            data-testid="route-instance"
            optionLabel="label"
            optionValue="value"
            :options="instanceOptions"
          />
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
        <template #empty>{{ text("noRows") }}</template>
      </DataTable>
    </template>
  </Card>
</template>
