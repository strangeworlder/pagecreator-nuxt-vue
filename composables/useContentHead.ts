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

// Local interfaces for frontmatter data
interface Offer {
  url: string;
  price?: string;
  priceCurrency?: string;
  availability?: string;
  name?: string;
}

interface Product {
  name: string;
  id: string;
  description: string;
  category: string;
  url: string;
  image?: string;
  offers?: Offer | Offer[];
}

interface SubOrganization {
  name: string;
  description: string;
  url?: string;
}

interface FAQItem {
  q: string;
  a: string;
}
interface CreativeWorkBase {
  name: string;
  id?: string;
  author?: { name: string; type?: string; sameAs?: string | string[] };
}

// Global Identifiers
const PETRI_IDENTITY = {
  "@id": "https://gogam.eu/#petri", // Base URL will be prepended or logic used to keep this consistent
  name: "Petri Leinonen",
  sameAs: [
    "https://rpggeek.com/rpgdesigner/111688/petri-leinonen",
    "https://www.drivethrurpg.com/en/browse?author=%22Petri%20Leinonen%22",
    "https://strangeworlder.itch.io/",
    "https://strangeworlder.medium.com/",
    "https://bsky.app/profile/strangeworlder.bsky.social",
    "https://www.threads.com/@gogam.eu",
    "https://www.youtube.com/@gogameu",
    "https://gogameu.substack.com/",
  ],
};

const GOGAM_IDENTITY = {
  "@id": "https://gogam.eu/#organization",
  name: "Gogam",
  sameAs: ["https://www.youtube.com/@gogameu"],
};


export function useCustomContentHead(docRef: Ref<Record<string, unknown> | null | undefined>) {
  const runtime = useRuntimeConfig();
  const defaultLocale = runtime.public.defaultLocale || "en";
  const siteUrl: string = runtime.public.siteUrl || "";
  const siteName: string = runtime.public.siteName || "Gogam";

  // Helper to ensure absolute URLs
  const toAbsolute = (path: string | undefined): string | undefined => {
    if (!path) return undefined;
    if (path.startsWith("http")) return path;
    return `${siteUrl}${ensureLeadingSlash(path)}`;
  };

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

    // Normalize type to array for processing
    const docType = doc.contentType || (doc.datePublished ? "article" : "website");
    const typeArray = Array.isArray(docType) ? docType : [docType];

    const ogType = typeArray.includes("Game")
      ? "website"
      : typeArray.includes("article")
        ? "article"
        : "website";

    // Schema @type mapping
    const schemaType = typeArray.map((t: string) => {
      if (t === "article") return "Article";
      if (t === "website") return "WebPage";
      return t;
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

    // --- AEO Optimized Graph Construction (Pedantic Mode) ---

    // 1. Define Persistent Entity IDs
    // Remove trailing slash from siteUrl for consistency if needed, but ensure ID format is consistent
    const baseUrl = siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;

    // Core Entities
    const orgId = `${baseUrl}/#organization`;
    const personId = `${baseUrl}/#petri`;
    const webSiteId = `${baseUrl}/#website`;

    // Page-Specific IDs
    const webPageId = `${url}#webpage`;
    const faqId = `${url}#faq`;
    const breadcrumbId = `${url}#breadcrumb`;

    const isRoot = doc._path === "/" || doc.canonical === "/";

    const graph: Record<string, unknown>[] = [];

    // 2. Organization Node
    if (doc.organization) {
      const org = doc.organization;
      if (isRoot) {
        // Full Definition
        const orgNode: Record<string, unknown> = {
          "@type": "Organization",
          "@id": orgId,
          name: org.name,
          url: toAbsolute(org.url) || siteUrl,
          description: org.description,
          sameAs: org.sameAs,
        };

        const logoUrl = toAbsolute(org.logo || '/gogam-logo.png');
        orgNode.logo = {
          "@type": "ImageObject",
          "url": logoUrl,
          "width": "512",
          "height": "512",
        };
        orgNode.image = {
          "@type": "ImageObject",
          "url": logoUrl,
          "width": "512",
          "height": "512"
        };

        if (org.founder) {
          orgNode.founder = { "@id": personId };
        }

        const subOrgs = doc.subOrganizations as SubOrganization[];
        if (subOrgs && Array.isArray(subOrgs)) {
          orgNode.subOrganization = subOrgs.map((sub: SubOrganization) => {
            // Generate a simple ID derived from name, handling umlauts
            const safeName = sub.name.toLowerCase()
              .replace(/ä/g, 'a')
              .replace(/ö/g, 'o')
              .replace(/å/g, 'a');

            const subId = `${baseUrl}/#${safeName
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-|-$/g, "")}`;
            return {
              "@type": "Organization",
              "@id": subId,
              name: sub.name,
              description: sub.description,
              url: sub.url ? toAbsolute(sub.url) : undefined,
              parentOrganization: { "@id": orgId },
            };
          });
        }
        graph.push(orgNode);
      } else {
        // Reference Only - consistency check with global identity (name only, but same ID)
        graph.push({
          "@type": "Organization",
          "@id": orgId,
          name: GOGAM_IDENTITY.name,
          url: toAbsolute(org.url) || siteUrl,
        });
      }
    }

    // 3. Person Node
    if (doc.organization?.founder || doc.author) {
      const f = doc.organization?.founder || doc.author || {};
      const personName =
        f.name ||
        (typeof doc.author === "string" ? doc.author : PETRI_IDENTITY.name);

      if (isRoot) {
        const personNode: Record<string, unknown> = {
          "@type": "Person",
          "@id": personId,
          name: personName,
          url: toAbsolute(f.url) || siteUrl,
          jobTitle: f.jobTitle,
          description: f.description,
          sameAs: PETRI_IDENTITY.sameAs, // Use canonical sameAs
        };

        if (f.knowsAbout && Array.isArray(f.knowsAbout)) {
          personNode.knowsAbout = f.knowsAbout.map((topic: string) => ({
            "@type": "Thing",
            name: topic,
          }));
        }
        graph.push(personNode);
      } else {
        // Reference but with name
        graph.push({
          "@type": "Person",
          "@id": personId,
          name: personName,
          url: siteUrl,
        });
      }
    }

    // 4. WebSite Node
    graph.push({
      "@type": "WebSite",
      "@id": webSiteId,
      url: siteUrl,
      name: "Gogam",
      publisher: { "@id": orgId },
    });

    // 4.5 BreadcrumbList Node
    if (!isRoot) {
      graph.push({
        "@type": "BreadcrumbList",
        "@id": breadcrumbId,
        itemListElement: [
          {
            "@type": "ListItem",
            "position": 1,
            "name": "Gogam",
            "item": siteUrl, // or baseUrl if siteUrl ends with /
          },
          {
            "@type": "ListItem",
            "position": 2,
            "name": title,
            "item": toAbsolute(url),
          },
        ],
      });
    }

    // 5. Products (from frontmatter list)
    // We collect product IDs to link them to the WebPage
    const productIds: { "@id": string }[] = [];

    const products = doc.products as Product[];

    if (products && Array.isArray(products)) {
      for (const prod of products) {
        // Ensure ID is absolute if provided as fragment
        const pId = prod.id.startsWith("#") ? `${baseUrl}/${prod.id}` : prod.id;

        const productNode: Record<string, unknown> = {
          "@type": "IndividualProduct", // Specific type requested
          "@id": pId,
          name: prod.name,
          description: prod.description,
          category: prod.category,
          author: { "@id": personId },
          brand: { "@id": orgId },
          url: toAbsolute(prod.url) || prod.url, // Ensure absolute local URL or external
          sameAs: prod.sameAs,
        };

        if (prod.image) {
          productNode.image = {
            "@type": "ImageObject",
            "@id": `${toAbsolute(prod.image)}#primaryimage`,
            url: toAbsolute(prod.image),
            width: "1200",
            height: "630",
          };
        }

        if (prod.offers) {
          const offersRaw = (Array.isArray(prod.offers) ? prod.offers : [prod.offers]) as Offer[];
          productNode.offers = offersRaw.map(o => ({
            "@type": "Offer",
            url: o.url,
            availability: o.availability || "https://schema.org/InStock",
            price: o.price,
            priceCurrency: o.priceCurrency || "USD",
          }));
        }

        graph.push(productNode);
        productIds.push({ "@id": pId });
      }
    }

    // 6. Game/CreativeWork (if this page IS a game page)
    const isCreativeWork = ["Game", "CreativeWork", "Book", "SoftwareApplication"].some((t) => {
      return Array.isArray(schemaType) ? schemaType.includes(t) : schemaType === t;
    });

    let mainEntityId = undefined;

    if (isCreativeWork) {
      // Pedantic Rule 1: Law of Absolute Identification
      // Must follow https://gogam.eu/#game-[slug] pattern
      // match logic with products loop
      // Allow override via slugOverride (e.g. nott -> night-of-the-thirteenth)
      const slug = doc.slugOverride || sourcePath.split("/").filter((p) => !!p).pop();
      const itemId = `${baseUrl}/#game-${slug}`;

      mainEntityId = itemId;

      // Publisher Logic: Check for SubOrganization override
      let publisherNode = {
        "@type": "Organization",
        "@id": orgId,
        name: GOGAM_IDENTITY.name,
        sameAs: GOGAM_IDENTITY.sameAs
      };

      if (doc.organization && doc.organization.name) {
        const orgName = doc.organization.name;
        if (orgName.includes("Kustannusosakeyhtiö") || orgName.includes("Entertainment")) {
          const safeName = orgName.toLowerCase()
            .replace(/ä/g, 'a')
            .replace(/ö/g, 'o')
            .replace(/å/g, 'a');
          const subId = `${baseUrl}/#${safeName.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

          publisherNode = {
            "@type": "Organization",
            "@id": subId,
            name: orgName,
            parentOrganization: { "@id": orgId }
          };
        }
      }

      const itemNode: Record<string, unknown> = {
        "@type": schemaType,
        "@id": itemId,
        name: title,
        description: description,
        url: url, // Local URL
        author: {
          "@type": "Person",
          "@id": personId,
          name: PETRI_IDENTITY.name,
          sameAs: PETRI_IDENTITY.sameAs
        },
        publisher: publisherNode,
        offers: [], // To be populated
      };

      // Populate standard fields
      if (doc.genre) itemNode.genre = doc.genre;
      if (doc.numberOfPlayers) itemNode.numberOfPlayers = doc.numberOfPlayers;
      if (doc.gameItem) itemNode.gameItem = doc.gameItem;
      if (doc.alternateName) itemNode.alternateName = doc.alternateName;
      if (doc.inLanguage) itemNode.inLanguage = doc.inLanguage;
      if (doc.license) itemNode.license = doc.license;
      if (doc.sameAs) itemNode.sameAs = doc.sameAs;

      if (image) {
        itemNode.image = {
          "@type": "ImageObject",
          "@id": `${image}#primaryimage`,
          url: image,
          width: "1200",
          height: "630",
        };
      } else {
        itemNode.image = { "@id": `${url}#primaryimage` };
        // Ideally we'd have a fallback image if none provided
      }

      if (doc.url) itemNode.url = doc.url; // Use override if present (though V3 says use local)

      if (doc.isBasedOn) {
        const based = doc.isBasedOn as CreativeWorkBase;
        itemNode.isBasedOn = {
          "@type": "CreativeWork",
          "@id": based.id || undefined,
          name: based.name,
          author: based.author
            ? {
              "@type": "Person",
              name: based.author.name || based.author,
              sameAs: based.author.sameAs,
            }
            : undefined,
        };
      }

      // Offers logic (simplified for single offer usually)
      if (doc.offers) {
        const offersRaw = (Array.isArray(doc.offers) ? doc.offers : [doc.offers]) as Offer[];
        itemNode.offers = offersRaw.map((o) => ({
          "@type": "Offer",
          name: o.name,
          url: o.url,
          price: o.price || "0.00", // V3 Enforce 0.00
          priceCurrency: o.priceCurrency || "USD",
          availability: o.availability || "https://schema.org/InStock",
        }));
      }

      if (doc.isbn) itemNode.isbn = doc.isbn;

      // SubjectOf / Mediassa Logic
      const subjectOf = [];

      // 1. Explicit subjectOf from frontmatter
      if (doc.subjectOf && Array.isArray(doc.subjectOf)) {
        subjectOf.push(...doc.subjectOf);
      }

      // 2. Mediassa parsing (simple list of links to Articles)
      // Assuming frontmatter has a list of links or simple objects for media
      // User request said: "Every link in the "Mediassa" section... map as Article"
      // We'll need to check how "Mediassa" is stored. Usually it's text in markdown.
      // But if it's structured in frontmatter (e.g. `mentions` or `media`), handle it.
      // Looking at hirviokirja.md, it matches "Mediassa" header content. 
      // Current frontmatter doesn't seem to have a structured "mediassa" list, it's MD text.
      // **Correction**: The user instruction implies we should add it to frontmatter or parse it.
      // "Every link in the "Mediassa" section... must be added as an object in a subjectOf array on the Book entity."
      // Since I can't easily parse MD text here, I will rely on the user/me adding it to frontmatter 'subjectOf'.

      // 3. Hardcoded corrections (Cars & Family Gizmodo)
      // Check if sameAs contains the gizmodo link, if so satisfy requirements.
      if (itemNode.sameAs && Array.isArray(itemNode.sameAs)) {
        const gizmodoLink = "https://gizmodo.com/cars-family-is-a-truly-delightful-rpg-about-street-1833446001";
        const idx = itemNode.sameAs.indexOf(gizmodoLink);
        if (idx > -1) {
          itemNode.sameAs.splice(idx, 1); // Remove from sameAs
          subjectOf.push({
            "@type": "Article",
            "name": "io9: 10 Tabletop Games for Fast & Furious Franchise Fans",
            "url": "https://gizmodo.com/fast-x-tabletop-rpg-ttrpg-cars-fast-and-furious-games-1850454943/11", // Using the updated URL from user prompt if different, or the one found? 
            // User prompt had two different URLS. 
            // Original in index: ...1833446001
            // Requirement: "Remove https://gizmodo.com/... from sameAs" 
            // New Requirement Target: ...1850454943/11
            // I will add the specific object requested.
            "publisher": {
              "@type": "Organization",
              "name": "Gizmodo/io9"
            }
          });
        }
      }

      if (subjectOf.length > 0) {
        itemNode.subjectOf = subjectOf;
      }

      // Explicit link to mainEntityOfPage
      itemNode.mainEntityOfPage = { "@id": webPageId };

      graph.push(itemNode);
      productIds.push({ "@id": itemId });
    }

    // 7. FAQ Logic
    let hasFaq = false;
    const faq = doc.faq as FAQItem[];
    if (faq && Array.isArray(faq) && faq.length > 0) {
      hasFaq = true;
      const faqNode = {
        "@type": "FAQPage",
        "@id": faqId,
        mainEntity: faq.map((item: FAQItem) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.a,
          },
        })),
      };
      graph.push(faqNode);
    }

    // 8. WebPage Node
    const webPageNode: Record<string, unknown> = {
      "@type": "WebPage",
      "@id": webPageId,
      url: url,
      name: `${title} - ${siteName}`,
      description: description,
      isPartOf: { "@id": webSiteId },
      // about: { "@id": personId }, // Removed per new user example request for pure graph
    };

    if (documentLocale) webPageNode.inLanguage = documentLocale;
    if (!isRoot) webPageNode.breadcrumb = { "@id": breadcrumbId };

    // Calculate mainEntity
    // If it's a hub (index), mainEntity is the list of products + FAQ
    // If it's a game page, mainEntity is the game itself

    if (isCreativeWork) {
      webPageNode.mainEntity = { "@id": `${url}#game` };
    } else {
      // Hub page logic
      const entities = [];
      if (hasFaq) entities.push({ "@id": faqId });
      entities.push(...productIds);

      if (entities.length > 0) {
        webPageNode.mainEntity = entities;
      }
    }

    graph.push(webPageNode);

    // 9. Final JSON-LD
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
