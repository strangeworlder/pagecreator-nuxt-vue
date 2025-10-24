// @ts-nocheck
import type { Ref } from "vue";

function ensureLeadingSlash(path: string): string {
  if (!path) return "/";
  return path.startsWith("/") ? path : `/${path}`;
}

function replaceFirstPathSegment(inputPath: string, newFirst: string): string {
  const parts = ensureLeadingSlash(inputPath).split("/");
  // parts[0] is "" due to leading slash
  if (parts.length > 1) {
    parts[1] = newFirst;
    return parts.join("/") || "/";
  }
  return `/${newFirst}`;
}

export function useCustomContentHead(docRef: Ref<Record<string, any> | null | undefined>) {
  const runtime = useRuntimeConfig();
  const defaultLocale = runtime.public.defaultLocale || "en";
  const siteUrl: string = runtime.public.siteUrl || "";

  watchEffect(() => {
    const doc = docRef?.value as any;
    if (!doc) return;

    const path: string = ensureLeadingSlash(doc.canonical || doc._path || "/");
    const url = `${siteUrl}${path}`;

    const localeFromPath = (() => {
      const parts = path.split("/");
      return parts[1] || defaultLocale;
    })();

    const title: string | undefined = doc.title;
    const description: string | undefined = doc.description;
    const image: string | undefined = doc.image;
    const noindex: boolean | undefined = doc.noindex === true;
    const type = doc.datePublished ? "article" : "website";

    const meta: any[] = [];
    if (description) meta.push({ name: "description", content: description });
    if (noindex) meta.push({ name: "robots", content: "noindex, nofollow" });
    // Open Graph
    if (title) meta.push({ property: "og:title", content: title });
    if (description) meta.push({ property: "og:description", content: description });
    meta.push({ property: "og:type", content: type });
    meta.push({ property: "og:url", content: url });
    if (image) meta.push({ property: "og:image", content: image });
    // Twitter card
    meta.push({ name: "twitter:card", content: image ? "summary_large_image" : "summary" });
    if (title) meta.push({ name: "twitter:title", content: title });
    if (description) meta.push({ name: "twitter:description", content: description });
    if (image) meta.push({ name: "twitter:image", content: image });

    const link: any[] = [];
    link.push({ rel: "canonical", href: url });

    const alternates: string[] = Array.isArray(doc.alternateLocales) ? doc.alternateLocales : [];
    for (const alt of alternates) {
      const altPath = replaceFirstPathSegment(path, alt);
      link.push({ rel: "alternate", hreflang: alt, href: `${siteUrl}${altPath}` });
    }
    // x-default to default locale
    const xDefaultPath = replaceFirstPathSegment(path, defaultLocale);
    link.push({ rel: "alternate", hreflang: "x-default", href: `${siteUrl}${xDefaultPath}` });

    const ldBase: Record<string, any> = {
      "@context": "https://schema.org",
      "@type": type === "article" ? "Article" : "WebPage",
      inLanguage: localeFromPath,
      name: title,
      description,
      url,
    };

    const structured = Array.isArray(doc.structuredData)
      ? [ldBase, ...doc.structuredData]
      : [ldBase];

    useHead({
      title,
      htmlAttrs: { lang: localeFromPath },
      meta,
      link,
      script: [
        {
          type: "application/ld+json",
          children: JSON.stringify(structured),
        },
      ],
    });
  });
}


