<script setup lang="ts">
import {
  type Component,
  Suspense,
  computed,
  defineComponent,
  h,
  markRaw,
  shallowRef,
  watch,
} from "vue";
import BaseVideo from "~/components/atoms/BaseVideo.vue";
import HeaderImage from "~/components/atoms/HeaderImage.vue";
import ArticleHeader from "~/components/molecules/ArticleHeader.vue";
import ArticleList from "~/components/molecules/ArticleList.vue";
import LatestArticles from "~/components/molecules/LatestArticles.vue";
import LatestNews from "~/components/molecules/LatestNews.vue";
import Navigation from "~/components/molecules/Navigation.vue";
import NewsList from "~/components/molecules/NewsList.vue";
import PageFooter from "~/components/molecules/PageFooter.vue";
import PageHeader from "~/components/molecules/PageHeader.vue";
import ProductNavigation from "~/components/molecules/ProductNavigation.vue";
import AWrapper from "~/components/prose/AWrapper.vue";
import HWrapper from "~/components/prose/HWrapper.vue";
import ImgWrapper from "~/components/prose/ImgWrapper.vue";
import PWrapper from "~/components/prose/PWrapper.vue";
import ProseAlert from "~/components/prose/ProseAlert.vue";
import ProseBlockquote from "~/components/prose/ProseBlockquote.vue";
import ProseCode from "~/components/prose/ProseCode.vue";
import ProseLi from "~/components/prose/ProseLi.vue";
import ProseOl from "~/components/prose/ProseOl.vue";
import ProsePre from "~/components/prose/ProsePre.vue";
import ProseTable from "~/components/prose/ProseTable.vue";
import ProseTbody from "~/components/prose/ProseTbody.vue";
import ProseTd from "~/components/prose/ProseTd.vue";
import ProseTh from "~/components/prose/ProseTh.vue";
import ProseThead from "~/components/prose/ProseThead.vue";
import ProseTr from "~/components/prose/ProseTr.vue";
import ProseUl from "~/components/prose/ProseUl.vue";
import { useCustomContentHead } from "~/composables/useContentHead";
import {
  buildNewsArticlePath,
  getLocaleFromPath,
  resolveContentPath,
  resolveNewsRouting,
} from "~/utils/routing";

const route = useRoute();
const runtime = useRuntimeConfig();
const defaultLocale = String(runtime.public.defaultLocale || "fi");
const nuxtApp = useNuxtApp();

const fetchContentWithRouting = async (
  routePath: string,
): Promise<Record<string, unknown> | null> => {
  const routing = resolveNewsRouting(routePath, defaultLocale);
  const tryPath = routing.queryPath;

  let fetched: Record<string, unknown> | null = null;
  try {
    const res = await nuxtApp.runWithContext(() =>
      queryCollection("content").path(tryPath).first(),
    );
    fetched = (res as unknown as Record<string, unknown>) || null;
  } catch {}

  if (!fetched) {
    try {
      const res = await nuxtApp.runWithContext(() =>
        queryCollection("content").where("aliases", "LIKE", `%${tryPath}%`).first(),
      );
      fetched = (res as unknown as Record<string, unknown>) || null;
    } catch {}
  }
  if (!fetched && !/^\/\w{2}\b/.test(tryPath)) {
    const fiPath = `/fi${tryPath}`;
    const res = await nuxtApp.runWithContext(() => queryCollection("content").path(fiPath).first());
    fetched = (res as unknown as Record<string, unknown>) || null;
  }

  // Handle Archive Virtual Page
  if (!fetched && routing.type === "archive") {
    return {
      path: routing.queryPath,
      title:
        routing.lang === "fi"
          ? `Uutiset ${routing.paramYear}`
          : `${routing.paramYear} News Archive`,
      description:
        routing.lang === "fi"
          ? `Uutiset vuodelta ${routing.paramYear}.`
          : `Archive of news and articles from the year ${routing.paramYear}.`,
      template: "news-list",
      year: routing.paramYear,
      canonical: routing.queryPath,
    };
  }

  if (!fetched) return null;

  if (fetched.meta && typeof fetched.meta === "object") {
    fetched = { ...fetched, ...(fetched.meta as Record<string, unknown>) };
  }

  // Handle Article Verifications and Redirects
  if (routing.type === "article") {
    const pubDate = fetched.datePublished;
    if (
      !pubDate ||
      new Date(pubDate as string | Date).toISOString().split("T")[0] !== routing.expectedDate
    ) {
      return null; // Date mismatch, 404
    }
    fetched.canonical = resolveContentPath(routePath, defaultLocale);
  } else if (
    typeof fetched.path === "string" &&
    (fetched.path.includes("/news/") || fetched.path.includes("/uutiset/")) &&
    fetched.template !== "news-list" &&
    fetched.datePublished
  ) {
    const canonicalNewsUrl = buildNewsArticlePath(
      fetched.path,
      fetched.datePublished as string | Date,
      defaultLocale,
    );
    if (canonicalNewsUrl) {
      fetched.canonical = canonicalNewsUrl;
    }
  }

  return fetched;
};

// Fields that are only used for Schema/SEO and not needed for client-side rendering
const SCHEMA_ONLY_FIELDS = [
  "offers",
  "reviews",
  "aggregateRating",
  "organization",
  "subOrganization",
  "subOrganizations",
  "isBasedOn",
  "sameAs",
  "subjectOf",
  "faq",
  "stats",
  "gameItem",
  "numberOfPlayers",
  "genre",
  "gameInterfaceType",
  "disambiguatingDescription",
  "alternateName",
  "inLanguage",
  "license",
  "author",
  "marketingText",
  "products",
  "games",
  "llms_context",
  "mentions",
  "quotes",
];

const stripSchemaData = (doc: Record<string, unknown> | null): Record<string, unknown> | null => {
  if (!doc) return null;
  const clone = { ...doc };
  for (const key of SCHEMA_ONLY_FIELDS) {
    if (key in clone) delete clone[key];
  }
  return clone;
};

// SSR-first initial doc with hydration cache to avoid client refetch overriding SSR
const ssrDocKey = `ssr-initial-doc:${resolveContentPath(route.path, defaultLocale)}`;
const ssrInitialDoc = useState<Record<string, unknown> | null>(ssrDocKey, () => null);

// Temporary server-only ref to hold the FULL document for Head generation
let serverRawDoc: Record<string, unknown> | null = null;

let initial = ssrInitialDoc.value;
if (!initial) {
  const fetched = await fetchContentWithRouting(route.path);

  if (!fetched) {
    throw createError({ statusCode: 404, statusMessage: "Page Not Found", fatal: true });
  }

  if (import.meta.server) {
    serverRawDoc = fetched;
  }

  const stripped = stripSchemaData(fetched);
  ssrInitialDoc.value = stripped;
  initial = stripped;
}

const initialLocale = (() => {
  const docPath = typeof initial?.path === "string" ? initial.path : "";
  const fromDoc = (docPath.split("/")[1] || "").trim();
  if (/^[a-z]{2}$/i.test(fromDoc)) return fromDoc;
  return getLocaleFromPath(route.path, defaultLocale);
})();

const ssrIdxKey = `ssr-locale-index:${initialLocale}`;
const ssrLocaleIndex = useState<{ path?: string; cover?: string } | null>(ssrIdxKey, () => null);
let initialLocaleIndex = ssrLocaleIndex.value;
if (!initialLocaleIndex) {
  const fetchedIdx = await queryCollection("content")
    .path(`/${initialLocale}`)
    .select("path", "cover")
    .first();
  const rawIdx = fetchedIdx as { path?: string; cover?: string } | null;
  const strippedIdx = rawIdx ? { path: rawIdx.path, cover: rawIdx.cover } : null;
  ssrLocaleIndex.value = strippedIdx;
  initialLocaleIndex = strippedIdx;
}

const docState = useState<Record<string, unknown> | null>("content-doc", () => null);
const version = useState<number>("content-doc-version", () => 0);

const expectedPath = resolveContentPath(route.path, defaultLocale);
const currentDocPath = docState.value?.path;
if (initial && currentDocPath !== expectedPath) {
  docState.value = initial;
  version.value = (version.value || 0) + 1;
}

const localeIndexDoc = useState<{ path?: string; cover?: string } | null>(
  "locale-index-doc",
  () => initialLocaleIndex ?? null,
);

const data = computed<Record<string, unknown> | null>(() => {
  void version.value;
  return docState.value ?? initial;
});

const expectedIndexPath = `/${initialLocale}`;
const currentIndexPath = localeIndexDoc.value?.path;
if (initialLocaleIndex && currentIndexPath !== expectedIndexPath) {
  localeIndexDoc.value = initialLocaleIndex;
}

const dataForHead = computed<Record<string, unknown> | null>(() => {
  const d = import.meta.server && serverRawDoc ? serverRawDoc : data.value || null;
  const idx = localeIndexDoc.value || null;
  const merged = d && !d.cover && idx?.cover ? { ...d, cover: idx.cover } : d;
  if (route.path === "/" && merged) {
    return { ...merged, canonical: "/" };
  }
  return merged;
});

useCustomContentHead(dataForHead);

const renderDoc = computed<Record<string, unknown>>(() => dataForHead.value || {});

watch(
  () => route.fullPath,
  async () => {
    const next = await fetchContentWithRouting(route.path);

    if (!next) {
      throw createError({ statusCode: 404, statusMessage: "Page Not Found", fatal: true });
    }
    const nextLocale = getLocaleFromPath(route.path, defaultLocale);
    const nextIndex = await queryCollection("content")
      .path(`/${nextLocale}`)
      .select("path", "cover")
      .first();
    const currentPath = data.value?.path;
    if (next && next.path !== currentPath) {
      docState.value = next;
      version.value = (version.value || 0) + 1;
    }
    if (nextIndex) {
      const rawNextIdx = nextIndex as { path?: string; cover?: string };
      localeIndexDoc.value = { path: rawNextIdx.path, cover: rawNextIdx.cover };
    }
  },
);

// Canonical URL enforcement
watchEffect(() => {
  const doc = data.value;
  const currentPath = route.path;

  let targetPath = (typeof doc?.canonical === "string" && doc.canonical) || currentPath;
  targetPath = targetPath.replace(/\/+$/, "") || "/";

  if (currentPath !== targetPath) {
    navigateTo(targetPath, { redirectCode: 301, replace: true });
  }
});

const enhancementsEnabled = useState<boolean>("content-enhance-ready", () => false);
const enhancedNavigationComp = shallowRef<Component | null>(null);
const enhancedProductNavigationComp = shallowRef<Component | null>(null);

if (import.meta.client) {
  Promise.all([
    import("~/components/molecules/NavigationEnhanced.client.vue"),
    import("~/components/molecules/ProductNavigationEnhanced.client.vue"),
  ])
    .then(([nav, pnav]) => {
      enhancedNavigationComp.value = nav.default;
      enhancedProductNavigationComp.value = pnav.default;
    })
    .catch((err) => {
      if (import.meta.dev) console.warn("[enhancements] Failed to load enhanced navigation", err);
    });
}

const makeHWrapper = (level: 1 | 2 | 3 | 4 | 5 | 6) =>
  markRaw(
    defineComponent({
      name: `ProseH${level}Wrapper`,
      setup(props, { attrs, slots }) {
        return () => h(HWrapper, { ...props, ...attrs, level }, slots);
      },
    }),
  );

const proseComponents = {
  h1: makeHWrapper(1),
  h2: makeHWrapper(2),
  h3: makeHWrapper(3),
  h4: makeHWrapper(4),
  h5: makeHWrapper(5),
  h6: makeHWrapper(6),
  p: markRaw(PWrapper),
  a: markRaw(AWrapper),
  code: markRaw(ProseCode),
  pre: markRaw(ProsePre),
  ul: markRaw(ProseUl),
  ol: markRaw(ProseOl),
  li: markRaw(ProseLi),
  blockquote: markRaw(ProseBlockquote),
  img: markRaw(ImgWrapper),
  table: markRaw(ProseTable),
  thead: markRaw(ProseThead),
  tbody: markRaw(ProseTbody),
  tr: markRaw(ProseTr),
  th: markRaw(ProseTh),
  td: markRaw(ProseTd),
  "prose-alert": markRaw(ProseAlert),
  alert: markRaw(ProseAlert),
  "latest-news": markRaw(
    defineComponent({
      name: "LatestNewsWrapper",
      setup(_, { attrs }) {
        return () => h(Suspense, null, { default: () => h(LatestNews, attrs) });
      },
    }),
  ),
  "latest-articles": markRaw(
    defineComponent({
      name: "LatestArticlesWrapper",
      setup(_, { attrs }) {
        return () => h(Suspense, null, { default: () => h(LatestArticles, attrs) });
      },
    }),
  ),
};

const pageTitle = computed<string>(() => {
  return typeof data.value?.title === "string" ? data.value.title : "Welcome";
});

const pageDescription = computed<string | undefined>(() => {
  return typeof data.value?.description === "string" ? data.value.description : undefined;
});

const pageDatePublished = computed<string | Date | undefined>(() => {
  const raw = data.value?.datePublished;
  return typeof raw === "string" || raw instanceof Date ? raw : undefined;
});

const pageAuthorName = computed<string | undefined>(() => {
  const raw = data.value?.author;
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object" && "name" in raw && typeof raw.name === "string") {
    return raw.name;
  }
  return undefined;
});

const pageAlternateLocales = computed<Array<{ code: string; path: string }>>(() => {
  const d = renderDoc.value;
  const raw = d?.alternateLocales;
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];

  return list
    .map((item: unknown) => {
      const code =
        typeof item === "string"
          ? item
          : item && typeof item === "object" && "code" in item && typeof item.code === "string"
            ? item.code
            : undefined;
      let path =
        item && typeof item === "object" && "path" in item && typeof item.path === "string"
          ? item.path
          : undefined;

      if (!path && code) {
        const currentPath = route.path;
        const pathWithoutLocale = currentPath.replace(/^\/[a-z]{2}(\/|$)/, "/") || "/";
        if (code === defaultLocale) {
          path = pathWithoutLocale;
        } else {
          const suffix = pathWithoutLocale === "/" ? "" : pathWithoutLocale;
          path = `/${code}${suffix}`;
        }
      }

      return code && path ? { code, path } : null;
    })
    .filter((i): i is { code: string; path: string } => i !== null);
});

const pageTheme = computed(() => {
  const tpl = String(renderDoc.value?.template || "").toLowerCase();
  if (tpl === "product") return "product" as const;
  const raw = renderDoc.value?.theme || renderDoc.value?.pageTheme || "classic";
  const theme = String(raw).toLowerCase();
  return ["classic", "modern", "product"].includes(theme) ? theme : "classic";
});

if (import.meta.client) {
  watch(
    pageTheme,
    (t) => {
      const html = document.documentElement;
      if (html.dataset.pageTheme !== t) html.dataset.pageTheme = t;
    },
    { immediate: true },
  );
}

useHead(() => {
  const d = renderDoc.value || {};
  const pt = (d.productTheme as Record<string, string>) || {};
  const cssVarStyle = [
    pt.bgFull ? `--product-bg-full: url(${pt.bgFull})` : "",
    pt.bgTile ? `--product-bg-tile: url(${pt.bgTile})` : "",
    pt.h1Logo ? `--product-h1-logo: url(${pt.h1Logo})` : "",
    pt.sideLogo ? `--product-side-logo: url(${pt.sideLogo})` : "",
    pt.colorAccent ? `--color-accent: ${pt.colorAccent}` : "",
    pt.colorBg ? `--color-bg: ${pt.colorBg}` : "",
    pt.colorBgContent ? `--color-bg-content: ${pt.colorBgContent}` : "",
    pt.colorBorder ? `--color-border: ${pt.colorBorder}` : "",
    pt.colorAccentHover ? `--color-accent-hover: ${pt.colorAccentHover}` : "",
  ]
    .filter(Boolean)
    .join("; ");
  return {
    htmlAttrs: {
      "data-page-theme": pageTheme.value,
      style: cssVarStyle || undefined,
    },
  };
});

const templateName = computed(() => String(renderDoc.value?.template || "").toLowerCase());
const isPlainTemplate = computed(() => !templateName.value || templateName.value === "plain");
const heroImage = computed<string | undefined>(() => {
  const d = renderDoc.value;
  const candidate = d.heroImage || d.hero || d.image || d.cover;
  return typeof candidate === "string" ? candidate : undefined;
});

const isEpisodeTemplate = computed(() => templateName.value === "episode");
const videoUrl = computed<string | undefined>(() => {
  if (!isEpisodeTemplate.value) return undefined;
  const url = renderDoc.value?.contentUrl;
  return typeof url === "string" ? url : undefined;
});

const isArticleListTemplate = computed(() => templateName.value === "article-list");
const isNewsListTemplate = computed(() => templateName.value === "news-list");
const isProductTemplate = computed(() => templateName.value === "product");

const isArticleTemplate = computed(() => {
  if (templateName.value === "article") return true;
  const path = data.value?.path || "";
  return (
    typeof path === "string" &&
    (path.includes("/news/") || path.includes("/uutiset/") || path.includes("/artikkelit/")) &&
    templateName.value !== "news-list" &&
    templateName.value !== "article-list"
  );
});

const useHeroLayout = computed(
  () =>
    !isPlainTemplate.value &&
    !isNewsListTemplate.value &&
    !isArticleListTemplate.value &&
    !isArticleTemplate.value &&
    (Boolean(heroImage.value) || Boolean(videoUrl.value)),
);

const isIndexPage = computed(() => {
  const path = data.value?.path;
  return path === `/${defaultLocale}` || path === "/" || path === "/fi" || path === "/fi/";
});

const productNav = computed<Array<{ href: string; text: string }>>(() => {
  const links = renderDoc.value?.productNav;
  return Array.isArray(links) ? (links as Array<{ href: string; text: string }>) : [];
});

const productCustomClass = computed<string | undefined>(() => {
  const pt = data.value?.productTheme as Record<string, string> | undefined;
  return pt?.customClass;
});

const archiveYear = computed<string | undefined>(() => {
  const y = data.value?.year;
  return typeof y === "string" ? y : undefined;
});

if (import.meta.client) {
  watch(
    () => renderDoc.value?.productTheme,
    (pt) => {
      if (!pt || typeof pt !== "object") return;
      const themeMap = pt as Record<string, string>;
      const html = document.documentElement;
      const setUrlVar = (k: string, v?: string) => {
        if (typeof v === "string" && v) html.style.setProperty(k, `url(${v})`);
      };
      const setColorVar = (k: string, v?: string) => {
        if (typeof v === "string" && v) html.style.setProperty(k, v);
      };
      setUrlVar("--product-bg-full", themeMap.bgFull);
      setUrlVar("--product-bg-tile", themeMap.bgTile);
      setUrlVar("--product-h1-logo", themeMap.h1Logo);
      setUrlVar("--product-side-logo", themeMap.sideLogo);
      setColorVar("--color-accent", themeMap.colorAccent);
      setColorVar("--color-bg", themeMap.colorBg);
      setColorVar("--color-bg-content", themeMap.colorBgContent);
      setColorVar("--color-border", themeMap.colorBorder);
      setColorVar("--color-accent-hover", themeMap.colorAccentHover);
    },
    { immediate: true, deep: true },
  );
}
</script>

<template>
  <div>
    <PageHeader v-if="!isProductTemplate && !isArticleTemplate" :title="pageTitle" :description="pageDescription" :alternate-locales="pageAlternateLocales" />
    <ArticleHeader v-if="isArticleTemplate && !isProductTemplate" :title="pageTitle" :date="pageDatePublished" :author-name="pageAuthorName" :alternate-locales="pageAlternateLocales" />
    <component
      :is="(enhancementsEnabled && enhancedNavigationComp) ? enhancedNavigationComp : Navigation"
      v-if="isIndexPage"
    />

    <!-- Product template layout -->
    <div v-if="isProductTemplate" class="product-layout" :class="productCustomClass">
      <aside class="product-nav">
        <component
          :is="(enhancementsEnabled && enhancedProductNavigationComp) ? enhancedProductNavigationComp : ProductNavigation"
          :links="productNav"
        />
      </aside>
      <main class="product-main prose">
        <div class="product-content" :class="productCustomClass">
          <PageHeader :title="pageTitle" :description="pageDescription" :alternate-locales="pageAlternateLocales" />
          <ContentRenderer v-if="data" :key="version" :value="data" :components="proseComponents">
            <template #empty></template>
          </ContentRenderer>
          <PageFooter />
        </div>
      </main>
    </div>

    <!-- Default content layout -->
    <div v-else class="content-layout" :class="{ 'single-column': !useHeroLayout }">
      <main class="content-column prose">
        <ContentRenderer v-if="data" :key="version" :value="data" :components="proseComponents">
          <template #empty></template>
        </ContentRenderer>
        <NewsList v-if="isNewsListTemplate" :year="archiveYear" />
        <ArticleList v-if="isArticleListTemplate" :year="archiveYear" />
      </main>
      <aside v-if="useHeroLayout" class="image-column" :class="{ 'video-column': !!videoUrl }">
        <div v-if="videoUrl" class="video-wrapper">
          <BaseVideo :src="videoUrl" :title="pageTitle" :poster="heroImage" />
        </div>
        <HeaderImage v-else :image="heroImage" :alt="pageTitle" />
      </aside>
    </div>

    <PageFooter v-if="!isProductTemplate" />
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

.video-column {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--color-bg);
}

.video-wrapper {
  width: 100%;
  max-width: 100%;
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

/* Product layout styles (structure only; visuals in product.css) */
.product-layout {
  display: flex;
  flex-direction: row;
  min-height: 100vh;
}
.product-layout.theme-eevenkoto {
  gap: 10%;
  margin: 0 32px;
}
.product-nav {
  flex: 1 1 232px;
  max-width: 400px;
}
.product-main {
  flex: 3 1 500px;
  max-width: 860px;
  width: 100%;
}
@media (max-width: 768px) {
  .product-layout {
    flex-direction: column;
  }
}
</style>