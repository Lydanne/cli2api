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
import ConfirmActionButton from "../components/ConfirmActionButton.vue";
import CreateActionDialog from "../components/CreateActionDialog.vue";
import FormField from "../components/FormField.vue";
import { buildClientBaseUrl } from "../lib/client-links";
import { useDashboardState } from "../lib/dashboard-state";

const {
  createKey,
  createdToken,
  deleteKey,
  hardDeleteKey,
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
const createDialogVisible = ref(false);
const copiedLink = ref(false);
let copyResetTimer: ReturnType<typeof setTimeout> | undefined;

async function submitCreateKey(): Promise<void> {
  if (await createKey()) {
    createDialogVisible.value = false;
  }
}

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
      <div class="mb-4 flex justify-end">
        <CreateActionDialog
          v-model:visible="createDialogVisible"
          :action-label="text('createApiKey')"
          action-test-id="create-key"
          :cancel-label="text('cancel')"
          :description="text('createApiKeyDescription')"
          :title="text('createApiKey')"
          @submit="submitCreateKey"
        >
          <FormField :help="text('keyNameHelp')" :label="text('name')">
            <InputText v-model="newKeyName" class="w-full" data-testid="key-name" :placeholder="text('name')" />
          </FormField>
          <FormField :help="text('dailyLimitHelp')" :label="text('dailyLimit')">
            <InputText v-model.number="newKeyDailyLimit" class="w-full" :aria-label="text('dailyLimit')" type="number" />
          </FormField>
          <FormField :help="text('rpmLimitHelp')" :label="text('rpmLimit')">
            <InputText v-model.number="newKeyRpmLimit" class="w-full" :aria-label="text('rpmLimit')" type="number" />
          </FormField>
          <FormField :help="text('concurrentLimitHelp')" :label="text('concurrentLimit')">
            <InputText
              v-model.number="newKeyConcurrentLimit"
              class="w-full"
              :aria-label="text('concurrentLimit')"
              type="number"
            />
          </FormField>
          <FormField :help="text('monthlyTokenLimitHelp')" :label="text('monthlyTokenLimit')">
            <InputText
              v-model.number="newKeyMonthlyTokenLimit"
              class="w-full"
              :aria-label="text('monthlyTokenLimit')"
              type="number"
            />
          </FormField>
        </CreateActionDialog>
      </div>

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
        <Column :header="text('actions')" headerStyle="width: 280px">
          <template #body="{ data }">
            <div class="flex flex-wrap gap-2">
              <ConfirmActionButton
                :action-test-id="`revoke-key-${data.name}`"
                :cancel-label="text('cancel')"
                :confirm-label="text('confirm')"
                :disabled="data.enabled !== 1"
                :label="text('revoke')"
                :message="text('confirmRevokeKeyMessage')"
                severity="danger"
                :target="data.name"
                :target-label="text('confirmTarget')"
                :title="text('confirmRevokeTitle')"
                @confirm="revokeKey(data)"
              />
              <ConfirmActionButton
                :action-test-id="`delete-key-${data.name}`"
                :cancel-label="text('cancel')"
                :confirm-label="text('confirm')"
                :detail="text('confirmSafeDeleteDetail')"
                :label="text('delete')"
                :message="text('confirmDeleteMessage')"
                severity="danger"
                :target="data.name"
                :target-label="text('confirmTarget')"
                :title="text('confirmDeleteTitle')"
                @confirm="deleteKey(data)"
              />
              <ConfirmActionButton
                :action-test-id="`hard-delete-key-${data.name}`"
                :cancel-label="text('cancel')"
                :confirm-label="text('confirm')"
                :detail="text('confirmHardDeleteDetail')"
                :label="text('hardDelete')"
                :message="text('confirmHardDeleteKeyMessage')"
                severity="danger"
                :target="data.name"
                :target-label="text('confirmTarget')"
                :title="text('confirmHardDeleteTitle')"
                @confirm="hardDeleteKey(data)"
              />
            </div>
          </template>
        </Column>
        <template #empty>{{ text("noRows") }}</template>
      </DataTable>
    </template>
  </Card>
</template>
