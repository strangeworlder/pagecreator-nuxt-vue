<script setup lang="ts">
import { computed } from "vue";
import ProseHeading from "~/components/prose/ProseHeading.vue";
import ProseHeadingEnhanced from "~/components/prose/ProseHeadingEnhanced.client.vue";

const props = defineProps<{
  level: 1 | 2 | 3 | 4 | 5 | 6;
  id?: string;
}>();

const enhancementsEnabled = useState<boolean>("content-enhance-ready", () => false);

const enhancedHeadingComp = computed(() => {
  return ProseHeadingEnhanced; // Could eventually be loaded lazily
});

const Comp = computed(() => {
  return enhancementsEnabled.value ? enhancedHeadingComp.value : ProseHeading;
});
</script>

<template>
  <component :is="Comp" :level="level" :id="id" v-bind="$attrs">
    <slot />
  </component>
</template>
