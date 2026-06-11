<script setup lang="ts">
defineProps<{
  label: string;
  help: string;
}>();
</script>

<template>
  <label class="block space-y-1.5">
    <span class="app-field-label block text-xs font-medium">{{ label }}</span>
    <slot />
    <span data-testid="form-field-help" class="app-muted block text-xs leading-relaxed">{{ help }}</span>
  </label>
</template>
