<script setup lang="ts">
const props = defineProps<{ level?: 1 | 2 | 3 | 4 | 5 | 6 }>();
</script>

<template>
  <a v-if="$attrs.id" :name="$attrs.id"></a>
  <component :is="`h${props.level || 2}`" 
    v-bind="{
      ...$attrs,
      id: $attrs.id ? `header-${$attrs.id}` : undefined,
    }">
    <slot />
  </component>
  
</template>

<style scoped>

a[name] {
  display: block;
  position: relative;
  top: -20px;
}

</style>