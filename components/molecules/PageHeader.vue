<script setup lang="ts">
// @ts-nocheck
import { computed } from "vue";
import BaseHeader from "~/components/atoms/BaseHeader.vue";
import BaseParagraph from "~/components/atoms/BaseParagraph.vue";

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
  <header>
    <BaseHeader>{{ pageTitle }}</BaseHeader>
    <BaseParagraph>{{ description }}</BaseParagraph>
  </header>
</template>
