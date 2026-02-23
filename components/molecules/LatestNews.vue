<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useAsyncData } from "#imports";
import { queryContent } from "#imports";

const route = useRoute();
const locale = computed(() => {
  const match = route.path.match(/^\/([a-z]{2})\b/);
  return match ? match[1] : "en";
});

const { data: articles } = await useAsyncData(`latest-news-${locale.value}`, async () => {
  const newsPath = `/${locale.value}/${locale.value === "fi" ? "uutiset" : "news"}`;
  return await queryContent(newsPath).sort({ datePublished: -1 }).limit(3).find();
});

const getArticleUrl = (article: any) => {
  if (!article.datePublished) return article._path;
  const date = new Date(article.datePublished);
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const slug = article._path.split("/").pop();
  return `/${locale.value}/${yyyy}/${mm}/${dd}/${slug}`;
};

const formatDate = (dateString: string) => {
  const d = new Date(dateString);
  if (locale.value === "fi") return d.toLocaleDateString("fi-FI").replace(/\s+/g, '\u00A0');
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }).replace(/\s+/g, '\u00A0');
};
</script>

<template>
  <BasePanel v-if="articles && articles.length > 0" class="latest-news">
    <h3 class="latest-news-heading">{{ locale === 'fi' ? 'Uutisia' : 'Latest News' }}</h3>
    <ul class="latest-news-list">
      <li v-for="article in articles" :key="article._path" class="latest-news-item">
        <NuxtLink :to="getArticleUrl(article)" class="latest-news-link">
          <time v-if="article.datePublished" :datetime="new Date(article.datePublished).toISOString()" class="latest-news-date">
            {{ formatDate(article.datePublished) }}
          </time>
          <span class="latest-news-title">{{ article.title }}</span>
        </NuxtLink>
      </li>
    </ul>
    <NuxtLink :to="`/${locale}/${locale === 'fi' ? 'uutiset' : 'news'}`" class="all-news-link">
      {{ locale === 'fi' ? 'Kaikki uutiset →' : 'All news →' }}
    </NuxtLink>
  </BasePanel>
</template>

<style scoped>
.latest-news {
  margin-bottom: var(--space-2xl);
}
.latest-news-heading {
  margin: 0 0 var(--space-md) 0;
  font-size: var(--size-2);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-muted);
  font-family: var(--font-sans, sans-serif);
}
.latest-news-list {
  list-style: none;
  padding: 0;
  margin: 0 0 var(--space-md) 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-sm);
}
.latest-news-link {
  display: flex;
  flex-direction: column;
  text-decoration: none;
  color: inherit;
}
.latest-news-link:hover .latest-news-title {
  color: var(--color-accent);
  text-decoration: underline;
}
.latest-news-date {
  font-family: var(--font-sans, sans-serif);
  font-size: var(--size-1);
  color: var(--color-muted);
  margin-bottom: var(--space-xs);
}
.latest-news-title {
  font-weight: var(--font-weight-medium);
  font-size: var(--h5-font-size);
}
.all-news-link {
  display: inline-block;
  font-size: var(--size-2);
  font-weight: var(--font-weight-semibold);
  color: var(--color-fg);
  text-decoration: none;
}
.all-news-link:hover {
  text-decoration: underline;
}

@media (min-width: 640px) {
  .latest-news-link {
    flex-direction: row;
    align-items: baseline;
    gap: var(--space-md);
  }
  .latest-news-date {
    margin-bottom: 0;
    width: 100px;
    flex-shrink: 0;
  }
}
</style>
