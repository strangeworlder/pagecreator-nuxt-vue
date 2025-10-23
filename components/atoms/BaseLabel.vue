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
  margin-bottom: 0.25rem;
  font-size: var(--size-2);
  font-weight: 500;
  color: var(--color-fg);
}
</style>


