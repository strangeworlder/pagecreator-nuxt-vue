<script setup lang="ts">
</script>
<template>
  <a v-if="$attrs.id" :name="$attrs.id"></a>
  <h2 v-bind="$attrs"><slot /></h2>
</template>


