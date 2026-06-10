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
  accountName,
  accountOptions,
  createInstance,
  deleteInstance,
  disableInstance,
  instanceTypeOptions,
  instances,
  newInstanceConcurrency,
  newInstanceId,
  newInstanceName,
  newInstanceType,
  saveInstance,
  selectedAccountId,
  statusLabel,
  statusSeverity,
  text
} = useDashboardState();
</script>

<template>
  <Card class="app-card">
    <template #title>{{ text("instances") }}</template>
    <template #content>
      <form class="mb-4 grid grid-cols-1 gap-2 xl:grid-cols-[180px_120px_150px_1fr_100px_auto]" @submit.prevent="createInstance">
        <Select
          v-model="selectedAccountId"
          data-testid="instance-account"
          optionLabel="label"
          optionValue="value"
          :options="accountOptions"
        />
        <Select v-model="newInstanceType" optionLabel="label" optionValue="value" :options="instanceTypeOptions" />
        <InputText v-model="newInstanceId" data-testid="instance-id" :placeholder="text('id')" />
        <InputText v-model="newInstanceName" data-testid="instance-name" :placeholder="text('name')" />
        <InputText v-model.number="newInstanceConcurrency" data-testid="instance-concurrency" type="number" />
        <Button data-testid="create-instance" :label="text('createInstance')" type="submit" />
      </form>

      <DataTable :value="instances" dataKey="id" size="small" stripedRows>
        <Column :header="text('name')">
          <template #body="{ data }">
            <InputText v-model="data.name" class="w-full" />
            <p class="app-code-muted mt-1 font-mono text-xs">{{ data.id }}</p>
          </template>
        </Column>
        <Column :header="text('account')">
          <template #body="{ data }">{{ accountName(data.accountId) }}</template>
        </Column>
        <Column field="type" :header="text('type')" />
        <Column :header="text('health')">
          <template #body="{ data }">
            <Tag :severity="statusSeverity(data.healthState)" :value="statusLabel(data.healthState)" />
          </template>
        </Column>
        <Column :header="text('concurrency')">
          <template #body="{ data }">
            <div class="flex items-center gap-2">
              <span>{{ data.currentRuns }} /</span>
              <InputText v-model.number="data.maxConcurrentRuns" class="w-16" type="number" />
            </div>
          </template>
        </Column>
        <Column :header="text('status')">
          <template #body="{ data }">
            <Tag :severity="statusSeverity(data.enabled)" :value="statusLabel(data.enabled)" />
          </template>
        </Column>
        <Column :header="text('actions')" headerStyle="width: 270px">
          <template #body="{ data }">
            <div class="flex flex-wrap gap-2">
              <Button :label="text('save')" outlined size="small" @click="saveInstance(data)" />
              <Button
                :data-testid="`disable-instance-${data.id}`"
                :label="text('disableInstance')"
                outlined
                severity="danger"
                size="small"
                @click="disableInstance(data)"
              />
              <Button
                :data-testid="`delete-instance-${data.id}`"
                :label="text('delete')"
                outlined
                severity="danger"
                size="small"
                @click="deleteInstance(data)"
              />
            </div>
          </template>
        </Column>
        <template #empty>{{ text("noRows") }}</template>
      </DataTable>
    </template>
  </Card>
</template>
