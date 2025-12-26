<script setup lang="ts">
// Basic blockquote component - fixed
</script>
<template>
  <blockquote v-bind="$attrs">
    <slot />
  </blockquote>
</template>

<style scoped>
blockquote {
  border-left: 4px solid var(--color-border, #e5e7eb);
  padding-left: 1rem;
  margin: 1.5rem 0;
  font-style: italic;
  color: var(--color-text-mute, #6b7280);
}
</style>



