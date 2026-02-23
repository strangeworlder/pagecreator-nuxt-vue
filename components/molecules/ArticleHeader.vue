<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "#imports";
import BaseLanguageSwitcher from "~/components/atoms/BaseLanguageSwitcher.vue";

interface AlternateLocale {
  code: string;
  path: string;
}

const props = defineProps<{
  title: string;
  date?: string | Date;
  authorName?: string;
  alternateLocales?: AlternateLocale[];
}>();

const route = useRoute();
const locale = computed(() => {
  const match = route.path.match(/^\/([a-z]{2})\b/);
  return match ? match[1] : "en";
});

const formattedDate = computed(() => {
  if (!props.date) return "";
  const d = new Date(props.date);

  if (locale.value === "fi") {
    return d.toLocaleDateString("fi-FI");
  }
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
});
</script>

<template>
  <header class="article-header">
    <div class="article-header-top">
      <h1 class="article-title">{{ title }}</h1>
      <BaseLanguageSwitcher v-if="alternateLocales && alternateLocales.length > 0" :locales="alternateLocales" />
    </div>
    <div class="article-meta">
      <time v-if="date" :datetime="new Date(date).toISOString()" class="article-date">{{ formattedDate }}</time>
      <span v-if="authorName" class="article-author">by {{ authorName }}</span>
    </div>
  </header>
</template>

<style scoped>
.article-header {
  margin-bottom: var(--space-2xl);
  border-bottom: 1px solid var(--color-border);
  padding-bottom: var(--space-lg);
}
.article-header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-sm);
  margin-bottom: var(--space-sm);
}
@media (max-width: 768px) {
  .article-header-top {
    flex-direction: column;
    align-items: flex-start;
  }
}
.article-title {
  margin-bottom: 0;
  font-size: var(--h1-font-size);
  line-height: var(--line-height);
}
.article-meta {
  display: flex;
  gap: var(--space-md);
  font-size: var(--size-2);
  color: var(--color-muted);
  font-family: var(--font-sans, sans-serif);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
</style>
