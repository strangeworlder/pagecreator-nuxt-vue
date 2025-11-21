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

function isLikelyLocale(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^[a-z]{2}(?:-[a-z]{2})?$/i.test(trimmed);
}

function localeFromPathLike(value?: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const segment = ensureLeadingSlash(value)
    .split("/")
    .find((part) => !!part);
  if (isLikelyLocale(segment)) return segment as string;
  return undefined;
}

function resolveDocumentLocale(doc: Record<string, any>, fallback: string): string {
  const explicit =
    doc.lang ||
    doc.language ||
    doc.locale ||
    doc._locale ||
    doc._lang;
  if (isLikelyLocale(explicit)) {
    return String(explicit).trim();
  }

  const pathCandidates = [doc._path, doc._id, doc._file, doc.canonical];
  for (const candidate of pathCandidates) {
    const locale = localeFromPathLike(typeof candidate === "string" ? candidate : undefined);
    if (locale) return locale;
  }

  return fallback;
}

function formatHreflang(code: string): string {
  const trimmed = code.trim();
  if (!trimmed) return trimmed;
  const [language, region] = trimmed.split("-");
  if (!region) return language.toLowerCase();
  return `${language.toLowerCase()}-${region.toUpperCase()}`;
}

function localeToPathSegment(code: string): string {
  return code.split("-")[0]?.toLowerCase() || code.toLowerCase();
}

function dedupe<T>(items: T[]): T[] {
  const seen = new Set<T>();
  const result: T[] = [];
  for (const item of items) {
    if (seen.has(item)) continue;
    seen.add(item);
    result.push(item);
  }
  return result;
}

export function useCustomContentHead(docRef: Ref<Record<string, any> | null | undefined>) {
  const runtime = useRuntimeConfig();
  const defaultLocale = runtime.public.defaultLocale || "en";
  const siteUrl: string = runtime.public.siteUrl || "";

  watchEffect(() => {
    const doc = docRef?.value as any;
    if (!doc) return;

    const path: string = ensureLeadingSlash(doc.canonical || doc._path || "/");
    const sourcePath: string = ensureLeadingSlash(doc._path || path);
    const url = `${siteUrl}${path}`;

    const documentLocale = resolveDocumentLocale(doc, defaultLocale);
    const formattedDocumentLocale = formatHreflang(documentLocale);
    const localeSegment = localeToPathSegment(documentLocale);

    const title: string | undefined = doc.title;
    const description: string | undefined = doc.description;
    const rawImage: string | undefined = doc.image || doc.cover;

    // Generate social media optimized image URL (1200x630) for Open Graph and Twitter Cards
    const getSocialImage = (imagePath: string): { url: string; type?: string } => {
      if (imagePath.startsWith("http")) {
        return { url: imagePath };
      }
      const encodedSrc = encodeURIComponent(ensureLeadingSlash(imagePath));
      return {
        url: `${siteUrl}/api/image?src=${encodedSrc}&size=1200&format=png`,
        type: "image/png",
      };
    };

    const socialImage = rawImage ? getSocialImage(rawImage) : undefined;
    const image: string | undefined = socialImage?.url;
    const imageType: string | undefined = socialImage?.type;
    const fallbackImageType = image && image.includes("/api/image") ? "image/png" : undefined;
    const finalImageType = imageType || fallbackImageType;
    const noindex: boolean | undefined = doc.noindex === true;
    // Allow explicit override via front matter: contentType: "article" | "website"
    const type = doc.contentType ? String(doc.contentType) : (doc.datePublished ? "article" : "website");

    const meta: any[] = [];
    if (description) meta.push({ name: "description", content: description });
    if (noindex) meta.push({ name: "robots", content: "noindex, nofollow" });
    // Open Graph
    if (title) meta.push({ property: "og:title", content: title });
    if (description) meta.push({ property: "og:description", content: description });
    meta.push({ property: "og:type", content: type });
    meta.push({ property: "og:url", content: url });
    if (image) {
      meta.push({ property: "og:image", content: image });
      meta.push({ property: "og:image:width", content: "1200" });
      meta.push({ property: "og:image:height", content: "630" });
      if (finalImageType) {
        meta.push({ property: "og:image:type", content: finalImageType });
      }
    }
    // Twitter card
    meta.push({ name: "twitter:card", content: image ? "summary_large_image" : "summary" });
    if (title) meta.push({ name: "twitter:title", content: title });
    if (description) meta.push({ name: "twitter:description", content: description });
    if (image) meta.push({ name: "twitter:image", content: image });

    const link: any[] = [];
    link.push({ rel: "canonical", href: url });

    const alternatesRaw: unknown = doc.alternateLocales;
    const alternates = Array.isArray(alternatesRaw)
      ? alternatesRaw
          .map((value) => (typeof value === "string" ? value.trim() : ""))
          .filter((value): value is string => isLikelyLocale(value))
      : [];

    const alternateLocaleSet = new Set(alternates.map(formatHreflang));
    const hasDefaultLocaleVariant =
      formattedDocumentLocale === formatHreflang(defaultLocale) ||
      alternateLocaleSet.has(formatHreflang(defaultLocale));

    const basePathForAlternates = (() => {
      const sourceParts = sourcePath.split("/");
      if (sourceParts[1]?.toLowerCase() === localeSegment) return sourcePath;
      const canonicalParts = path.split("/");
      if (canonicalParts[1]?.toLowerCase() === localeSegment) return path;
      return sourcePath;
    })();

    const addHrefLang = (hreflang: string, hrefPath: string) => {
      if (!hreflang || !hrefPath) return;
      link.push({
        rel: "alternate",
        hreflang,
        href: `${siteUrl}${ensureLeadingSlash(hrefPath)}`,
      });
    };

    addHrefLang(formattedDocumentLocale, path);

    for (const alt of dedupe(alternates.map(formatHreflang))) {
      if (!alt || alt === formattedDocumentLocale) continue;
      const segment = localeToPathSegment(alt);
      const altPath = replaceFirstPathSegment(basePathForAlternates, segment);
      addHrefLang(alt, altPath);
    }

    if (hasDefaultLocaleVariant) {
      const defaultSegment = localeToPathSegment(formatHreflang(defaultLocale));
      const defaultHrefPath =
        formatHreflang(defaultLocale) === formattedDocumentLocale
          ? path
          : replaceFirstPathSegment(basePathForAlternates, defaultSegment);
      addHrefLang("x-default", defaultHrefPath);
    }

    const ldBase: Record<string, any> = {
      "@context": "https://schema.org",
      "@type": type === "article" ? "Article" : "WebPage",
      inLanguage: documentLocale,
      name: title,
      description,
      url,
    };

    const structured = Array.isArray(doc.structuredData)
      ? [ldBase, ...doc.structuredData]
      : [ldBase];

    useHead({
      title,
      htmlAttrs: { lang: documentLocale },
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


