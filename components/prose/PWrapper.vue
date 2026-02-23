<script setup lang="ts">
import { computed } from "vue";
import ProseP from "~/components/prose/ProseP.vue";
import ProsePEnhanced from "~/components/prose/ProsePEnhanced.client.vue";

const enhancementsEnabled = useState<boolean>("content-enhance-ready", () => false);
</script>

<template>
  <component :is="enhancementsEnabled ? ProsePEnhanced : ProseP" v-bind="$attrs">
    <slot />
  </component>
</template>
