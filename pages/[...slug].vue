<script setup lang="ts">
// @ts-nocheck
import { type Component, computed, markRaw, shallowRef, watch } from "vue";
import { defineComponent, h } from "vue";
import HeaderImage from "~/components/atoms/HeaderImage.vue";
import Navigation from "~/components/molecules/Navigation.vue";
import PageFooter from "~/components/molecules/PageFooter.vue";
import PageHeader from "~/components/molecules/PageHeader.vue";
import ProductNavigation from "~/components/molecules/ProductNavigation.vue";
import ProseA from "~/components/prose/ProseA.vue";
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

const route = useRoute();
const runtime = useRuntimeConfig();
const defaultLocale = runtime.public.defaultLocale || "en";

const resolveContentPath = (path: string) => {
  // Normalize path: ensure leading slash, collapse duplicates, drop trailing slash, map '/:locale/index' -> '/:locale'
  const withSlash = path.startsWith("/") ? path : `/${path}`;
  let normalized = withSlash.replace(/\/{2,}/g, "/");
  if (normalized !== "/" && normalized.endsWith("/")) normalized = normalized.slice(0, -1);
  normalized = normalized.replace(/^\/(\w{2})\/index$/i, "/$1");
  return normalized === "/" ? `/${defaultLocale}` : normalized;
};

// SSR-first initial doc with hydration cache to avoid client refetch overriding SSR
const ssrDocKey = `ssr-initial-doc:${resolveContentPath(route.path)}`;
const ssrInitialDoc = useState<Record<string, unknown> | null>(ssrDocKey, () => null);
let initial = ssrInitialDoc.value;
if (!initial) {
  const tryPath = resolveContentPath(route.path);
  // 1) Try exact _path (gracefully handle 404 from content API)
  let fetched: Record<string, unknown> | null = null;
  try {
    fetched = await queryContent(tryPath).where({ _path: tryPath }).findOne();
  } catch {}
  // 2) Try alias match (if supported by content index)
  if (!fetched) {
    try {
      fetched = await queryContent()
        .where({ aliases: { $contains: tryPath } })
        .findOne();
    } catch {}
  }
  // 3) Fallback: prepend '/fi' for root-level paths when not found
  if (!fetched && !/^\/\w{2}\b/.test(tryPath)) {
    const fiPath = `/fi${tryPath}`;
    fetched = await queryContent(fiPath).where({ _path: fiPath }).findOne();
  }
  ssrInitialDoc.value = fetched;
  initial = fetched;
  if (process.dev)
    console.log("[initial-doc] fetched initial doc", {
      path: resolveContentPath(route.path),
      _path: (fetched as Record<string, unknown>)?._path,
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
    .only(['_path', 'cover'])
    .findOne();
  // Strictly filter to ensure no extra properties leak into hydration state
  const strippedIdx = fetchedIdx ? { _path: (fetchedIdx as any)._path, cover: (fetchedIdx as any).cover } : null;
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
  const d = (data.value as Record<string, unknown>) || null;
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
    let next: Record<string, unknown> | null = null;
    try {
      next = await queryContent(path).where({ _path: path }).findOne();
    } catch {}
    if (!next) {
      try {
        next = await queryContent()
          .where({ aliases: { $contains: path } })
          .findOne();
      } catch {}
    }
    if (!next && !/^\/\w{2}\b/.test(path)) {
      const fiPath = `/fi${path}`;
      next = await queryContent(fiPath).where({ _path: fiPath }).findOne();
    }
    const nextLocale = getLocaleFromPath(route.path);
    const nextIndex = await queryContent(`/${nextLocale}`)
      .where({ _path: `/${nextLocale}` })
      .only(['_path', 'cover'])
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

const makeHeading = (level: 1 | 2 | 3 | 4 | 5 | 6) =>
  defineComponent({
    name: `ProseH${level}Wrapper`,
    inheritAttrs: false,
    props: { id: String },
    setup(props, { slots, attrs }) {
      return () => {
        const Comp: Component =
          enhancementsEnabled.value && enhancedHeadingComp.value
            ? enhancedHeadingComp.value
            : ProseHeading;
        // Pass slots as render function to preserve slot context
        return h(Comp, { ...attrs, ...props, level }, slots);
      };
    },
  });

// Generic wrapper that preserves slot render context
const wrap = (Target: Component) =>
  defineComponent({
    name: "WrappedComponent",
    inheritAttrs: false,
    setup(_, { slots, attrs }) {
      // Return render function; h() with slots object will properly forward slots
      return () => h(Target, attrs, slots);
    },
  });

// Anchor wrapper to choose between enhanced/basic while preserving slot context
const AWrapper = defineComponent({
  name: "ProseAWrapper",
  inheritAttrs: false,
  props: { href: String, rel: String, target: String },
  setup(props, { slots, attrs }) {
    return () => {
      const Comp: Component =
        enhancementsEnabled.value && enhancedAComp.value ? enhancedAComp.value : ProseA;
      // Pass slots directly to preserve render context
      return h(Comp, { ...attrs, ...props }, slots);
    };
  },
});

// Image wrapper to switch between basic and enhanced img
const ImgWrapper = defineComponent({
  name: "ProseImgWrapper",
  inheritAttrs: false,
  props: { src: String, alt: String, width: Number, height: Number },
  setup(props, { slots, attrs }) {
    const isDebug = () => {
      try {
        return (
          process.dev &&
          typeof window !== "undefined" &&
          typeof URLSearchParams !== "undefined" &&
          new URLSearchParams(window.location.search).has("debugHydration")
        );
      } catch {
        return false;
      }
    };
    let lastKind: string | null = null;
    return () => {
      // Always use the basic image component to avoid remounts on enhancement
      const useEnhanced = false;
      const Comp: Component = ProseImg;
      if (isDebug()) {
        const kind = "basic";
        if (kind !== lastKind) {
          console.log("[ProseImgWrapper] rendering", {
            kind,
            src: (props as Record<string, unknown>)?.src,
            attrs,
          });
          lastKind = kind;
        }
      }
      return h(Comp, { ...attrs, ...props }, slots);
    };
  },
});

// Create components ONCE at module level, not inside computed
// This prevents recreating components on every render
// Use markRaw on static wrappers to prevent unnecessary re-renders when enhancementsEnabled changes
const PWrapper = defineComponent({
  name: "ProsePWrapper",
  inheritAttrs: false,
  setup(_, { slots, attrs }) {
    return () => {
      // Always use the basic paragraph to avoid parent-type swaps remounting children
      const Comp: Component = ProseP;
      return h(Comp, attrs, slots);
    };
  },
});

const proseComponents = {
  h1: makeHeading(1),
  h2: makeHeading(2),
  h3: makeHeading(3),
  h4: makeHeading(4),
  h5: makeHeading(5),
  h6: makeHeading(6),
  p: PWrapper,
  a: AWrapper,
  code: markRaw(wrap(ProseCode)),
  pre: markRaw(wrap(ProsePre)),
  ul: markRaw(wrap(ProseUl)),
  ol: markRaw(wrap(ProseOl)),
  li: markRaw(wrap(ProseLi)),
  blockquote: markRaw(wrap(ProseBlockquote)),
  img: markRaw(ImgWrapper),
  table: markRaw(wrap(ProseTable)),
  thead: markRaw(wrap(ProseThead)),
  tbody: markRaw(wrap(ProseTbody)),
  tr: markRaw(wrap(ProseTr)),
  th: markRaw(wrap(ProseTh)),
  td: markRaw(wrap(ProseTd)),
  "prose-alert": markRaw(wrap(ProseAlert)),
  alert: markRaw(wrap(ProseAlert)),
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
  return (
    (data.value as Record<string, unknown>)?.description ||
    "This is the TSS starter. Content below is rendered from Markdown."
  );
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
const useHeroLayout = computed(() => !isPlainTemplate.value && !!heroImage.value);

// Check if we're on the index page
const isIndexPage = computed(() => {
  const path = (data.value as Record<string, unknown>)?._path;
  return path === `/${defaultLocale}` || path === "/";
});

// Product template specifics
const isProductTemplate = computed(() => templateName.value === "product");
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
    <PageHeader v-if="!isProductTemplate" :title="pageTitle" :description="pageDescription" />
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
          <PageHeader :title="pageTitle" :description="pageDescription" />
          <ContentRenderer v-if="data" :key="version" :value="data" :components="proseComponents" />
          <PageFooter />
        </div>
      </main>
    </div>

    <!-- Default content layout -->
    <div v-else class="content-layout" :class="{ 'single-column': !useHeroLayout }">
      <main class="content-column prose">
        <ContentRenderer v-if="data" :key="version" :value="data" :components="proseComponents" />
      </main>
      <aside v-if="useHeroLayout" class="image-column">
        <HeaderImage :image="heroImage" :alt="pageTitle" />
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