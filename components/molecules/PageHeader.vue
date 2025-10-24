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
    <BaseHeader :level="1">{{ pageTitle }}</BaseHeader>
    <BaseParagraph>{{ description }}</BaseParagraph>
  </div>
</template>
