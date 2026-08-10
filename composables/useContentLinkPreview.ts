import { computed, ref } from "vue";
import { useRoute, useRuntimeConfig, useState } from "#imports";

export interface ContentPreview {
  title?: string;
  description?: string;
  summary?: string;
  cover?: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
  tags?: string[];
  _path?: string;
}

export function useContentLinkPreview() {
  const previewCache = ref<Map<string, ContentPreview | null>>(new Map());
  const loading = ref<Set<string>>(new Set());
  const enhancementsEnabled = useState<boolean>("content-enhance-ready", () => false);

  const getContentPreview = async (path: string): Promise<ContentPreview | null> => {
    const route = useRoute();
    const runtime = useRuntimeConfig();
    const defaultLocale = (runtime.public?.defaultLocale as string) || "fi";
    const SUPPORTED_LOCALES = new Set(["en", "fi", "sv"]);
    const firstSeg = (p: string) => (p.split("/")[1] || "").trim();
    const routeFirst = firstSeg(route.path);
    const currentLocale = SUPPORTED_LOCALES.has(routeFirst) ? routeFirst : "";

    const candidates: string[] = [];
    const collapse = (p: string) => p.replace(/\/{2,}/g, "/").replace(/(.+)\/$/, "$1") || "/";
    const isLocalized = (p: string) => SUPPORTED_LOCALES.has(firstSeg(p));

    if (path.startsWith("/")) {
      const abs = collapse(path);
      if (abs === "/") {
        // Map root to current or default locale index
        const localeRoot = `/${currentLocale || defaultLocale}`;
        candidates.push(localeRoot);
        candidates.push("/");
      } else if (isLocalized(abs)) {
        candidates.push(abs);
      } else {
        // Absolute but missing locale -> try locale-prefixed first, then as-is
        const withLocale = `/${currentLocale || defaultLocale}${abs}`;
        candidates.push(collapse(withLocale));
        candidates.push(abs);
      }
    } else {
      // Relative link -> try locale-relative and root-relative
      const withCurrent = currentLocale ? `/${currentLocale}/${path}` : `/${defaultLocale}/${path}`;
      candidates.push(collapse(withCurrent));
      candidates.push(collapse(`/${path}`));
    }

    const unique = Array.from(new Set(candidates.map((p) => p.replace(/\/{2,}/g, "/"))));

    for (const p of unique) {
      if (previewCache.value.has(p)) {
        const cached = previewCache.value.get(p) || null;
        if (cached) return cached;
      }
    }

    if (unique.some((p) => loading.value.has(p))) {
      return null;
    }

    try {
      for (const p of unique) {
        loading.value.add(p);
      }

      const results = await queryCollection('content')
        .where('path', 'IN', unique)
        .orWhere(q => q.where('canonical', 'IN', unique))
        .select('title', 'description', 'summary', 'cover', 'meta', 'datePublished', 'dateModified', 'tags', 'path', 'canonical', 'aliases')
        .all();

      if (Array.isArray(results) && results.length) {
        // Pick the best match based on candidate order
        const pickScore = (doc: Record<string, unknown>): number => {
          for (let i = 0; i < unique.length; i++) {
            const p = unique[i];
            const aliases = Array.isArray(doc.aliases)
              ? doc.aliases
              : doc.aliases
                ? [doc.aliases]
                : [];
            if (doc.path === p || doc.canonical === p || aliases.includes(p)) {
              return i;
            }
          }
          return Number.MAX_SAFE_INTEGER;
        };

        const best = results.slice().sort((a, b) => pickScore(a as Record<string, unknown>) - pickScore(b as Record<string, unknown>))[0];
        if (best) {
          const preview: ContentPreview = {
            title: best.title as string,
            description: best.description as string,
            summary: best.summary as string,
            cover: best.cover as string,
            image: (best.meta as any)?.image,
            datePublished: best.datePublished as string,
            dateModified: best.dateModified as string,
            tags: best.tags as string[],
            _path: best.path as string,
          };
          previewCache.value.set(best.path as string, preview);
          return preview;
        }
      }
    } catch (error) {
      console.warn(`Failed to fetch content preview for candidates: ${unique.join(", ")}`, error);
    } finally {
      for (const p of unique) {
        loading.value.delete(p);
      }
    }

    for (const p of unique) {
      previewCache.value.set(p, null);
    }
    return null;
  };

  const isLocalLink = (href: string): boolean => {
    if (!href) return false;
    return !/^(https?:)?\/\//.test(href) && !href.startsWith("#") && !href.startsWith("mailto:");
  };

  const getPreviewForLink = async (href: string): Promise<ContentPreview | null> => {
    if (!isLocalLink(href)) {
      return null;
    }
    if (!enhancementsEnabled.value) {
      return null;
    }
    return await getContentPreview(href);
  };

  return {
    getContentPreview,
    getPreviewForLink,
    isLocalLink,
    loading: computed(() => loading.value.size > 0),
  };
}
