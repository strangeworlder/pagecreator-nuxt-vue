<script setup lang="ts">
// @ts-nocheck
import { computed, watch } from "vue";
import { queryContent } from "#imports";
import { useCustomContentHead } from "~/composables/useContentHead";
import ProseA from "~/components/prose/ProseA.vue";
import { defineAsyncComponent, defineComponent, h } from "vue";
import ProseBlockquote from "~/components/prose/ProseBlockquote.vue";
import ProseCode from "~/components/prose/ProseCode.vue";
import ProseHeading from "~/components/prose/ProseHeading.vue";
import ProseLi from "~/components/prose/ProseLi.vue";
import ProseOl from "~/components/prose/ProseOl.vue";
import ProseP from "~/components/prose/ProseP.vue";
import ProsePre from "~/components/prose/ProsePre.vue";
import ProseUl from "~/components/prose/ProseUl.vue";
import ProseImg from "~/components/prose/ProseImg.vue";
import PageHeader from "~/components/molecules/PageHeader.vue";
import PageFooter from "~/components/molecules/PageFooter.vue";
import Navigation from "~/components/molecules/Navigation.vue";
import HeaderImage from "~/components/atoms/HeaderImage.vue";

const route = useRoute();
const runtime = useRuntimeConfig();
const defaultLocale = runtime.public.defaultLocale || "en";

const resolveContentPath = (path: string) => {
  // Normalize path: ensure leading slash, collapse duplicates, drop trailing slash, map '/:locale/index' -> '/:locale'
  const withSlash = path.startsWith('/') ? path : `/${path}`
  let normalized = withSlash.replace(/\/{2,}/g, '/');
  if (normalized !== '/' && normalized.endsWith('/')) normalized = normalized.slice(0, -1);
  normalized = normalized.replace(/^\/(\w{2})\/index$/i, '/$1');
  return normalized === "/" ? `/${defaultLocale}` : normalized;
};

// SSR-first initial doc with hydration cache to avoid client refetch overriding SSR
const ssrDocKey = `ssr-initial-doc:${resolveContentPath(route.path)}`;
const ssrInitialDoc = useState<Record<string, unknown> | null>(ssrDocKey, () => null);
let initial = ssrInitialDoc.value;
if (!initial) {
  const fetched = await queryContent(resolveContentPath(route.path))
    .where({ _path: resolveContentPath(route.path) })
    .findOne();
  ssrInitialDoc.value = fetched;
  initial = fetched;
  if (process.dev) console.log('[initial-doc] fetched initial doc', { path: resolveContentPath(route.path), _path: (fetched as any)?._path });
} else {
  if (process.dev) console.log('[initial-doc] using SSR-cached initial doc', { path: resolveContentPath(route.path), _path: (initial as any)?._path });
}

const getLocaleFromPath = (path: string) => {
  const p = resolveContentPath(path);
  const parts = p.split("/");
  return parts[1] || defaultLocale;
};

const initialLocale = getLocaleFromPath(route.path);
const ssrIdxKey = `ssr-locale-index:${initialLocale}`;
const ssrLocaleIndex = useState<Record<string, unknown> | null>(ssrIdxKey, () => null);
let initialLocaleIndex = ssrLocaleIndex.value;
if (!initialLocaleIndex) {
  const fetchedIdx = await queryContent(`/${initialLocale}`)
    .where({ _path: `/${initialLocale}` })
    .findOne();
  ssrLocaleIndex.value = fetchedIdx;
  initialLocaleIndex = fetchedIdx;
  if (process.dev) console.log('[initial-index] fetched initial locale index', { locale: initialLocale, _path: (fetchedIdx as any)?._path });
} else {
  if (process.dev) console.log('[initial-index] using SSR-cached locale index', { locale: initialLocale, _path: (initialLocaleIndex as any)?._path });
}

const docState = useState<Record<string, unknown> | null>("content-doc", () => null);
const version = useState<number>("content-doc-version", () => 0);
// Ensure page shows the correct document immediately on navigation
const expectedPath = resolveContentPath(route.path);
const currentDocPath = (docState.value as any)?._path;
if (initial && (currentDocPath !== expectedPath)) {
  if (process.dev) console.log('[initial-doc-sync] setting docState to initial for path', { expectedPath, currentDocPath, got: (initial as any)?._path });
  docState.value = initial;
  version.value = (version.value || 0) + 1;
}
const localeIndexDoc = useState<Record<string, unknown> | null>("locale-index-doc", () => initialLocaleIndex ?? null);
const data = computed(() => {
  void version.value; // depend on version updates
  return docState.value ?? initial;
});
// Sync locale index state to current locale immediately to avoid stale fallback
const expectedIndexPath = `/${initialLocale}`;
const currentIndexPath = (localeIndexDoc.value as any)?._path;
if (initialLocaleIndex && currentIndexPath !== expectedIndexPath) {
  localeIndexDoc.value = initialLocaleIndex;
}
const dataForHead = computed(() => {
  const d = (data.value as any) || null;
  const idx = (localeIndexDoc.value as any) || null;
  const merged = d && !d.cover && idx?.cover ? { ...d, cover: idx.cover } : d;
  // Force canonical to '/' when rendering the homepage at root URL
  if (route.path === "/" && merged) {
    return { ...merged, canonical: "/" };
  }
  return merged;
});

useCustomContentHead(dataForHead);

// Use a render doc that includes cover fallback so hero can rely on it consistently
const renderDoc = computed(() => dataForHead.value as any);

watch(
  () => route.fullPath,
  async () => {
    const path = resolveContentPath(route.path);
    const next = await queryContent(path).where({ _path: path }).findOne();
    const nextLocale = getLocaleFromPath(route.path);
    const nextIndex = await queryContent(`/${nextLocale}`)
      .where({ _path: `/${nextLocale}` })
      .findOne();
    const currentPath = (data.value as any)?._path;
    if (next && next._path !== currentPath) {
      if (process.dev) console.log('[route-doc-swap] swapping doc', { from: currentPath, to: next._path, path });
      docState.value = next;
      version.value = (version.value || 0) + 1;
    }
    if (nextIndex) {
      localeIndexDoc.value = nextIndex;
    }
  }
);

const enhancementsEnabled = useState<boolean>("content-enhance-ready", () => false);

const EnhancedHeadingComp = defineAsyncComponent(() => import("~/components/prose/ProseHeadingEnhanced.client.vue"))

const makeHeading = (level: 1 | 2 | 3 | 4 | 5 | 6) =>
  defineComponent({
    name: `ProseH${level}Wrapper`,
    inheritAttrs: false,
    setup(_, { slots, attrs }) {
      return () => {
        const Comp: any = enhancementsEnabled.value ? EnhancedHeadingComp : ProseHeading
        return h(Comp, { ...attrs, level }, slots)
      }
    },
  })

const EnhancedNavigationComp = defineAsyncComponent(() => import("~/components/molecules/NavigationEnhanced.client.vue"))

const proseComponents = computed(() => ({
  h1: makeHeading(1),
  h2: makeHeading(2),
  h3: makeHeading(3),
  h4: makeHeading(4),
  h5: makeHeading(5),
  h6: makeHeading(6),
  p: ProseP,
  a: enhancementsEnabled.value
    ? defineAsyncComponent(() => import("~/components/prose/ProseAEnhanced.client.vue"))
    : ProseA,
  code: ProseCode,
  pre: ProsePre,
  ul: ProseUl,
  ol: ProseOl,
  li: ProseLi,
  blockquote: ProseBlockquote,
  img: ProseImg,
}));

if (process.dev) {
  for (const [k, v] of Object.entries(proseComponents.value)) {
    if (!v) {
      // eslint-disable-next-line no-console
      console.warn('[proseComponents] Missing component for key:', k);
    }
  }
}

// Get title and description from front-matter
const pageTitle = computed(() => {
  return (data.value as any)?.title || "Welcome";
});

const pageDescription = computed(() => {
  return (data.value as any)?.description || "This is the TSS starter. Content below is rendered from Markdown.";
});
// Page theme from front matter; default to 'classic' when not set
const pageTheme = computed(() => {
  const theme = String(((renderDoc.value as any)?.theme || (renderDoc.value as any)?.pageTheme || "classic")).toLowerCase();
  return theme === "modern" ? "modern" : "classic";
});
if (process.client) {
  watch(pageTheme, (t) => {
    const html = document.documentElement;
    if (html.dataset.pageTheme !== t) html.dataset.pageTheme = t;
  }, { immediate: true });
}
// Template selection and hero image handling (decoupled from `cover`)
const templateName = computed(() => String(((renderDoc.value as any)?.template || "")).toLowerCase());
const isPlainTemplate = computed(() => !templateName.value || templateName.value === "plain");
const heroImage = computed(() => {
  const d = renderDoc.value as any;
  return d?.heroImage || d?.hero || d?.image || d?.cover || undefined;
});
const useHeroLayout = computed(() => !isPlainTemplate.value && !!heroImage.value);

// Check if we're on the index page
const isIndexPage = computed(() => {
  const path = (data.value as any)?._path;
  return path === `/${defaultLocale}` || path === "/";
});
</script>

<template>
  <div>
    <PageHeader :title="pageTitle" :description="pageDescription" />
    <component 
      :is="enhancementsEnabled ? EnhancedNavigationComp : Navigation" 
      v-if="isIndexPage" 
    />
    <div class="content-layout" :class="{ 'single-column': !useHeroLayout }">
      <div class="content-column prose">
        <ContentRenderer v-if="data" :key="version" :value="data" :components="proseComponents" />
      </div>
      <div v-if="useHeroLayout" class="image-column">
        <HeaderImage :image="heroImage" :alt="pageTitle" />
      </div>
    </div>
    <PageFooter />
  </div>
</template>

<style scoped>
.content-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  min-height: 100vh;
  max-width: 980px;
}

.content-layout:has(.image-column) {
  max-width: 1680px;
}

.content-layout.single-column {
  grid-template-columns: 1fr;
}

.content-column {
  padding-right: 1.5rem;
}

.image-column {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow: hidden;
}

/* Mobile styles */
@media (max-width: 768px) {
  .content-layout {
    display: flex;
    flex-direction: column;
    gap: 2rem;
    min-height: auto;
  }
  
  .content-column {
    padding-right: 0;
    order: 2;
  }
  
  .image-column {
    position: static;
    height: auto;
    order: 1;
    overflow: visible;
  }
}
</style>