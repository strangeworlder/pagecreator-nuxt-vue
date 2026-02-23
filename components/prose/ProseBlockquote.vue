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
  padding-left: var(--space-md);
  margin: var(--space-lg) 0;
}
blockquote :deep(p) {
  font-size: var(--size-4);
}
</style>
