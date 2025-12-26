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
  padding-left: 1rem;
  margin: 1.5rem 0;
}
blockquote :deep(p) {
  font-size: var(--size-4);
}
</style>



