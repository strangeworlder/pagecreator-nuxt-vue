<script setup lang="ts">
defineProps<{ forId?: string }>();
</script>

<template>
  <label :for="forId" class="mb-1 block text-sm font-medium text-gray-700">
    <slot />
  </label>
</template>


