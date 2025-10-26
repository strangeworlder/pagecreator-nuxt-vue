<script setup lang="ts">
const props = defineProps<{ level?: 1 | 2 | 3 | 4 | 5 | 6 }>()
</script>

<template>
  <a v-if="$attrs.id" :name="$attrs.id"></a>
  <component :is="`h${props.level || 2}`" v-bind="$attrs">
    <slot />
  </component>
  
</template>


