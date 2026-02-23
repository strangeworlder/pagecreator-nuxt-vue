<script setup lang="ts">
// @ts-nocheck
import { computed } from "vue";
import BaseHeader from "~/components/atoms/BaseHeader.vue";
import BaseParagraph from "~/components/atoms/BaseParagraph.vue";
import BaseLanguageSwitcher from "~/components/atoms/BaseLanguageSwitcher.vue";

interface AlternateLocale {
  code: string;
  path: string;
}

interface Props {
  title?: string;
  description?: string;
  alternateLocales?: AlternateLocale[];
}

const props = withDefaults(defineProps<Props>(), {
  title: "Welcome",
  description: "This is the TSS starter. Content below is rendered from Markdown.",
  alternateLocales: () => [],
});

const pageTitle = computed(() => props.title);
</script>

<template>
  <header>
    <div class="header-content">
      <BaseHeader>{{ pageTitle }}</BaseHeader>
      <BaseLanguageSwitcher :locales="alternateLocales" />
    </div>
    <BaseParagraph>{{ description }}</BaseParagraph>
  </header>
</template>

<style scoped>
.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  @media (max-width: 768px) {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
