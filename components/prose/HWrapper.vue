<script setup lang="ts">
import ProseHeading from "~/components/prose/ProseHeading.vue";
import ProseHeadingEnhanced from "~/components/prose/ProseHeadingEnhanced.client.vue";

defineProps<{
  level: 1 | 2 | 3 | 4 | 5 | 6;
  id?: string;
}>();

const enhancementsEnabled = useState<boolean>("content-enhance-ready", () => false);
</script>

<template>
  <component :is="enhancementsEnabled ? ProseHeadingEnhanced : ProseHeading" :level="level" :id="id" v-bind="$attrs">
    <slot />
  </component>
</template>

