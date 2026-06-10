<script setup lang="ts">
import Button from "primevue/button";
import Card from "primevue/card";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import { useDashboardState } from "../lib/dashboard-state";

const { deleteRunSession, instanceName, profileName, runSessions, text } = useDashboardState();

function formatTime(value: number): string {
  return new Date(value).toLocaleString();
}
</script>

<template>
  <Card class="app-card">
    <template #title>{{ text("sessions") }}</template>
    <template #content>
      <DataTable :value="runSessions" dataKey="id" size="small" stripedRows>
        <Column :header="text('user')">
          <template #body="{ data }">
            <span class="font-mono text-xs">{{ data.userId }}</span>
          </template>
        </Column>
        <Column :header="text('session')">
          <template #body="{ data }">
            <span class="font-mono text-xs">{{ data.sessionId }}</span>
          </template>
        </Column>
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
              <p class="font-medium">{{ instanceName(data.upstreamInstanceId) }}</p>
              <p class="app-code-muted font-mono text-xs">{{ data.upstreamInstanceId }}</p>
            </div>
          </template>
        </Column>
        <Column field="runCount" :header="text('runs')" />
        <Column :header="text('lastUsed')">
          <template #body="{ data }">{{ formatTime(data.lastUsedAt) }}</template>
        </Column>
        <Column :header="text('actions')" headerStyle="width: 150px">
          <template #body="{ data }">
            <Button
              :data-testid="`delete-session-${data.id}`"
              :label="text('resetSession')"
              outlined
              severity="danger"
              size="small"
              @click="deleteRunSession(data)"
            />
          </template>
        </Column>
        <template #empty>{{ text("noRows") }}</template>
      </DataTable>
    </template>
  </Card>
</template>
