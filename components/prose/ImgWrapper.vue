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
  <ProseImg v-bind="{ ...props, ...$attrs }">
    <slot />
  </ProseImg>
</template>

