<script setup lang="ts">
import Card from "primevue/card";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import InputText from "primevue/inputtext";
import Tag from "primevue/tag";
import { ref } from "vue";
import ConfirmActionButton from "../components/ConfirmActionButton.vue";
import CreateActionDialog from "../components/CreateActionDialog.vue";
import FormField from "../components/FormField.vue";
import { useDashboardState } from "../lib/dashboard-state";

const { createUser, deleteUser, newUserEmail, newUserPassword, statusLabel, statusSeverity, text, users } = useDashboardState();

const createDialogVisible = ref(false);

async function submitCreateUser(): Promise<void> {
  if (await createUser()) {
    createDialogVisible.value = false;
  }
}
</script>

<template>
  <Card class="app-card">
    <template #title>{{ text("users") }}</template>
    <template #content>
      <div class="mb-4 flex justify-end">
        <CreateActionDialog
          v-model:visible="createDialogVisible"
          :action-label="text('createUser')"
          action-test-id="create-user"
          :cancel-label="text('cancel')"
          :description="text('createUserDescription')"
          :title="text('createUser')"
          @submit="submitCreateUser"
        >
          <FormField :help="text('userEmailHelp')" :label="text('email')">
            <InputText v-model="newUserEmail" class="w-full" data-testid="user-email" :placeholder="text('email')" />
          </FormField>
          <FormField :help="text('userPasswordHelp')" :label="text('password')">
            <InputText
              v-model="newUserPassword"
              class="w-full"
              data-testid="user-password"
              :placeholder="text('password')"
              type="password"
            />
          </FormField>
        </CreateActionDialog>
      </div>

      <DataTable :value="users" dataKey="id" size="small" stripedRows>
        <Column field="email" :header="text('email')" />
        <Column field="role" :header="text('role')" />
        <Column :header="text('status')">
          <template #body="{ data }">
            <Tag :severity="statusSeverity(!data.disabledAt)" :value="statusLabel(!data.disabledAt)" />
          </template>
        </Column>
        <Column :header="text('actions')" headerStyle="width: 120px">
          <template #body="{ data }">
            <ConfirmActionButton
              :action-test-id="`delete-user-${data.email}`"
              :cancel-label="text('cancel')"
              :confirm-label="text('confirm')"
              :label="text('delete')"
              :message="text('confirmDeleteMessage')"
              severity="danger"
              :target="data.email"
              :target-label="text('confirmTarget')"
              :title="text('confirmDeleteTitle')"
              @confirm="deleteUser(data)"
            />
          </template>
        </Column>
        <template #empty>{{ text("noRows") }}</template>
      </DataTable>
    </template>
  </Card>
</template>
