<script setup lang="ts">
import { computed } from "vue";
import ProseImg from "~/components/prose/ProseImg.vue";

// ImgWrapper previously only rendered ProseImg in pages/[...slug].vue
// If it needs enhancement later, we can add it here.
</script>

<template>
  <component :is="ProseImg" v-bind="$attrs">
    <slot />
  </component>
</template>
