<script setup lang="ts">
import Button from "primevue/button";
import Dialog from "primevue/dialog";
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    visible: boolean;
    title: string;
    actionLabel: string;
    actionTestId: string;
    cancelLabel: string;
    description?: string;
    width?: string;
  }>(),
  {
    description: "",
    width: "min(100vw - 2rem, 34rem)"
  }
);

const emit = defineEmits<{
  "update:visible": [value: boolean];
  submit: [];
}>();

const dialogVisible = computed({
  get: () => props.visible,
  set: (value: boolean) => emit("update:visible", value)
});
const dialogStyle = computed(() => ({ width: props.width }));

function openDialog(): void {
  dialogVisible.value = true;
}

function closeDialog(): void {
  dialogVisible.value = false;
}
</script>

<template>
  <Button v-if="!dialogVisible" :data-testid="actionTestId" :label="actionLabel" type="button" @click="openDialog" />
  <Dialog v-model:visible="dialogVisible" :draggable="false" modal :header="title" :style="dialogStyle">
    <p v-if="description" data-testid="create-dialog-description" class="app-muted mb-4 text-sm leading-relaxed">
      {{ description }}
    </p>
    <form class="space-y-4" @submit.prevent="emit('submit')">
      <div class="space-y-4">
        <slot />
      </div>
      <div class="flex justify-end gap-2 pt-2">
        <Button :label="cancelLabel" outlined severity="secondary" type="button" @click="closeDialog" />
        <Button :data-testid="actionTestId" :label="actionLabel" type="submit" />
      </div>
    </form>
  </Dialog>
</template>
