<script setup lang="ts">
// @ts-nocheck
import { type Component, computed, markRaw, shallowRef, watch } from "vue";
import { defineComponent, h, Suspense } from "vue";
import BaseVideo from "~/components/atoms/BaseVideo.vue";
import HeaderImage from "~/components/atoms/HeaderImage.vue";
import Navigation from "~/components/molecules/Navigation.vue";
import PageFooter from "~/components/molecules/PageFooter.vue";
import PageHeader from "~/components/molecules/PageHeader.vue";
import NewsList from "~/components/molecules/NewsList.vue";
import ArticleHeader from "~/components/molecules/ArticleHeader.vue";
import LatestNews from "~/components/molecules/LatestNews.vue";
import ProductNavigation from "~/components/molecules/ProductNavigation.vue";
import ProseA from "~/components/prose/ProseA.vue";
import AWrapper from "~/components/prose/AWrapper.vue";
import ImgWrapper from "~/components/prose/ImgWrapper.vue";
import PWrapper from "~/components/prose/PWrapper.vue";
import HWrapper from "~/components/prose/HWrapper.vue";
import ProseAlert from "~/components/prose/ProseAlert.vue";
import ProseBlockquote from "~/components/prose/ProseBlockquote.vue";
import ProseCode from "~/components/prose/ProseCode.vue";
import ProseHeading from "~/components/prose/ProseHeading.vue";
import ProseImg from "~/components/prose/ProseImg.vue";
import ProseLi from "~/components/prose/ProseLi.vue";
import ProseOl from "~/components/prose/ProseOl.vue";
import ProseP from "~/components/prose/ProseP.vue";
import ProsePre from "~/components/prose/ProsePre.vue";
import ProseTable from "~/components/prose/ProseTable.vue";
import ProseTbody from "~/components/prose/ProseTbody.vue";
import ProseTd from "~/components/prose/ProseTd.vue";
import ProseTh from "~/components/prose/ProseTh.vue";
import ProseThead from "~/components/prose/ProseThead.vue";
import ProseTr from "~/components/prose/ProseTr.vue";
import ProseUl from "~/components/prose/ProseUl.vue";
import { useCustomContentHead } from "~/composables/useContentHead";
import { queryContent } from "#imports";
import { MDCSlot } from "#components";

const route = useRoute();
const runtime = useRuntimeConfig();
const defaultLocale = runtime.public.defaultLocale || "en";

const resolveContentPath = (path: string) => {
  // Normalize path: ensure leading slash, collapse duplicates, drop trailing slash, map '/:locale/index' -> '/:locale'
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  let normalized = withSlash.replace(/\/{2,}/g, "/");
  if (normalized !== "/" && normalized.endsWith("/")) normalized = normalized.slice(0, -1);
  normalized = normalized.replace(/^\/(\w{2})\/index$/i, "/$1");
  normalized = normalized.replace(/^\/(\w{2})\/index$/i, "/$1");
  return normalized === "/" ? `/${defaultLocale}` : normalized;
};

const resolveNewsRouting = (currentPath: string) => {
  const norm = resolveContentPath(currentPath);
  const articleMatch = norm.match(/^\/([a-z]{2})\/(\d{4})\/(\d{2})\/(\d{2})\/([^/]+)$/);
  if (articleMatch) {
    const [, lang, yyyy, mm, dd, slug] = articleMatch;
    return {
      type: "article",
      queryPath: `/${lang}/${lang === "fi" ? "uutiset" : "news"}/${slug}`,
      expectedDate: `${yyyy}-${mm}-${dd}`,
      paramYear: yyyy,
    };
  }
  const archiveMatch = norm.match(/^\/([a-z]{2})\/(\d{4})$/);
  if (archiveMatch) {
    const [, lang, yyyy] = archiveMatch;
    return {
      type: "archive",
      queryPath: norm,
      paramYear: yyyy,
      lang: lang,
    };
  }
  return { type: "standard", queryPath: norm };
};

const nuxtApp = useNuxtApp();

const fetchContentWithRouting = async (routePath: string) => {
  const routing = resolveNewsRouting(routePath);
  const tryPath = routing.queryPath;

  let fetched: Record<string, unknown> | null = null;
  try {
    fetched = await nuxtApp.runWithContext(() => queryContent(tryPath).where({ _path: tryPath }).findOne());
  } catch {}

  if (!fetched) {
    try {
      fetched = await nuxtApp.runWithContext(() => queryContent()
        .where({ aliases: { $contains: tryPath } })
        .findOne());
    } catch {}
  }
  if (!fetched && !/^\/\w{2}\b/.test(tryPath)) {
    const fiPath = `/fi${tryPath}`;
    fetched = await nuxtApp.runWithContext(() => queryContent(fiPath).where({ _path: fiPath }).findOne());
  }

  // Handle Archive Virtual Page
  if (!fetched && routing.type === "archive") {
    return {
      _path: routing.queryPath,
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

  // Handle Article Verifications and Redirects
  if (routing.type === "article") {
    const pubDate = fetched.datePublished;
    if (
      !pubDate ||
      new Date(pubDate as string | Date).toISOString().split("T")[0] !== routing.expectedDate
    ) {
      return null; // Date mismatch, fake 404
    }
    // Inject canonical back to the parsed URL, not the file system path
    fetched.canonical = resolveContentPath(routePath);
  } else if (
    (fetched._path?.includes("/news/") || fetched._path?.includes("/uutiset/")) &&
    fetched.template !== "news-list" &&
    fetched.datePublished
  ) {
    // If they access the raw /news/slug path, calculate the real canonical URL based on the date
    const d = new Date(fetched.datePublished as string | Date);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const slug = (fetched._path as string).split("/").pop();
    const lang = (fetched._path as string).split("/")[1] || defaultLocale;
    fetched.canonical = `/${lang}/${yyyy}/${mm}/${dd}/${slug}`;
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
  "products", // specifically for index.md
  "llms_context",
  "mentions",
  "quotes",
];

const stripSchemaData = (doc: Record<string, unknown> | null) => {
  if (!doc) return null;
  const clone = { ...doc };
  for (const key of SCHEMA_ONLY_FIELDS) {
    if (key in clone) delete clone[key];
  }
  return clone;
};

// SSR-first initial doc with hydration cache to avoid client refetch overriding SSR
const ssrDocKey = `ssr-initial-doc:${resolveContentPath(route.path)}`;
const ssrInitialDoc = useState<Record<string, unknown> | null>(ssrDocKey, () => null);

// Temporary server-only ref to hold the FULL document for Head generation
// This will NOT be hydrated to the client via useState, keeping __NUXT_DATA__ small.
let serverRawDoc: Record<string, unknown> | null = null;

let initial = ssrInitialDoc.value;
if (!initial) {
  const fetched = await fetchContentWithRouting(route.path);

  if (!fetched) {
    throw createError({ statusCode: 404, statusMessage: "Page Not Found", fatal: true });
  }

  // Preserve full doc on server for Head generation
  if (process.server) {
    serverRawDoc = fetched;
  }

  // Optimize payload: strip schema-only fields for hydration
  const stripped = stripSchemaData(fetched);

  ssrInitialDoc.value = stripped;
  initial = stripped;
  if (process.dev)
    console.log("[initial-doc] fetched initial doc", {
      path: resolveContentPath(route.path),
      _path: (fetched as Record<string, unknown>)?._path,
      stripped: true,
    });
} else {
  if (process.dev)
    console.log("[initial-doc] using SSR-cached initial doc", {
      path: resolveContentPath(route.path),
      _path: (initial as Record<string, unknown>)?._path,
    });
}

const getLocaleFromPath = (path: string) => {
  const p = resolveContentPath(path);
  const parts = p.split("/");
  const first = parts[1] || "";
  // Only treat a 2-letter code as locale; otherwise fall back to default
  return /^[a-z]{2}$/i.test(first) ? first : defaultLocale;
};

// Prefer locale from the fetched document when the route lacks locale
const initialLocale = (() => {
  const docPath =
    typeof (initial as Record<string, unknown>)?._path === "string"
      ? ((initial as Record<string, unknown>)?._path as string)
      : "";
  const fromDoc = (docPath.split("/")[1] || "").trim();
  if (/^[a-z]{2}$/i.test(fromDoc)) return fromDoc;
  return getLocaleFromPath(route.path);
})();
const ssrIdxKey = `ssr-locale-index:${initialLocale}`;
const ssrLocaleIndex = useState<Record<string, unknown> | null>(ssrIdxKey, () => null);
let initialLocaleIndex = ssrLocaleIndex.value;
if (!initialLocaleIndex) {
  const fetchedIdx = await queryContent(`/${initialLocale}`)
    .where({ _path: `/${initialLocale}` })
    .only(["_path", "cover"])
    .findOne();
  // Strictly filter to ensure no extra properties leak into hydration state
  const strippedIdx = fetchedIdx
    ? { _path: (fetchedIdx as any)._path, cover: (fetchedIdx as any).cover }
    : null;
  ssrLocaleIndex.value = strippedIdx;
  initialLocaleIndex = strippedIdx;
  if (process.dev)
    console.log("[initial-index] fetched initial locale index", {
      locale: initialLocale,
      _path: (strippedIdx as Record<string, unknown>)?._path,
    });
} else {
  if (process.dev)
    console.log("[initial-index] using SSR-cached locale index", {
      locale: initialLocale,
      _path: (initialLocaleIndex as Record<string, unknown>)?._path,
    });
}

const docState = useState<Record<string, unknown> | null>("content-doc", () => null);
const version = useState<number>("content-doc-version", () => 0);
// Ensure page shows the correct document immediately on navigation
const expectedPath = resolveContentPath(route.path);
const currentDocPath = (docState.value as Record<string, unknown>)?._path;
if (initial && currentDocPath !== expectedPath) {
  if (process.dev)
    console.log("[initial-doc-sync] setting docState to initial for path", {
      expectedPath,
      currentDocPath,
      got: (initial as Record<string, unknown>)?._path,
    });
  docState.value = initial;
  version.value = (version.value || 0) + 1;
}
const localeIndexDoc = useState<Record<string, unknown> | null>(
  "locale-index-doc",
  () => initialLocaleIndex ?? null,
);
const data = computed(() => {
  void version.value; // depend on version updates
  return docState.value ?? initial;
});
// Sync locale index state to current locale immediately to avoid stale fallback
const expectedIndexPath = `/${initialLocale}`;
const currentIndexPath = (localeIndexDoc.value as Record<string, unknown>)?._path;
if (initialLocaleIndex && currentIndexPath !== expectedIndexPath) {
  localeIndexDoc.value = initialLocaleIndex;
}
const dataForHead = computed(() => {
  // Use serverRawDoc (full content) if available on server, otherwise use hydrated data
  const d =
    process.server && serverRawDoc ? serverRawDoc : (data.value as Record<string, unknown>) || null;

  const idx = (localeIndexDoc.value as Record<string, unknown>) || null;
  const merged = d && !d.cover && idx?.cover ? { ...d, cover: idx.cover } : d;
  // Force canonical to '/' when rendering the homepage at root URL
  if (route.path === "/" && merged) {
    return { ...merged, canonical: "/" };
  }
  return merged;
});

useCustomContentHead(dataForHead);

// Use a render doc that includes cover fallback so hero can rely on it consistently
const renderDoc = computed(() => dataForHead.value as Record<string, unknown>);

watch(
  () => route.fullPath,
  async () => {
    const path = resolveContentPath(route.path);
    // Re-run the same lookup strategy on navigation
    const next = await fetchContentWithRouting(route.path);

    if (!next) {
      throw createError({ statusCode: 404, statusMessage: "Page Not Found", fatal: true });
    }
    const nextLocale = getLocaleFromPath(route.path);
    const nextIndex = await queryContent(`/${nextLocale}`)
      .where({ _path: `/${nextLocale}` })
      .only(["_path", "cover"])
      .findOne();
    const currentPath = (data.value as Record<string, unknown>)?._path;
    if (next && next._path !== currentPath) {
      if (process.dev)
        console.log("[route-doc-swap] swapping doc", { from: currentPath, to: next._path, path });
      docState.value = next;
      version.value = (version.value || 0) + 1;
    }
    if (nextIndex) {
      localeIndexDoc.value = { _path: (nextIndex as any)._path, cover: (nextIndex as any).cover };
    }
  },
);

// Canonical URL enforcement
watchEffect(() => {
  const doc = data.value as Record<string, unknown> | null;
  const currentPath = route.path;

  // 1. Determine the "ideal" canonical path
  let targetPath = (doc?.canonical as string) || currentPath;

  // 2. Normalize: Remove trailing slashes (except for root "/")
  //    e.g. "/foo/" -> "/foo", "/" -> "/"
  targetPath = targetPath.replace(/\/+$/, "") || "/";

  // 3. Check if we need to redirect
  //    Compare strict equality. If current is "/foo/", target is "/foo" -> Redirect.
  if (currentPath !== targetPath) {
    // Prevent redirect loop if the only difference is the slash but we are already at the target semantically?
    // No, we want distinct URLs. "/foo/" != "/foo".

    // Special case: valid root "/" should not redirect to itself (handled by equality check)
    // Special case: "/foo/" vs "/foo"

    if (process.dev)
      console.log("[canonical-redirect] Redirecting", { from: currentPath, to: targetPath });

    navigateTo(targetPath, { redirectCode: 301, replace: true });
  }
});

const enhancementsEnabled = useState<boolean>("content-enhance-ready", () => false);

// Store the dynamically loaded enhanced components
const enhancedHeadingComp = shallowRef<Component | null>(null);
const enhancedAComp = shallowRef<Component | null>(null);
const enhancedNavigationComp = shallowRef<Component | null>(null);
const enhancedProductNavigationComp = shallowRef<Component | null>(null);
const enhancedImgComp = shallowRef<Component | null>(null);
const enhancedPComp = shallowRef<Component | null>(null);

// Track when enhanced components are loaded
const enhancedComponentsLoaded = useState<boolean>("enhanced-components-loaded", () => false);

// Load enhanced components on client
if (process.client) {
  Promise.all([
    import("~/components/prose/ProseHeadingEnhanced.client.vue"),
    import("~/components/prose/ProseAEnhanced.client.vue"),
    import("~/components/molecules/NavigationEnhanced.client.vue"),
    import("~/components/molecules/ProductNavigationEnhanced.client.vue"),
    import("~/components/prose/ProseImgEnhanced.client.vue"),
    import("~/components/prose/ProsePEnhanced.client.vue"),
  ])
    .then(([heading, anchor, nav, pnav, imgEnh, pEnh]) => {
      enhancedHeadingComp.value = heading.default;
      enhancedAComp.value = anchor.default;
      enhancedNavigationComp.value = nav.default;
      enhancedProductNavigationComp.value = pnav.default;
      enhancedImgComp.value = imgEnh.default;
      enhancedPComp.value = pEnh.default;
      if (process.dev) console.log("[enhancements] Enhanced components loaded and ready");
    })
    .catch((err) => {
      if (process.dev) console.warn("[enhancements] Failed to load enhanced components", err);
    })
    .finally(() => {
      // Always signal that we're done loading, success or fail
      enhancedComponentsLoaded.value = true;
    });
}

const makeHWrapper = (level: 1 | 2 | 3 | 4 | 5 | 6) => 
  markRaw(
    defineComponent({
      name: `ProseH${level}Wrapper`,
      setup(props, { attrs, slots }) {
        return () => h(HWrapper, { ...props, ...attrs, level }, slots);
      },
    })
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
};

if (process.dev) {
  for (const [k, v] of Object.entries(proseComponents)) {
    if (!v) {
      // eslint-disable-next-line no-console
      console.warn("[proseComponents] Missing component for key:", k);
    }
  }
}

// Get title and description from front-matter
const pageTitle = computed(() => {
  return (data.value as Record<string, unknown>)?.title || "Welcome";
});

const pageDescription = computed(() => {
  return (data.value as Record<string, unknown>)?.description as string | undefined;
});

const pageAlternateLocales = computed(() => {
  const d = renderDoc.value as Record<string, unknown>;
  const raw = d?.alternateLocales;
  if (!raw) return [];
  const list = Array.isArray(raw) ? raw : [raw];

  return list
    .map((item: any) => {
      const code = typeof item === "string" ? item : item.code;
      let path = typeof item === "object" ? item.path : undefined;

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

      return { code, path };
    })
    .filter((i: any) => i && i.code && i.path);
});
// Page theme from front matter or template; default to 'classic' when not set
const pageTheme = computed(() => {
  const tpl = String((renderDoc.value as Record<string, unknown>)?.template || "").toLowerCase();
  if (tpl === "product") return "product" as const;
  const raw =
    (renderDoc.value as Record<string, unknown>)?.theme ||
    (renderDoc.value as Record<string, unknown>)?.pageTheme ||
    "classic";
  const theme = String(raw).toLowerCase();
  return ["classic", "modern", "product"].includes(theme) ? theme : "classic";
});
if (process.client) {
  watch(
    pageTheme,
    (t) => {
      const html = document.documentElement;
      if (html.dataset.pageTheme !== t) html.dataset.pageTheme = t;
    },
    { immediate: true },
  );
}
// Ensure SSR also sets page theme and product CSS variables on <html>
useHead(() => {
  const d: Record<string, unknown> = renderDoc.value || {};
  const pt = (d?.productTheme as Record<string, string>) || {};
  const cssVarStyle = [
    pt.bgFull ? `--product-bg-full: url(${pt.bgFull})` : "",
    pt.bgTile ? `--product-bg-tile: url(${pt.bgTile})` : "",
    pt.h1Logo ? `--product-h1-logo: url(${pt.h1Logo})` : "",
    pt.sideLogo ? `--product-side-logo: url(${pt.sideLogo})` : "",
  ]
    .filter(Boolean)
    .join("; ");
  return {
    htmlAttrs: {
      "data-page-theme": pageTheme.value,
      // inline CSS variables on the html element so SSR has visuals
      style: cssVarStyle || undefined,
    },
  };
});
// Template selection and hero image handling (decoupled from `cover`)
const templateName = computed(() =>
  String((renderDoc.value as Record<string, unknown>)?.template || "").toLowerCase(),
);
const isPlainTemplate = computed(() => !templateName.value || templateName.value === "plain");
const heroImage = computed(() => {
  const d = renderDoc.value as Record<string, unknown>;
  return d?.heroImage || d?.hero || d?.image || d?.cover || undefined;
});

// Episode template video logic
const isEpisodeTemplate = computed(() => templateName.value === "episode");
const videoUrl = computed(() => {
  if (!isEpisodeTemplate.value) return undefined;
  const d = renderDoc.value as Record<string, unknown>;
  return (d?.contentUrl as string) || undefined;
});

const useHeroLayout = computed(
  () => !isPlainTemplate.value && !isNewsListTemplate.value && !isArticleTemplate.value && (!!heroImage.value || !!videoUrl.value),
);

// Check if we're on the index page
const isIndexPage = computed(() => {
  const path = (data.value as Record<string, unknown>)?._path;
  return path === `/${defaultLocale}` || path === "/" || path === "/fi" || path === "/fi/";
});

// Product template specifics
const isProductTemplate = computed(() => templateName.value === "product");
const isArticleTemplate = computed(() => {
  if (templateName.value === "article") return true;
  const path = (data.value as Record<string, unknown>)?._path || "";
  return (
    typeof path === "string" &&
    (path.includes("/news/") || path.includes("/uutiset/")) &&
    templateName.value !== "news-list"
  );
});
const isNewsListTemplate = computed(() => templateName.value === "news-list");
const productNav = computed(() => {
  const links = (renderDoc.value as Record<string, unknown>)?.productNav;
  return Array.isArray(links) ? links : [];
});
// Apply product CSS variables from front matter to <html> for theming
if (process.client) {
  watch(
    () => (renderDoc.value as Record<string, unknown>)?.productTheme,
    (pt) => {
      if (!pt) return;
      const html = document.documentElement as HTMLElement;
      const setVar = (k: string, v?: string) => {
        if (typeof v === "string" && v) html.style.setProperty(k, `url(${v})`);
      };
      setVar("--product-bg-full", (pt as Record<string, string>).bgFull);
      setVar("--product-bg-tile", (pt as Record<string, string>).bgTile);
      setVar("--product-h1-logo", (pt as Record<string, string>).h1Logo);
      setVar("--product-side-logo", (pt as Record<string, string>).sideLogo);
    },
    { immediate: true, deep: true },
  );
}
</script>

<template>
  <div>
    <PageHeader v-if="!isProductTemplate && !isArticleTemplate" :title="pageTitle" :description="pageDescription" :alternate-locales="pageAlternateLocales" />
    <ArticleHeader v-if="isArticleTemplate && !isProductTemplate" :title="pageTitle" :date="(data as any)?.datePublished" :authorName="typeof (data as any)?.author === 'string' ? (data as any)?.author : (data as any)?.author?.name" :alternate-locales="pageAlternateLocales" />
    <component 
      :is="(enhancementsEnabled && enhancedNavigationComp) ? enhancedNavigationComp : Navigation" 
      v-if="isIndexPage" 
    />

    <!-- Product template layout -->
    <div v-if="isProductTemplate" class="product-layout">
      <aside class="product-nav">
        <component
          :is="(enhancementsEnabled && enhancedProductNavigationComp) ? enhancedProductNavigationComp : ProductNavigation"
          :links="productNav"
        />
      </aside>
      <main class="product-main prose">
        <div class="product-content">
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
        <NewsList v-if="isNewsListTemplate" :year="(data as Record<string, unknown>)?.year as string" />
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