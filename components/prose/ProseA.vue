<script setup lang="ts">
// @ts-nocheck
withDefaults(defineProps<{ href?: string; rel?: string; target?: string }>(), {
  href: undefined,
  rel: undefined,
  target: undefined,
})

const EXTERNAL_RE = /^(https?:)?\/\//
</script>

<template>
  <NuxtLink
    v-if="href && !EXTERNAL_RE.test(href) && !href.startsWith('#') && !target"
    :to="href"
    v-bind="$attrs"
  >
    <slot />
  </NuxtLink>

  <a
    v-else
    :href="href"
    :rel="rel ?? (EXTERNAL_RE.test(href || '') ? 'noopener noreferrer' : undefined)"
    :target="target ?? (EXTERNAL_RE.test(href || '') ? '_blank' : undefined)"
    v-bind="$attrs"
  >
    <slot />
  </a>
</template>

<style scoped>
  a[href^="http"]::after {
    content: " ↗";
  }
</style>