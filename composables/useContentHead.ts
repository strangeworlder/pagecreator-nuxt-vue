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

function resolveDocumentLocale(doc: Record<string, unknown>, fallback: string): string {
  const explicit = doc.lang || doc.language || doc.locale || doc._locale || doc._lang;
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

export function useCustomContentHead(docRef: Ref<Record<string, unknown> | null | undefined>) {
  const runtime = useRuntimeConfig();
  const defaultLocale = runtime.public.defaultLocale || "en";
  const siteUrl: string = runtime.public.siteUrl || "";
  const siteName: string = runtime.public.siteName || "Gogam";

  watchEffect(() => {
    const doc = docRef?.value;
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
    const fallbackImageType = image?.includes("/api/image") ? "image/png" : undefined;
    const finalImageType = imageType || fallbackImageType;
    const noindex: boolean | undefined = doc.noindex === true;

    // Normalize type to array for processing, but keep single string if that's what it is for OG tags
    const docType = doc.contentType || (doc.datePublished ? "article" : "website");
    const typeArray = Array.isArray(docType) ? docType : [docType];

    // Determine the primary schema type (used for OG:type)
    // If it's a Game, we still might want "website" or "article" specifically for FB/Twitter if "game" isn't supported well,
    // but usually "website" is a safe fallback or "article".
    // For TTRPGs, "website" or "article" is standard for OG.
    const ogType = typeArray.includes("Game")
      ? "website"
      : typeArray.includes("article")
        ? "article"
        : "website";

    // Schema @type mapping
    const schemaType = typeArray.map((t: string) => {
      if (t === "article") return "Article";
      if (t === "website") return "WebPage";
      return t; // Pass through "Game", "CreativeWork", etc.
    });

    const meta: { name?: string; property?: string; content: string }[] = [];
    if (description) meta.push({ name: "description", content: description });
    if (noindex) meta.push({ name: "robots", content: "noindex, nofollow" });
    // Open Graph
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
    // Twitter card
    meta.push({ name: "twitter:card", content: image ? "summary_large_image" : "summary" });
    if (title) meta.push({ name: "twitter:title", content: title });
    if (description) meta.push({ name: "twitter:description", content: description });
    if (image) meta.push({ name: "twitter:image", content: image });

    const link: { rel: string; href: string; hreflang?: string }[] = [];
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

    // --- AEO Optimized Graph Construction ---

    // 1. Define IDs
    const orgId = `${siteUrl}${siteUrl.endsWith("/") ? "" : "/"}#organization`;
    const personId = `${siteUrl}${siteUrl.endsWith("/") ? "" : "/"}#petri`;
    const webSiteId = `${siteUrl}${siteUrl.endsWith("/") ? "" : "/"}#website`;
    const webPageId = `${url}#webpage`;

    // 2. Identify if this is the Identity Hub (Root Page)
    // We treat '/' and '/fi' (if it exists as a main hub) as the Hubs where full definitions live.
    // Ideally, only the true root '/' defines them, but '/fi' might need them localized?
    // The user instruction says: "The root page (gogam.eu) must contain the full definitions... Subpages ... must reference the Master IDs"
    // So strictly `path === '/'` or `doc._path === '/'`
    const isRoot = doc._path === "/" || doc.canonical === "/";

    // 3. Build Nodes
    const graph: Record<string, unknown>[] = [];

    // Node: Organization (Gogam)
    // Root: Full definition
    // Subpage: Reference only
    if (doc.organization) {
      const org = doc.organization;
      if (isRoot) {
        const orgNode: Record<string, unknown> = {
          "@type": "Organization",
          "@id": orgId,
          name: org.name,
          url: org.url || siteUrl,
          description: org.description,
          logo: org.logo,
          sameAs: org.sameAs,
        };

        // Link Founder if exists
        if (org.founder) {
          orgNode.founder = { "@id": personId };
        }

        // Sub-Organizations (Only on Root)
        if (doc.subOrganizations && Array.isArray(doc.subOrganizations)) {
          orgNode.subOrganization = doc.subOrganizations.map((sub: Record<string, unknown>) => ({
            "@type": "Organization",
            name: sub.name,
            description: sub.description,
            url: sub.url,
          }));
        }
        graph.push(orgNode);
      } else {
        // Subpage: Minimal Reference
        graph.push({
          "@type": "Organization",
          "@id": orgId,
          name: org.name, // Keep name for readability in graph
          url: org.url || siteUrl,
        });
      }
    }

    // Node: Person (Founder/Author)
    // Root: Full definition
    // Subpage: Reference only
    if (doc.organization?.founder || doc.author) {
      let personName = "Petri Leinonen";
      if (doc.organization?.founder?.name) personName = doc.organization.founder.name;
      else if (typeof doc.author === "string") personName = doc.author;
      else if (doc.author?.name) personName = doc.author.name;

      if (isRoot) {
        // Full definition
        const f = doc.organization?.founder || doc.author || {};
        const personNode: Record<string, unknown> = {
          "@type": "Person",
          "@id": personId,
          name: personName,
          url: f.url || siteUrl, // Default to site if no personal URL
          sameAs: f.sameAs,
          knowsAbout: f.knowsAbout,
          description: f.description,
          jobTitle: f.jobTitle,
        };
        // Ensure we don't push undefined props
        if (!personNode.url) delete personNode.url;
        graph.push(personNode);
      } else {
        // Subpage: Minimal Reference
        graph.push({
          "@type": "Person",
          "@id": personId,
          name: personName,
          url: siteUrl, // Point back to hub
        });
      }
    }

    // Node: WebSite (Always defined as separate node, pointing to Publisher)
    const webSiteNode: Record<string, unknown> = {
      "@type": "WebSite",
      "@id": webSiteId,
      url: siteUrl,
      name: "Gogam",
      publisher: { "@id": orgId },
    };
    graph.push(webSiteNode);

    // Node: Game / CreativeWork (The Product/Entity)
    const primaryType = schemaType.length === 1 ? schemaType[0] : schemaType;
    const isCreativeWork = ["Game", "CreativeWork", "Book", "SoftwareApplication"].some((t) => {
      return Array.isArray(schemaType) ? schemaType.includes(t) : schemaType === t;
    });

    // ID for the item itself
    const itemId = `${url}#game`;

    // Node: WebPage
    const pageNode: Record<string, unknown> = {
      "@type": "WebPage",
      "@id": webPageId,
      url: url,
      name: `${title} - ${siteName}`,
      description: description,
      inLanguage: documentLocale,
      isPartOf: { "@id": webSiteId },
      primaryImageOfPage: image ? { "@id": image } : undefined, // Link image
    };

    // Helper to build AdditionalProperties (Facts/Stats)
    const buildAdditionalProperties = (sourceFacts: unknown[], sourceStats: unknown[]) => {
      const props: Record<string, unknown>[] = [];
      if (Array.isArray(sourceFacts)) {
        for (const f of sourceFacts) {
          props.push({
            "@type": "PropertyValue",
            name: (f as Record<string, unknown>).label,
            value: (f as Record<string, unknown>).value,
          });
        }
      }
      if (Array.isArray(sourceStats)) {
        for (const s of sourceStats) {
          props.push({
            "@type": "PropertyValue",
            name: (s as Record<string, unknown>).metric,
            value: (s as Record<string, unknown>).value,
            dateObserved: (s as Record<string, unknown>).date,
            description: (s as Record<string, unknown>).source
              ? `Source: ${(s as Record<string, unknown>).source}`
              : undefined,
          });
        }
      }
      return props;
    };

    if (isCreativeWork) {
      // --- CREATIVE WORK (GAME) NODE ---
      const itemNode: Record<string, unknown> = {
        "@type": schemaType,
        "@id": itemId,
        name: title,
        description: description,
        url: url,
        image: image,
        mainEntityOfPage: { "@id": webPageId },
        author: { "@id": personId },
        publisher: { "@id": orgId },
      };

      // Game Specific Fields
      if (doc.genre) itemNode.genre = doc.genre;
      if (doc.gameInterfaceType) itemNode.gameInterfaceType = doc.gameInterfaceType;
      if (doc.numberOfPlayers) itemNode.numberOfPlayers = doc.numberOfPlayers;
      if (doc.sameAs) itemNode.sameAs = doc.sameAs;
      if (doc.isbn) itemNode.isbn = doc.isbn;

      // Generic CreativeWork properties
      if (doc.about) itemNode.about = doc.about;
      if (doc.mentions) itemNode.mentions = doc.mentions;
      if (doc.hasPart) itemNode.hasPart = doc.hasPart;
      if (doc.isBasedOn) itemNode.isBasedOn = doc.isBasedOn;

      // Illustrator
      if (doc.illustrator) {
        // If it's a string, assume it's a reference to the main Person ID if it matches
        if (doc.illustrator === "Petri Leinonen" || doc.illustrator === "#petri") {
          itemNode.illustrator = { "@id": personId };
        } else if (typeof doc.illustrator === "object") {
          itemNode.illustrator = doc.illustrator;
        }
      }

      // Offers
      if (doc.offers) {
        if (Array.isArray(doc.offers)) {
          // If array, wrap in AggregateOffer if intended, or just list? 
          // Common pattern is Offers property can be array of Offer.
          itemNode.offers = doc.offers.map(o => ({
            "@type": "Offer",
            url: o.url,
            price: o.price,
            priceCurrency: o.priceCurrency || "EUR",
            availability: o.availability || "https://schema.org/InStock",
            name: o.name
          }));
        } else if (doc.offers['@type'] === 'AggregateOffer') {
          // Pass through AggregateOffer structure
          itemNode.offers = {
            "@type": "AggregateOffer",
            priceCurrency: doc.offers.priceCurrency || "EUR",
            lowPrice: doc.offers.lowPrice,
            offerCount: doc.offers.offerCount,
            offers: doc.offers.offers?.map((o: any) => ({
              "@type": "Offer",
              name: o.name,
              url: o.url,
              price: o.price,
              priceCurrency: o.priceCurrency || "EUR"
            }))
          };
        } else {
          // Single Offer
          itemNode.offers = {
            "@type": "Offer",
            url: doc.offers.url,
            price: doc.offers.price || "0",
            priceCurrency: doc.offers.priceCurrency || "USD",
            availability: doc.offers.availability || "https://schema.org/InStock",
          };
        }
      }

      // Reviews
      if (doc.quotes && Array.isArray(doc.quotes)) {
        itemNode.review = doc.quotes.map((q: Record<string, unknown>) => ({
          "@type": "Review",
          reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
          author: { "@type": "Person", name: (q as Record<string, unknown>).source },
          reviewBody: (q as Record<string, unknown>).text,
          datePublished: (q as Record<string, unknown>).date,
        }));
      }

      // Additional Properties (Stats/Facts belong to the GAME, not the page)
      const additionalProps = buildAdditionalProperties(doc.facts as [], doc.stats as []);
      if (additionalProps.length > 0) itemNode.additionalProperty = additionalProps;

      // Merge data from 'entities' frontmatter if available
      // This handles cases where rich data like isBasedOn, license, matches, etc. are defined in an 'entities' block
      if (doc.entities && Array.isArray(doc.entities)) {
        for (const entity of doc.entities) {
          // Check if this entity represents the main item (by name match or generic type match if only one)
          // We utilize loose matching to capture the intent.
          const isMatch = entity.name === title ||
            (doc.entities.length === 1 && ["Game", "CreativeWork", "Product"].includes(entity.type));

          if (isMatch) {
            if (entity.isBasedOn) itemNode.isBasedOn = entity.isBasedOn;
            if (entity.license) itemNode.license = entity.license;
            if (entity.sameAs) itemNode.sameAs = entity.sameAs;
            // We generally preserve the generated 'author'/'publisher' to keep the ID references (#petri, #organization),
            // unless they are missing.
            if (!itemNode.author && entity.author) itemNode.author = entity.author;
            // Allow overriding description if strictly needed, but top-level usually prevails
          } else {
            // If we have other distinct entities defined, we could push them to graph
            // But currently the requirement focuses on the main CreativeWork.
            // We can safely treat them as separate nodes if they have IDs, or ignore if they are just extra info without ID.
            // For now, only merging into main entity is critical.
          }
        }
      }

      // Abstract
      if (doc.summary) itemNode.abstract = doc.summary;

      graph.push(itemNode);

      // Point Page to Game
      pageNode.mainEntity = { "@id": itemId };
    } else {
      // --- GENERIC PAGE ---
      // For generic pages, facts/stats might belong to the page itself or the organization?
      // Usually generic pages don't have game stats.
      const additionalProps = buildAdditionalProperties(doc.facts as [], doc.stats as []);
      if (additionalProps.length > 0) pageNode.additionalProperty = additionalProps;

      if (doc.organization) {
        pageNode.publisher = { "@id": orgId };
      }
    }

    // FAQ (Shared)
    if (doc.faq && Array.isArray(doc.faq) && doc.faq.length > 0) {
      const faqItems = doc.faq.map((item: Record<string, unknown>) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      }));

      // If mainEntity is already taken (by Game), we attach FAQ as a part of the WebPage
      if (!pageNode.mainEntity) {
        pageNode.mainEntity = { "@type": "FAQPage", mainEntity: faqItems };
      } else {
        // Embed as hasPart of the WebPage
        pageNode.hasPart = { "@type": "FAQPage", mainEntity: faqItems };
      }
    }

    // Keywords
    if (doc.tags && Array.isArray(doc.tags)) {
      meta.push({ name: "keywords", content: doc.tags.join(", ") });
    }

    graph.push(pageNode);

    // Add any manually specified structured data
    if (doc.structuredData && Array.isArray(doc.structuredData)) {
      graph.push(...doc.structuredData);
    }

    const finalJsonLd = {
      "@context": "https://schema.org",
      "@graph": graph,
    };

    useHead({
      title,
      htmlAttrs: { lang: documentLocale },
      meta,
      link,
      script: [
        {
          type: "application/ld+json",
          children: JSON.stringify(finalJsonLd),
        },
      ],
    });
  });
}
