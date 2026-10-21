import type { Ref } from "vue";
import { buildKnowledgeGraph } from "~/utils/knowledgeGraph";
import { ensureLeadingSlash, removeTrailingSlash } from "~/utils/routing";

function replaceFirstPathSegment(inputPath: string, newFirst: string): string {
  const parts = ensureLeadingSlash(inputPath).split("/");
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

function localeFromPathLike(value?: string | null): string | undefined {
  if (!value) return undefined;
  const segment = ensureLeadingSlash(value)
    .split("/")
    .find((part) => Boolean(part));
  if (isLikelyLocale(segment)) return segment;
  return undefined;
}

function resolveDocumentLocale(doc: Record<string, unknown>, fallback: string): string {
  const explicit = doc.lang || doc.language || doc.locale || doc._locale || doc._lang;
  if (isLikelyLocale(explicit)) {
    return String(explicit).trim();
  }

  const pathCandidates = [doc.path, doc._path, doc._id, doc._file, doc.canonical];
  for (const candidate of pathCandidates) {
    const locale = localeFromPathLike(typeof candidate === "string" ? candidate : undefined);
    if (locale) return locale;
  }

  return fallback;
}

function formatHreflang(code: string): string {
  const trimmed = code.trim();
  if (!trimmed) return trimmed;
  const [language = "", region] = trimmed.split("-");
  if (!region) return language.toLowerCase();
  return `${language.toLowerCase()}-${region.toUpperCase()}`;
}

function localeToPathSegment(code: string): string {
  return code.split("-")[0]?.toLowerCase() || code.toLowerCase();
}

export function useCustomContentHead(
  docRef: Ref<Record<string, unknown> | null | undefined>,
): void {
  const runtime = useRuntimeConfig();
  const defaultLocale = String(runtime.public.defaultLocale || "fi");
  const siteUrl = String(runtime.public.siteUrl || "");
  const siteName = String(runtime.public.siteName || "Gogam");

  watchEffect(() => {
    const doc = docRef?.value;
    if (!doc) return;

    const rawPath = ensureLeadingSlash(String(doc.canonical || doc.path || doc._path || "/"));
    const path = removeTrailingSlash(rawPath);
    const sourcePath = ensureLeadingSlash(String(doc.path || doc._path || path));
    const url = `${siteUrl}${path}`;

    const documentLocale = resolveDocumentLocale(doc, defaultLocale);
    const formattedDocumentLocale = formatHreflang(documentLocale);
    const localeSegment = localeToPathSegment(documentLocale);

    const title = typeof doc.title === "string" ? doc.title : undefined;
    const description = typeof doc.description === "string" ? doc.description : undefined;
    const rawImage =
      typeof doc.image === "string"
        ? doc.image
        : typeof doc.cover === "string"
          ? doc.cover
          : undefined;

    const getSocialImage = (imagePath: string): { url: string; type?: string } => {
      if (imagePath.startsWith("http")) {
        return { url: imagePath };
      }
      const encodedSrc = encodeURIComponent(ensureLeadingSlash(imagePath));
      return {
        url: `${siteUrl}/.netlify/images?url=${encodedSrc}&w=1200&fm=png&fit=contain`,
        type: "image/png",
      };
    };

    const socialImage = rawImage ? getSocialImage(rawImage) : undefined;
    const image = socialImage?.url;
    const finalImageType =
      socialImage?.type || (image?.includes(".netlify/images") ? "image/png" : undefined);
    const noindex = doc.noindex === true;

    const docType = doc.contentType || (doc.datePublished ? "article" : "website");
    const typeArray = (Array.isArray(docType) ? docType : [docType]).map(String);

    const ogType = typeArray.includes("Game")
      ? "website"
      : typeArray.includes("article")
        ? "article"
        : "website";

    const schemaType = typeArray.map((t: string) => {
      if (t === "article") return "Article";
      if (t === "website") return "WebPage";
      return t;
    });

    // META TAGS
    const meta: { name?: string; property?: string; content: string }[] = [];
    if (description) meta.push({ name: "description", content: description });
    if (noindex) meta.push({ name: "robots", content: "noindex, nofollow" });

    if (title) meta.push({ property: "og:title", content: title });
    if (description) meta.push({ property: "og:description", content: description });
    meta.push({ property: "og:type", content: ogType });
    meta.push({ property: "og:url", content: url });
    if (image) {
      meta.push({ property: "og:image", content: image });
      meta.push({ property: "og:image:width", content: "1200" });
      meta.push({ property: "og:image:height", content: "630" });
      if (finalImageType) {
        meta.push({ property: "og:image:type", content: finalImageType });
      }
    }
    meta.push({ name: "twitter:card", content: image ? "summary_large_image" : "summary" });
    if (title) meta.push({ name: "twitter:title", content: title });
    if (description) meta.push({ name: "twitter:description", content: description });
    if (image) meta.push({ name: "twitter:image", content: image });

    // LINKS
    const link: { rel: string; href: string; hreflang?: string }[] = [];
    link.push({ rel: "canonical", href: url });

    const alternatesRaw: unknown = doc.alternateLocales;
    const alternates: { code: string; path?: string }[] = [];

    if (Array.isArray(alternatesRaw)) {
      for (const val of alternatesRaw) {
        if (typeof val === "string" && isLikelyLocale(val)) {
          alternates.push({ code: val.trim() });
        } else if (
          typeof val === "object" &&
          val !== null &&
          "code" in val &&
          typeof (val as { code?: unknown }).code === "string"
        ) {
          const obj = val as { code: string; path?: string };
          const code = obj.code.trim();
          if (isLikelyLocale(code)) {
            alternates.push({ code, path: obj.path });
          }
        }
      }
    }

    const alternateLocaleSet = new Set(alternates.map((a) => formatHreflang(a.code)));
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

    const processedCodes = new Set<string>();
    for (const alt of alternates) {
      const code = formatHreflang(alt.code);
      if (!code || code === formattedDocumentLocale || processedCodes.has(code)) continue;
      processedCodes.add(code);

      let altPath = alt.path;
      if (!altPath) {
        const segment = localeToPathSegment(code);
        altPath = replaceFirstPathSegment(basePathForAlternates, segment);
      }
      addHrefLang(code, altPath);
    }

    if (hasDefaultLocaleVariant) {
      const defaultCode = formatHreflang(defaultLocale);
      let defaultHrefPath: string;
      const explicitDefault = alternates.find((a) => formatHreflang(a.code) === defaultCode);

      if (defaultCode === formattedDocumentLocale) {
        defaultHrefPath = path;
      } else if (explicitDefault?.path) {
        defaultHrefPath = explicitDefault.path;
      } else {
        const defaultSegment = localeToPathSegment(defaultCode);
        defaultHrefPath = replaceFirstPathSegment(basePathForAlternates, defaultSegment);
      }
      addHrefLang("x-default", defaultHrefPath);
    }

    const finalJsonLd = buildKnowledgeGraph(doc, {
      siteUrl,
      siteName,
      defaultLocale,
      documentLocale,
      image,
    });

    const isVideoContent = schemaType.some((t) => ["VideoObject", "TVEpisode"].includes(t));

    if (
      isVideoContent &&
      doc.contentUrl &&
      typeof doc.contentUrl === "string" &&
      doc.contentUrl.includes("youtube.com")
    ) {
      const videoId = doc.contentUrl.split("v=")[1]?.split("&")[0];
      if (videoId) {
        const embedUrl = `https://www.youtube.com/embed/${videoId}`;
        meta.push({ property: "og:video", content: embedUrl });
        meta.push({ property: "og:video:type", content: "text/html" });
        meta.push({ name: "twitter:card", content: "player" });
        meta.push({ name: "twitter:player", content: embedUrl });
        meta.push({ name: "twitter:player:width", content: "1280" });
        meta.push({ name: "twitter:player:height", content: "720" });
      }
    }

    const orgName =
      doc.organization && typeof doc.organization === "object" && "name" in doc.organization
        ? String((doc.organization as { name?: unknown }).name || "")
        : undefined;
    const suffix = orgName || siteName;

    const baseTitle = title || siteName;
    const finalTitle = baseTitle.includes(suffix) ? baseTitle : `${baseTitle} | ${suffix}`;

    useHead({
      title: finalTitle,
      htmlAttrs: { lang: documentLocale },
      meta,
      link,
      script: [
        {
          type: "application/ld+json",
          innerHTML: JSON.stringify(finalJsonLd),
        },
      ],
    });
  });
}
