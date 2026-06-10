<script setup lang="ts">
import { onMounted } from "vue";
import DashboardShell from "./components/DashboardShell.vue";
import LoginPanel from "./components/LoginPanel.vue";
import { createDashboardState, provideDashboardState } from "./lib/dashboard-state";

const dashboard = createDashboardState();
const { loggedIn } = dashboard;

provideDashboardState(dashboard);

onMounted(async () => {
  loggedIn.value = await dashboard.refresh({ silent: true });
});
</script>

<template>
  <main class="app-root">
    <LoginPanel v-if="!loggedIn" />
    <DashboardShell v-else />
  </main>
</template>
