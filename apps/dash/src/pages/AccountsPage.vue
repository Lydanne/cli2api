<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import Tag from "primevue/tag";
import { useDashboardState } from "../lib/dashboard-state";

const {
  accounts,
  createAccount,
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
</script>

<template>
  <Card class="border border-slate-200 shadow-sm">
    <template #title>{{ text("accounts") }}</template>
    <template #content>
      <form class="mb-4 grid grid-cols-1 gap-2 lg:grid-cols-[190px_1fr_auto]" @submit.prevent="createAccount">
        <InputText v-model="newAccountId" data-testid="account-id" :placeholder="text('id')" />
        <InputText v-model="newAccountName" data-testid="account-name" :placeholder="text('name')" />
        <Button data-testid="create-account" :label="text('createAccount')" type="submit" />
      </form>

      <Message v-if="lastAuthSession" class="mb-4" severity="info">
        <p>{{ text("authInstruction") }}</p>
        <p v-if="lastAuthSession.authUrl" class="mt-2">
          {{ text("authUrl") }}:
          <a class="font-mono underline" :href="lastAuthSession.authUrl" target="_blank">{{ lastAuthSession.authUrl }}</a>
        </p>
        <p v-if="lastAuthSession.userCode" class="mt-1 font-mono">{{ text("userCode") }}: {{ lastAuthSession.userCode }}</p>
      </Message>

      <DataTable :value="accounts" dataKey="id" size="small" stripedRows>
        <Column :header="text('name')">
          <template #body="{ data }">
            <div>
              <p class="font-medium">{{ data.name }}</p>
              <p class="font-mono text-xs text-slate-500">{{ data.id }}</p>
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
        <Column :header="text('actions')" headerStyle="width: 330px">
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
            </div>
          </template>
        </Column>
        <template #empty>{{ text("noRows") }}</template>
      </DataTable>
    </template>
  </Card>
</template>
