<script setup lang="ts">
const props = withDefaults(defineProps<{ href?: string; rel?: string; target?: string }>(), {
  href: undefined,
  rel: undefined,
  target: undefined,
});
</script>
<template>
  <NuxtLink
    v-if="href && !/^(https?:)?\/\//.test(href) && !href.startsWith('#')"
    :to="href"
    v-bind="$attrs"
  >
    <slot />
  </NuxtLink>
  <a
    v-else
    :href="href"
    :rel="rel ?? ((/^(https?:)?\/\//.test(href || '')) ? 'noopener noreferrer' : undefined)"
    :target="target ?? ((/^(https?:)?\/\//.test(href || '')) ? '_blank' : undefined)"
    v-bind="$attrs"
  >
    <slot />
  </a>
</template>


