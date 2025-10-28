<script setup lang="ts">
withDefaults(defineProps<{ level?: 1 | 2 | 3 | 4 | 5 | 6 }>(), { level: 1 });
</script>

<template>
  <component :is="(`h${level}` as any)">
    <slot />
  </component>
</template>

<style scoped>
h1 { font-family: var(--font-sans); font-size: var(--h1-font-size); font-weight: var(--h1-font-weight); line-height: var(--line-height); color: var(--color-fg); }
h2 { font-family: var(--font-sans); font-size: var(--h2-font-size); font-weight: var(--h2-font-weight); line-height: var(--line-height); color: var(--color-fg); }
h3 { font-family: var(--font-sans); font-size: var(--h3-font-size); font-weight: var(--h3-font-weight); line-height: var(--line-height); color: var(--color-fg); }
h4 { font-family: var(--font-sans); font-size: var(--h4-font-size); font-weight: var(--h4-font-weight); line-height: var(--line-height); color: var(--color-fg); }
h5 { font-family: var(--font-sans); font-size: var(--h5-font-size); font-weight: var(--h5-font-weight); line-height: var(--line-height); color: var(--color-fg); }
h6 { font-family: var(--font-sans); font-size: var(--h6-font-size); font-weight: var(--h6-font-weight); line-height: var(--line-height); color: var(--color-fg); }
</style>


