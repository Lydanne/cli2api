<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import InputText from "primevue/inputtext";
import Tag from "primevue/tag";
import { useDashboardState } from "../lib/dashboard-state";

const { createUser, newUserEmail, newUserPassword, statusLabel, statusSeverity, text, users } = useDashboardState();
</script>

<template>
  <Card class="border border-slate-200 shadow-sm">
    <template #title>{{ text("users") }}</template>
    <template #content>
      <form class="mb-4 grid grid-cols-1 gap-2 lg:grid-cols-[1fr_1fr_auto]" @submit.prevent="createUser">
        <InputText v-model="newUserEmail" data-testid="user-email" :placeholder="text('email')" />
        <InputText v-model="newUserPassword" data-testid="user-password" :placeholder="text('password')" type="password" />
        <Button data-testid="create-user" :label="text('createUser')" type="submit" />
      </form>

      <DataTable :value="users" dataKey="id" size="small" stripedRows>
        <Column field="email" :header="text('email')" />
        <Column field="role" :header="text('role')" />
        <Column :header="text('status')">
          <template #body="{ data }">
            <Tag :severity="statusSeverity(!data.disabledAt)" :value="statusLabel(!data.disabledAt)" />
          </template>
        </Column>
        <template #empty>{{ text("noRows") }}</template>
      </DataTable>
    </template>
  </Card>
</template>
