<script setup lang="ts">
withDefaults(defineProps<{ level?: 1 | 2 | 3 | 4 | 5 | 6 }>(), { level: 1 });
</script>

<template>
  <component :is="(`h${level}` as any)">
    <slot />
  </component>
</template>

<style scoped>
h1 { font-family: var(--font-sans); font-size: var(--size-6); line-height: 2.25rem; font-weight: 600; color: var(--color-fg); }
h2 { font-family: var(--font-sans); font-size: var(--size-5); line-height: 2rem; font-weight: 600; color: var(--color-fg); }
h3 { font-family: var(--font-sans); font-size: var(--size-4); line-height: 1.75rem; font-weight: 600; color: var(--color-fg); }
h4 { font-family: var(--font-sans); font-size: var(--size-3); line-height: 1.5rem; font-weight: 600; color: var(--color-fg); }
h5 { font-family: var(--font-sans); font-size: var(--size-2); line-height: 1.5rem; font-weight: 600; color: var(--color-fg); }
h6 { font-family: var(--font-sans); font-size: var(--size-1); line-height: 1.25rem; font-weight: 600; color: var(--color-fg); }
</style>


