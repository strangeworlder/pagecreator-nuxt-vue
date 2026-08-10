<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useAsyncData } from "#imports";
import BasePanel from "~/components/atoms/BasePanel.vue";

const route = useRoute();
const locale = computed(() => {
  const match = route.path.match(/^\/([a-z]{2})\b/);
  return match ? match[1] : "fi";
});

const { data: articles } = await useAsyncData(`latest-articles-${locale.value}`, async () => {
  const articlePath = `/${locale.value}/eevenkoto/artikkelit`;
  // We need to query the content where the path starts with the articlePath but is not the articlePath itself
  let results = await queryCollection('content')
    .where('path', 'LIKE', `${articlePath}/%`)
    .order('datePublished', 'DESC')
    .limit(3)
    .all();
  return results;
});

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  if (locale.value === "fi") return d.toLocaleDateString("fi-FI").replace(/\s+/g, '\u00A0');
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }).replace(/\s+/g, '\u00A0');
};
</script>

<template>
  <BasePanel v-if="articles && articles.length > 0" class="latest-articles">
    <h3 class="latest-articles-heading">{{ locale === 'fi' ? 'Uusimmat artikkelit' : 'Latest Articles' }}</h3>
    <ul class="latest-articles-list">
      <li v-for="article in articles" :key="article.path" class="latest-articles-item">
        <NuxtLink :to="article.path" class="latest-articles-link">
          <time v-if="article.datePublished" :datetime="new Date(article.datePublished).toISOString()" class="latest-articles-date">
            {{ formatDate(article.datePublished) }}
          </time>
          <span class="latest-articles-title">{{ article.title }}</span>
        </NuxtLink>
      </li>
    </ul>
    <NuxtLink :to="`/${locale}/eevenkoto/artikkelit`" class="all-articles-link">
      {{ locale === 'fi' ? 'Kaikki artikkelit →' : 'All articles →' }}
    </NuxtLink>
  </BasePanel>
</template>

<style scoped>
.latest-articles {
  margin-bottom: var(--space-2xl);
}
.latest-articles-heading {
  margin: 0 0 var(--space-md) 0;
  font-size: var(--size-2);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-muted);
  font-family: var(--font-sans, sans-serif);
}
.latest-articles-list {
  list-style: none;
  padding: 0;
  margin: 0 0 var(--space-md) 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
.latest-articles-link {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;
}
.latest-articles-link:hover .latest-articles-title {
  color: var(--color-accent);
  text-decoration: underline;
}
.latest-articles-date {
  font-family: var(--font-sans, sans-serif);
  font-size: var(--size-1);
  color: var(--color-muted);
  margin-bottom: var(--space-xs);
}
.latest-articles-title {
  font-weight: var(--font-weight-medium);
  font-size: var(--h5-font-size);
}
.all-articles-link {
  display: inline-block;
  font-size: var(--size-2);
  font-weight: var(--font-weight-semibold);
  color: var(--color-fg);
  text-decoration: none;
}
.all-articles-link:hover {
  text-decoration: underline;
}

@media (min-width: 640px) {
  .latest-articles-link {
    flex-direction: row;
    align-items: baseline;
    gap: var(--space-md);
  }
  .latest-articles-date {
    margin-bottom: 0;
    width: 100px;
    flex-shrink: 0;
  }
}
</style>
