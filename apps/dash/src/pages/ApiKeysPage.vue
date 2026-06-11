<script setup lang="ts">
import { Check, Copy } from "lucide-vue-next";
import Button from "primevue/button";
import Card from "primevue/card";
import Column from "primevue/column";
import DataTable from "primevue/datatable";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import Tag from "primevue/tag";
import { computed, ref } from "vue";
import { buildClientBaseUrl } from "../lib/client-links";
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

const clientBaseUrl = computed(() => buildClientBaseUrl());
const copiedLink = ref(false);
let copyResetTimer: ReturnType<typeof setTimeout> | undefined;

async function copyClientBaseUrl(): Promise<void> {
  await writeClipboardText(clientBaseUrl.value);
  copiedLink.value = true;
  if (copyResetTimer) window.clearTimeout(copyResetTimer);
  copyResetTimer = window.setTimeout(() => {
    copiedLink.value = false;
  }, 1500);
}

async function writeClipboardText(value: string): Promise<void> {
  if (window.navigator.clipboard?.writeText) {
    try {
      await window.navigator.clipboard.writeText(value);
      return;
    } catch {
      // Fall back for browsers that expose clipboard but reject the write.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}
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

      <div class="app-panel-muted mb-4 flex flex-col gap-3 rounded-md p-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="min-w-0">
          <p class="app-field-label text-xs font-medium">{{ text("clientBaseUrl") }}</p>
          <p class="app-code-muted mt-1 truncate font-mono text-xs" data-testid="client-base-url">{{ clientBaseUrl }}</p>
        </div>
        <div class="flex items-center gap-2">
          <Button
            :aria-label="text('copyLink')"
            data-testid="copy-client-base-url"
            outlined
            size="small"
            :title="text('copyLink')"
            type="button"
            @click="copyClientBaseUrl"
          >
            <Check v-if="copiedLink" :size="15" />
            <Copy v-else :size="15" />
          </Button>
          <span v-if="copiedLink" class="app-muted text-xs">{{ text("copied") }}</span>
        </div>
      </div>

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
