<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    as?: string;
    variant?: "default" | "alert";
  }>(),
  {
    as: "div",
    variant: "default",
  }
);
</script>

<template>
  <component :is="as" class="base-panel" :class="variant">
    <slot />
  </component>
</template>

<style scoped>
.base-panel {
  background-color: var(--color-bg-mute, #f9fafb);
  border-radius: var(--radius-md);
}

.base-panel.default {
  padding: var(--space-lg);
}

.base-panel.alert {
  padding: var(--space-md);
  border-left: 4px solid;
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
}
</style>
