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
  createKey,
  createdToken,
  deleteKey,
  keys,
  monthlyUsageByKey,
  newKeyConcurrentLimit,
  newKeyDailyLimit,
  newKeyMonthlyTokenLimit,
  newKeyName,
  newKeyRpmLimit,
  revokeKey,
  statusLabel,
  statusSeverity,
  text
} = useDashboardState();
</script>

<template>
  <Card class="app-card">
    <template #title>{{ text("keys") }}</template>
    <template #content>
      <form class="mb-4 grid grid-cols-1 gap-2 xl:grid-cols-[1fr_110px_110px_110px_140px_auto]" @submit.prevent="createKey">
        <InputText v-model="newKeyName" data-testid="key-name" :placeholder="text('name')" />
        <InputText v-model.number="newKeyDailyLimit" :aria-label="text('dailyLimit')" type="number" />
        <InputText v-model.number="newKeyRpmLimit" :aria-label="text('rpmLimit')" type="number" />
        <InputText v-model.number="newKeyConcurrentLimit" :aria-label="text('concurrentLimit')" type="number" />
        <InputText v-model.number="newKeyMonthlyTokenLimit" :aria-label="text('monthlyTokenLimit')" type="number" />
        <Button data-testid="create-key" :label="text('createApiKey')" type="submit" />
      </form>

      <Message v-if="createdToken" class="mb-4 break-all font-mono text-xs" data-testid="created-token" severity="success">
        {{ createdToken }}
      </Message>

      <DataTable :value="keys" dataKey="id" size="small" stripedRows>
        <Column field="name" :header="text('name')" />
        <Column field="keyPrefix" :header="text('keyPrefix')" />
        <Column :header="text('status')">
          <template #body="{ data }">
            <Tag :severity="statusSeverity(data.enabled)" :value="statusLabel(data.enabled)" />
          </template>
        </Column>
        <Column :header="text('usage')">
          <template #body="{ data }">
            {{ monthlyUsageByKey.get(data.id)?.runCount ?? 0 }} {{ text("runs") }} /
            {{ monthlyUsageByKey.get(data.id)?.totalTokens ?? 0 }} {{ text("totalTokens") }}
          </template>
        </Column>
        <Column :header="text('actions')" headerStyle="width: 190px">
          <template #body="{ data }">
            <div class="flex flex-wrap gap-2">
              <Button
                :data-testid="`revoke-key-${data.name}`"
                :disabled="data.enabled !== 1"
                :label="text('revoke')"
                outlined
                severity="danger"
                size="small"
                @click="revokeKey(data)"
              />
              <Button
                :data-testid="`delete-key-${data.name}`"
                :label="text('delete')"
                outlined
                severity="danger"
                size="small"
                @click="deleteKey(data)"
              />
            </div>
          </template>
        </Column>
        <template #empty>{{ text("noRows") }}</template>
      </DataTable>
    </template>
  </Card>
</template>
