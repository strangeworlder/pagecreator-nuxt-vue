<script setup lang="ts">
// @ts-nocheck
import { computed } from "vue";

interface Props {
  title?: string;
  description?: string;
}

const props = withDefaults(defineProps<Props>(), {
  title: "Welcome",
  description: "This is the TSS starter. Content below is rendered from Markdown."
});

const pageTitle = computed(() => props.title);
</script>

<template>
  <div>
    <h1>{{ pageTitle }}</h1>
    <p>{{ description }}</p>
  </div>
</template>
