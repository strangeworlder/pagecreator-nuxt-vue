<script setup lang="ts">
import ProseImg from "~/components/prose/ProseImg.vue";

const props = defineProps<{
  src: string;
  alt?: string;
  width?: number;
  height?: number;
}>();
</script>

<template>
  <component :is="ProseImg as any" v-bind="{ ...props, ...$attrs }">
    <slot />
  </component>
</template>
