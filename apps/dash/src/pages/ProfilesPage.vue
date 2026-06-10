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
  createProfile,
  newProfileCwd,
  newProfileId,
  newProfileName,
  newProfileType,
  profileTypeOptions,
  profiles,
  statusLabel,
  statusSeverity,
  text
} = useDashboardState();
</script>

<template>
  <Card class="border border-slate-200 shadow-sm">
    <template #title>{{ text("profiles") }}</template>
    <template #content>
      <form class="mb-4 grid grid-cols-1 gap-2 xl:grid-cols-[170px_150px_1fr_1fr_auto]" @submit.prevent="createProfile">
        <InputText v-model="newProfileId" data-testid="profile-id" :placeholder="text('id')" />
        <Select v-model="newProfileType" optionLabel="label" optionValue="value" :options="profileTypeOptions" />
        <InputText v-model="newProfileName" :placeholder="text('name')" />
        <InputText v-model="newProfileCwd" :placeholder="text('cwd')" />
        <Button data-testid="create-profile" :label="text('createProfile')" type="submit" />
      </form>

      <DataTable :value="profiles" dataKey="id" size="small" stripedRows>
        <Column field="id" :header="text('profile')" />
        <Column field="name" :header="text('name')" />
        <Column field="type" :header="text('type')" />
        <Column field="cwd" :header="text('cwd')" />
        <Column :header="text('status')">
          <template #body="{ data }">
            <Tag :severity="statusSeverity(data.enabled)" :value="statusLabel(data.enabled)" />
          </template>
        </Column>
        <template #empty>{{ text("noRows") }}</template>
      </DataTable>
    </template>
  </Card>
</template>
