<script setup lang="ts">
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import { computed, ref } from "vue";

type ButtonSeverity = "secondary" | "success" | "info" | "warn" | "danger" | "help" | "contrast";
type ButtonSize = "small" | "large";

const props = withDefaults(
  defineProps<{
    actionTestId: string;
    cancelLabel: string;
    confirmLabel: string;
    label: string;
    message: string;
    targetLabel: string;
    title: string;
    confirmTestId?: string;
    detail?: string;
    disabled?: boolean;
    outlined?: boolean;
    severity?: ButtonSeverity;
    size?: ButtonSize;
    target?: string;
  }>(),
  {
    confirmTestId: undefined,
    detail: "",
    disabled: false,
    outlined: true,
    severity: "danger",
    size: "small",
    target: ""
  }
);

const emit = defineEmits<{
  confirm: [];
}>();

const visible = ref(false);
const resolvedConfirmTestId = computed(() => props.confirmTestId ?? `confirm-${props.actionTestId}`);

function openDialog(): void {
  visible.value = true;
}

function closeDialog(): void {
  visible.value = false;
}

function confirmAction(): void {
  visible.value = false;
  emit("confirm");
}
</script>

<template>
  <Button
    :data-testid="actionTestId"
    :disabled="disabled"
    :label="label"
    :outlined="outlined"
    :severity="severity"
    :size="size"
    type="button"
    @click="openDialog"
  />
  <Dialog v-model:visible="visible" :draggable="false" modal :header="title" :style="{ width: 'min(100vw - 2rem, 30rem)' }">
    <div class="space-y-4">
      <p class="text-sm leading-relaxed">{{ message }}</p>
      <div v-if="target" class="app-panel-muted rounded-md p-3">
        <p class="app-field-label text-xs font-medium">{{ targetLabel }}</p>
        <p class="mt-1 break-all font-mono text-sm">{{ target }}</p>
      </div>
      <p v-if="detail" class="app-muted text-xs leading-relaxed">{{ detail }}</p>
      <div class="flex justify-end gap-2 pt-2">
        <Button :label="cancelLabel" outlined severity="secondary" type="button" @click="closeDialog" />
        <Button :data-testid="resolvedConfirmTestId" :label="confirmLabel" severity="danger" type="button" @click="confirmAction" />
      </div>
    </div>
  </Dialog>
</template>
