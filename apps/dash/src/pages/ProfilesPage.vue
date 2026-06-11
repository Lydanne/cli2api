<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import InputText from "primevue/inputtext";
import Select from "primevue/select";
import Tag from "primevue/tag";
import { ref } from "vue";
import ConfirmActionButton from "../components/ConfirmActionButton.vue";
import CreateActionDialog from "../components/CreateActionDialog.vue";
import FormField from "../components/FormField.vue";
import { useDashboardState } from "../lib/dashboard-state";

const {
  createProfile,
  deleteProfile,
  importAgentModels,
  newProfileId,
  newProfileModel,
  newProfileName,
  newProfileType,
  profileModel,
  profileTypeOptions,
  profiles,
  statusLabel,
  statusSeverity,
  text
} = useDashboardState();

const createDialogVisible = ref(false);

async function submitCreateProfile(): Promise<void> {
  if (await createProfile()) {
    createDialogVisible.value = false;
  }
}
</script>

<template>
  <Card class="app-card">
    <template #title>{{ text("profiles") }}</template>
    <template #content>
      <div class="mb-4 flex flex-wrap justify-end gap-2">
        <CreateActionDialog
          v-model:visible="createDialogVisible"
          :action-label="text('createProfile')"
          action-test-id="create-profile"
          :cancel-label="text('cancel')"
          :description="text('createProfileDescription')"
          :title="text('createProfile')"
          @submit="submitCreateProfile"
        >
          <FormField :help="text('profileIdHelp')" :label="text('publicModel')">
            <InputText v-model="newProfileId" class="w-full" data-testid="profile-id" :placeholder="text('id')" />
          </FormField>
          <FormField :help="text('profileTypeHelp')" :label="text('type')">
            <Select v-model="newProfileType" class="w-full" optionLabel="label" optionValue="value" :options="profileTypeOptions" />
          </FormField>
          <FormField :help="text('profileNameHelp')" :label="text('name')">
            <InputText v-model="newProfileName" class="w-full" :placeholder="text('name')" />
          </FormField>
          <FormField :help="text('profileModelHelp')" :label="text('upstreamModel')">
            <InputText v-model="newProfileModel" class="w-full" data-testid="profile-model" :placeholder="text('upstreamModel')" />
          </FormField>
        </CreateActionDialog>
        <Button
          data-testid="import-agent-models"
          :label="text('importSdkModels')"
          outlined
          type="button"
          @click="importAgentModels"
        />
      </div>

      <DataTable :value="profiles" dataKey="id" size="small" stripedRows>
        <Column field="id" :header="text('profile')" />
        <Column field="name" :header="text('name')" />
        <Column field="type" :header="text('type')" />
        <Column :header="text('upstreamModel')">
          <template #body="{ data }">
            {{ profileModel(data) }}
          </template>
        </Column>
        <Column :header="text('status')">
          <template #body="{ data }">
            <Tag :severity="statusSeverity(data.enabled)" :value="statusLabel(data.enabled)" />
          </template>
        </Column>
        <Column :header="text('actions')" headerStyle="width: 120px">
          <template #body="{ data }">
            <ConfirmActionButton
              :action-test-id="`delete-profile-${data.id}`"
              :cancel-label="text('cancel')"
              :confirm-label="text('confirm')"
              :label="text('delete')"
              :message="text('confirmDeleteMessage')"
              severity="danger"
              :target="data.id"
              :target-label="text('confirmTarget')"
              :title="text('confirmDeleteTitle')"
              @confirm="deleteProfile(data)"
            />
          </template>
        </Column>
        <template #empty>{{ text("noRows") }}</template>
      </DataTable>
    </template>
  </Card>
</template>
