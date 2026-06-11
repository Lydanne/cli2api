<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import InputText from "primevue/inputtext";
import Tag from "primevue/tag";
import { ref } from "vue";
import CreateActionDialog from "../components/CreateActionDialog.vue";
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
          :title="text('createUser')"
          @submit="submitCreateUser"
        >
          <InputText v-model="newUserEmail" class="w-full" data-testid="user-email" :placeholder="text('email')" />
          <InputText
            v-model="newUserPassword"
            class="w-full"
            data-testid="user-password"
            :placeholder="text('password')"
            type="password"
          />
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
            <Button
              :data-testid="`delete-user-${data.email}`"
              :label="text('delete')"
              outlined
              severity="danger"
              size="small"
              @click="deleteUser(data)"
            />
          </template>
        </Column>
        <template #empty>{{ text("noRows") }}</template>
      </DataTable>
    </template>
  </Card>
</template>
