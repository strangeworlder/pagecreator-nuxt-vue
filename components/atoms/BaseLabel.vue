<script setup lang="ts">
defineProps<{ forId?: string }>();
</script>

<template>
  <label :for="forId">
    <slot />
  </label>
</template>

<style scoped>
label {
  display: block;
  margin-bottom: var(--space-xs);
  font-size: var(--size-2);
  font-weight: 500;
  color: var(--color-fg);
}
</style>
