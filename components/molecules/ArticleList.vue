<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useAsyncData } from "#imports";

const props = defineProps<{
  year?: string;
}>();

const route = useRoute();
// extract locale
const locale = computed(() => {
  const match = route.path.match(/^\/([a-z]{2})\b/);
  return match ? match[1] : "fi";
});

// Fetch articles
const { data: articles } = await useAsyncData(
  `article-list-${locale.value}-${props.year || "all"}`,
  async () => {
    const articlePath = `/${locale.value}/eevenkoto/artikkelit`;
    let results = await queryCollection('content')
      .where('path', 'LIKE', `${articlePath}/%`)
      .order('datePublished', 'DESC')
      .all();
    
    // Filter by year if provided
    if (props.year) {
      results = results.filter((article: any) => {
        if (!article.datePublished) return false;
        const date = new Date(article.datePublished as string | Date);
        return date.getFullYear().toString() === props.year;
      });
    }

    return results;
  },
);

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (locale.value === "fi") return d.toLocaleDateString("fi-FI").replace(/\s+/g, '\u00A0');
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }).replace(/\s+/g, '\u00A0');
};
</script>

<template>
  <div class="article-list">
    <div v-if="!articles || articles.length === 0" class="no-articles">
      {{ locale === 'fi' ? 'Ei artikkeleita.' : 'No articles found.' }}
    </div>
    <ul v-else class="article-items">
      <li v-for="article in articles" :key="article.path" class="article-item">
        <NuxtLink :to="article.path" class="article-link">
          <time v-if="article.datePublished" :datetime="new Date(article.datePublished).toISOString()" class="article-date">
            {{ formatDate(article.datePublished) }}
          </time>
          <h2 class="article-title">{{ article.title }}</h2>
          <p v-if="article.description" class="article-summary">{{ article.description }}</p>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.article-list {
  margin-top: var(--space-xl);
}
.article-items {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-xl);
}
.article-item {
  border-bottom: 1px solid var(--color-border);
  padding-bottom: var(--space-xl);
}
.article-item:last-child {
  border-bottom: none;
}
.article-link {
  text-decoration: none;
  color: inherit;
  display: block;
  transition: opacity var(--transition-fast);
}
.article-link:hover {
  opacity: var(--opacity-hover);
}
.article-date {
  font-family: var(--font-sans, sans-serif);
  font-size: var(--size-2);
  color: var(--color-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-sm);
  display: block;
}
.article-title {
  margin: 0 0 var(--space-sm) 0;
  font-size: var(--h2-font-size);
  line-height: var(--line-height);
}
.article-summary {
  margin: 0;
  color: var(--color-muted);
  font-size: var(--size-3);
  line-height: var(--line-height);
}
</style>
