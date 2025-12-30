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

    // 2. Build Nodes

    const graph: Record<string, unknown>[] = [];

    // Node: Organization (Gogam)
    if (doc.organization) {
      const org = doc.organization;
      const orgNode: Record<string, unknown> = {
        "@type": "Organization",
        "@id": orgId,
        name: org.name,
        url: org.url || siteUrl,
      };
      if (org.description) orgNode.description = org.description;
      if (org.logo) orgNode.logo = org.logo;
      if (org.sameAs) orgNode.sameAs = org.sameAs;

      // Link Founder if exists
      if (org.founder) {
        orgNode.founder = { "@id": personId };
      }

      // Sub-Organizations
      if (doc.subOrganizations && Array.isArray(doc.subOrganizations)) {
        orgNode.subOrganization = doc.subOrganizations.map((sub: Record<string, unknown>) => ({
          "@type": "Organization",
          name: sub.name,
          description: sub.description,
          url: sub.url,
        }));
      }

      graph.push(orgNode);
    }

    // Node: Person (Founder/Author)
    let personNode: Record<string, unknown> | undefined;

    if (doc.organization?.founder) {
      const f = doc.organization.founder;
      console.log("Debug Founder:", f);
      personNode = {
        "@type": "Person",
        "@id": personId,
        name: f.name,
        jobTitle: f.jobTitle,
        url: f.url,
        sameAs: f.sameAs,
        knowsAbout: f.knowsAbout,
        description: f.description,
      };
      graph.push(personNode);
    } else if (doc.author) {
      // Fallback if not using the organization structure
      // We want a clean node for subpages: @type, @id, name, url, sameAs
      const authorName = typeof doc.author === "string" ? doc.author : doc.author.name;
      personNode = {
        "@type": "Person",
        "@id": personId,
        name: authorName,
      };

      if (typeof doc.author !== "string") {
        if (doc.author.url) personNode.url = doc.author.url;
        if (doc.author.sameAs) personNode.sameAs = doc.author.sameAs;
        // Inject default sameAs if missing, as per user request for consistency?
        // The user showed "sameAs": ["https://strangeworlder.itch.io/"]
        // If the frontmatter doesn't have it, we might want to add it or leave it out.
        // For now, let's explicitly copy only these fields to avoid "noise".
      }
      graph.push(personNode);
    }

    // Node: WebSite
    const webSiteNode: Record<string, unknown> = {
      "@type": "WebSite",
      "@id": webSiteId,
      url: siteUrl,
      name: "Gogam",
      publisher: { "@id": orgId },
    };
    graph.push(webSiteNode);

    // Node: Game / CreativeWork (The Product/Entity)
    // We create a separate node for the "Game" (or structured content) itself, distinct from the page.
    const primaryType = schemaType.length === 1 ? schemaType[0] : schemaType;
    let contentType = primaryType;
    if (contentType === "WebSite") contentType = "WebPage"; // Default fallback

    // Logic: If it's a specific CreativeWork (Game, Book, etc.), separate it.
    // If it's just a generic page, we might keep it merged or simple.
    // For now, let's assume if it has specific fields like 'genre' or 'offers', it's a Product/Work.
    const isCreativeWork = ["Game", "CreativeWork", "Book", "SoftwareApplication"].some((t) => {
      return Array.isArray(schemaType) ? schemaType.includes(t) : schemaType === t;
    });

    // ID for the item itself (e.g., the Game)
    const itemId = `${url}#game`; // Using #game as a convention for the primary entity

    // Node: WebPage
    const pageNode: Record<string, unknown> = {
      "@type": "WebPage",
      "@id": webPageId,
      url: url,
      name: `${title} - ${siteName}`, // Page title often includes site name
      description: description,
      inLanguage: documentLocale,
      isPartOf: { "@id": webSiteId },
    };

    if (isCreativeWork) {
      // Separate Entity Node
      const itemNode: Record<string, unknown> = {
        "@type": schemaType,
        "@id": itemId,
        name: title,
        description: description, // Item description
        url: url, // The item's canonical URL is often the page URL
        mainEntityOfPage: { "@id": webPageId }, // Inverse link
      };

      // Author/Publisher links on the Item
      if (doc.organization) {
        itemNode.publisher = { "@id": orgId };
      }
      // Link Founder/Author to Item
      if (personNode) {
        itemNode.author = { "@id": personId };
      }

      // Specific Fields to Item
      if (doc.genre) itemNode.genre = doc.genre;
      if (doc.gameInterfaceType) itemNode.gameInterfaceType = doc.gameInterfaceType;
      if (doc.numberOfPlayers) itemNode.numberOfPlayers = doc.numberOfPlayers;
      if (doc.sameAs) itemNode.sameAs = doc.sameAs;

      // Offers
      if (doc.offers) {
        itemNode.offers = {
          "@type": "Offer",
          url: doc.offers.url,
          price: doc.offers.price || "0",
          priceCurrency: doc.offers.priceCurrency || "USD",
          availability: doc.offers.availability || "https://schema.org/InStock",
        };
      }

      graph.push(itemNode);

      // Page points to Item
      pageNode.mainEntity = { "@id": itemId };

      // Move snippets (abstract/review) to Item or Page? Snippets usually belong to the creative work.
      if (doc.summary) itemNode.abstract = doc.summary;
      // ... (move other creative work props if needed)
    } else {
      // Generic Page (About, Contact, etc.)
      // Keep mainEntity logic simple or point to itself
      // If it's just a WebPage, mainEntity is usually not needed or points to itself.
      // But for consistency:
      // pageNode.mainEntity = ...
    }

    // Link Page to Person/Org (Metadata about the PAGE authorship, not necessarily the content)
    if (doc.organization) {
      pageNode.publisher = { "@id": orgId };
    }

    // Add other fields to Page Node
    const additionalProperty: Record<string, unknown>[] = [];
    if (doc.facts && Array.isArray(doc.facts)) {
      for (const f of doc.facts) {
        additionalProperty.push({
          "@type": "PropertyValue",
          name: (f as Record<string, unknown>).label,
          value: (f as Record<string, unknown>).value,
        });
      }
    }
    if (doc.stats && Array.isArray(doc.stats)) {
      for (const s of doc.stats) {
        additionalProperty.push({
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
    if (additionalProperty.length > 0) pageNode.additionalProperty = additionalProperty;

    if (doc.quotes && Array.isArray(doc.quotes)) {
      pageNode.review = doc.quotes.map((q: Record<string, unknown>) => ({
        "@type": "Review",
        reviewRating: { "@type": "Rating", ratingValue: "5", bestRating: "5" },
        author: { "@type": "Person", name: (q as Record<string, unknown>).source },
        reviewBody: (q as Record<string, unknown>).text,
        datePublished: (q as Record<string, unknown>).date,
      }));
    }

    if (doc.summary) pageNode.abstract = doc.summary;

    if (doc.citations && Array.isArray(doc.citations)) {
      pageNode.citation = doc.citations.map((c: Record<string, unknown>) => c.url || c.title);
    }

    // AEO / Game Specific Fields
    if (doc.genre) pageNode.genre = doc.genre;
    if (doc.gameInterfaceType) pageNode.gameInterfaceType = doc.gameInterfaceType;
    if (doc.numberOfPlayers) pageNode.numberOfPlayers = doc.numberOfPlayers;

    // FAQ
    const isGame = typeArray.includes("Game");
    if (doc.faq && Array.isArray(doc.faq) && doc.faq.length > 0) {
      const faqItems = doc.faq.map((item: Record<string, unknown>) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      }));

      // Embed inside the page object
      if (!pageNode.mainEntity) {
        pageNode.mainEntity = { "@type": "FAQPage", mainEntity: faqItems };
      } else {
        // If mainEntity is already taken (e.g. by Person), push FAQPage as a separate node linked or just embed as 'hasPart'?
        // Schema.org allows array for mainEntity, but let's be safe and use 'hasPart' for FAQ if mainEntity is used.
        // OR just nest it.
        // Let's create a separate FAQPage node for clarity in the graph?
        // Actually, embedding is often cleaner for snippets.
        // Since we set mainEntity to Person in the index case, we can use 'hasPart' for the FAQPage.
        pageNode.hasPart = { "@type": "FAQPage", mainEntity: faqItems };
      }
    }

    if (doc.tags && Array.isArray(doc.tags)) {
      meta.push({ name: "keywords", content: doc.tags.join(", ") });
    }

    // Push page node last
    graph.push(pageNode);

    // Add any manually specified structured data from frontmatter
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
