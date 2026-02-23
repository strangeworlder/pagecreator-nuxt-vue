<script setup lang="ts">
import { computed } from "vue";
import ProseA from "~/components/prose/ProseA.vue";
import ProseAEnhanced from "~/components/prose/ProseAEnhanced.client.vue";

const enhancementsEnabled = useState<boolean>("content-enhance-ready", () => false);
</script>

<template>
  <component :is="enhancementsEnabled ? ProseAEnhanced : ProseA" v-bind="$attrs">
    <slot />
  </component>
</template>
