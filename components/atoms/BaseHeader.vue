<script setup lang="ts">
withDefaults(defineProps<{ level?: 1 | 2 | 3 | 4 | 5 | 6 }>(), { level: 1 });
</script>

<template>
  <component :is="(`h${level}` as any)" class="font-semibold text-gray-900" :class="{
    'text-3xl leading-9': level === 1,
    'text-2xl leading-8': level === 2,
    'text-xl leading-7': level === 3,
    'text-lg leading-6': level === 4,
    'text-base leading-6': level === 5,
    'text-sm leading-5': level === 6,
  }">
    <slot />
  </component>
</template>


