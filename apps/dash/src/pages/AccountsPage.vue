<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import Tag from "primevue/tag";
import { ref } from "vue";
import CreateActionDialog from "../components/CreateActionDialog.vue";
import { useDashboardState } from "../lib/dashboard-state";

const {
  accounts,
  createAccount,
  deleteAccount,
  lastAuthSession,
  logoutAccount,
  newAccountId,
  newAccountName,
  pollAuth,
  startAuth,
  statusLabel,
  statusSeverity,
  text
} = useDashboardState();

const createDialogVisible = ref(false);

async function submitCreateAccount(): Promise<void> {
  if (await createAccount()) {
    createDialogVisible.value = false;
  }
}
</script>

<template>
  <Card class="app-card">
    <template #title>{{ text("accounts") }}</template>
    <template #content>
      <div class="mb-4 flex justify-end">
        <CreateActionDialog
          v-model:visible="createDialogVisible"
          :action-label="text('createAccount')"
          action-test-id="create-account"
          :cancel-label="text('cancel')"
          :title="text('createAccount')"
          @submit="submitCreateAccount"
        >
          <InputText v-model="newAccountId" class="w-full" data-testid="account-id" :placeholder="text('id')" />
          <InputText v-model="newAccountName" class="w-full" data-testid="account-name" :placeholder="text('name')" />
        </CreateActionDialog>
      </div>

      <Message v-if="lastAuthSession" class="mb-4" severity="info">
        <p>{{ text("authInstruction") }}</p>
        <p v-if="lastAuthSession.authUrl" class="mt-2">
          {{ text("authUrl") }}:
          <a class="app-link font-mono underline" :href="lastAuthSession.authUrl" target="_blank">{{ lastAuthSession.authUrl }}</a>
        </p>
        <p v-if="lastAuthSession.userCode" class="mt-1 font-mono">{{ text("userCode") }}: {{ lastAuthSession.userCode }}</p>
      </Message>

      <DataTable :value="accounts" dataKey="id" size="small" stripedRows>
        <Column :header="text('name')">
          <template #body="{ data }">
            <div>
              <p class="font-medium">{{ data.name }}</p>
              <p class="app-code-muted font-mono text-xs">{{ data.id }}</p>
            </div>
          </template>
        </Column>
        <Column field="providerType" :header="text('provider')" />
        <Column :header="text('authState')">
          <template #body="{ data }">
            <Tag :severity="statusSeverity(data.authState)" :value="statusLabel(data.authState)" />
          </template>
        </Column>
        <Column field="authHome" :header="text('authHome')" />
        <Column :header="text('actions')" headerStyle="width: 390px">
          <template #body="{ data }">
            <div class="flex flex-wrap gap-2">
              <Button :data-testid="`auth-${data.id}`" :label="text('startAuth')" outlined size="small" @click="startAuth(data)" />
              <Button :data-testid="`poll-${data.id}`" :label="text('pollAuth')" outlined size="small" @click="pollAuth(data)" />
              <Button
                :data-testid="`logout-${data.id}`"
                :label="text('logout')"
                outlined
                severity="secondary"
                size="small"
                @click="logoutAccount(data)"
              />
              <Button
                :data-testid="`delete-account-${data.id}`"
                :label="text('delete')"
                outlined
                severity="danger"
                size="small"
                @click="deleteAccount(data)"
              />
            </div>
          </template>
        </Column>
        <template #empty>{{ text("noRows") }}</template>
      </DataTable>
    </template>
  </Card>
</template>
