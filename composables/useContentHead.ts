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
  availability?: string;
  name?: string;
  inLanguage?: string;
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

interface Citation {
  type?: string;
  name: string;
  author?: string | { name: string };
  datePublished?: string;
  isbn?: string;
  url?: string;
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

    // Generate social media optimized image URL (1200x630)
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
    const finalImageType =
      socialImage?.type || (image?.includes("/api/image") ? "image/png" : undefined);
    const noindex: boolean | undefined = doc.noindex === true;

    const docType = doc.contentType || (doc.datePublished ? "article" : "website");
    const typeArray = Array.isArray(docType) ? docType : [docType];

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
          val &&
          "code" in val &&
          typeof (val as any).code === "string"
        ) {
          const code = ((val as any).code as string).trim();
          if (isLikelyLocale(code)) {
            alternates.push({ code, path: (val as any).path });
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
      const explicitDefault = alternates.find(
        (a) => formatHreflang(a.code) === defaultCode
      );

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

    // --- SOURCE-TRUTH HIERARCHY SCHEMA GENERATION ---

    const baseUrl = siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;

    // 1. MASTER NODE DEFINITIONS
    const ORG_MASTER_ID = `${baseUrl}/#organization`;
    const PERSON_MASTER_ID = `${baseUrl}/#petri`;
    const WEBSITE_MASTER_ID = `${baseUrl}/#website`;

    // Page-Specific IDs
    const webPageId = `${url}#webpage`;
    const faqId = `${url}#faq`;
    const breadcrumbId = `${url}#breadcrumb`;

    // Identity Hub Condition: The Home Page (/) is the Master for Org and Person
    const isIdentityHub = doc._path === "/" || doc.canonical === "/";
    const graph: Record<string, unknown>[] = [];

    // 2. ORGANIZATION NODE
    if (doc.organization) {
      if (isIdentityHub) {
        // [MASTER NODE] - Full Metadata
        const orgNode: Record<string, unknown> = {
          "@type": "Organization",
          "@id": ORG_MASTER_ID,
          name: doc.organization.name,
          url: toAbsolute(doc.organization.url) || siteUrl,
          description: doc.organization.description,
          sameAs: doc.organization.sameAs || GOGAM_IDENTITY.sameAs,
        };

        const logoUrl = toAbsolute(doc.organization.logo || "/gogam-logo.png");
        orgNode.logo = {
          "@type": "ImageObject",
          url: logoUrl,
          width: "512",
          height: "512",
        };
        orgNode.image = {
          "@type": "ImageObject",
          url: logoUrl,
          width: "512",
          height: "512",
        };

        if (doc.organization.founder) {
          orgNode.founder = { "@id": PERSON_MASTER_ID };
        }

        // Sub-Organizations (defined fully only here)
        const subOrgs = doc.subOrganizations as SubOrganization[];
        if (subOrgs && Array.isArray(subOrgs)) {
          orgNode.subOrganization = subOrgs.map((sub: SubOrganization) => {
            const safeName = sub.name
              .toLowerCase()
              .replace(/ä/g, "a")
              .replace(/ö/g, "o")
              .replace(/å/g, "a");
            const subId = `${baseUrl}/#${safeName.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;

            return {
              "@type": "Organization",
              "@id": subId,
              name: sub.name,
              description: sub.description,
              url: sub.url ? toAbsolute(sub.url) : undefined,
              parentOrganization: { "@id": ORG_MASTER_ID },
            };
          });
        }
        graph.push(orgNode);
      } else {
        // [STUB NODE] - ID and Name Only
        graph.push({
          "@type": "Organization",
          "@id": ORG_MASTER_ID,
          name: GOGAM_IDENTITY.name,
        });
      }
    }

    // 3. PERSON NODE
    if (doc.organization?.founder || doc.author) {
      const f = doc.organization?.founder || doc.author || {};
      const personName =
        f.name || (typeof doc.author === "string" ? doc.author : PETRI_IDENTITY.name);

      if (isIdentityHub) {
        // [MASTER NODE] - Full Metadata
        const personNode: Record<string, unknown> = {
          "@type": "Person",
          "@id": PERSON_MASTER_ID,
          name: personName,
          url: toAbsolute(f.url) || siteUrl,
          jobTitle: f.jobTitle,
          description: f.description,
          sameAs: PETRI_IDENTITY.sameAs,
        };

        if (f.knowsAbout && Array.isArray(f.knowsAbout)) {
          personNode.knowsAbout = f.knowsAbout.map((topic: string) => ({
            "@type": "Thing",
            name: topic,
          }));
        }
        graph.push(personNode);
      } else {
        // [STUB NODE] - ID and Name Only
        graph.push({
          "@type": "Person",
          "@id": PERSON_MASTER_ID,
          name: personName,
        });
      }
    }

    // 4. WEBSITE NODE
    graph.push({
      "@type": "WebSite",
      "@id": WEBSITE_MASTER_ID,
      url: siteUrl,
      name: "Gogam",
      publisher: { "@id": ORG_MASTER_ID },
    });

    // 5. BREADCRUMBLIST NODE
    if (!isIdentityHub) {
      graph.push({
        "@type": "BreadcrumbList",
        "@id": breadcrumbId,
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "Gogam",
            item: siteUrl,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: title,
            item: toAbsolute(url),
          },
        ],
      });
    }

    // 6. TEASER PRODUCTS (HOME PAGE LIST)
    // The "Teaser Rule": Provide only @id and name. No offers.
    const productIds: { "@id": string }[] = [];
    const products = doc.products as Product[];

    if (products && Array.isArray(products)) {
      for (const prod of products) {
        // ID Generation Logic (Pedantic enforcement of absolute absolute)
        // If frontmatter has "#game-slug", prepend base. Matches logic in Game block.
        const pId = prod.id.startsWith("#") ? `${baseUrl}/${prod.id}` : prod.id;

        const productStub: Record<string, unknown> = {
          "@type": "Product", // Generalized to Product for list
          "@id": pId,
          name: prod.name,
          // STRICT RULE: No offers, no description, no image. ID and Name only.
        };

        graph.push(productStub);
        productIds.push({ "@id": pId });
      }
    }

    // 7. GAME / CREATIVEWORK MASTER NODE (SUBPAGE)
    const isCreativeWork = [
      "Game",
      "CreativeWork",
      "Book",
      "TTRPG",
      "SoftwareApplication",
      "VideoObject",
      "CreativeWorkSeries",
    ].some((t) => {
      // Check both string and array formats
      return Array.isArray(typeArray) ? typeArray.includes(t) : typeArray === t;
    });

    if (isCreativeWork) {
      // Determine Master ID for this specific Game
      const slug =
        doc.slugOverride ||
        sourcePath
          .split("/")
          .filter((p) => !!p)
          .pop();
      const itemId = `${baseUrl}/#game-${slug}`;

      // Publisher Logic: Check for SubOrganization override (Stub Reference)
      let targetPublisherName = doc.organization?.name;

      if (!targetPublisherName) {
        // Auto-detect Gogam Entertainment for Actual Plays
        if (sourcePath.includes("/rajatiloja/") || doc.template === "episode") {
          targetPublisherName = "Gogam Entertainment";
        } else {
          targetPublisherName = GOGAM_IDENTITY.name;
        }
      }

      let publisherStub = { "@id": ORG_MASTER_ID }; // Default to Org Master

      if (
        targetPublisherName.includes("Kustannusosakeyhtiö") ||
        targetPublisherName.includes("Entertainment")
      ) {
        const safeName = targetPublisherName
          .toLowerCase()
          .replace(/ä/g, "a")
          .replace(/ö/g, "o")
          .replace(/å/g, "a");
        const subId = `${baseUrl}/#${safeName.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
        publisherStub = { "@id": subId };
      }

      const itemNode: Record<string, unknown> = {
        "@type": schemaType.length === 1 ? schemaType[0] : schemaType,
        "@id": itemId,
        name: title,
        description: description,
        url: url, // Local absolute URL
        author: { "@id": PERSON_MASTER_ID, name: PETRI_IDENTITY.name }, // Stub
        publisher: { ...publisherStub, name: targetPublisherName }, // Stub with name
        // Offers go HERE (Master Node)
        offers: [],
      };

      // Populate standard fields
      if (doc.genre) itemNode.genre = doc.genre;
      if (doc.numberOfPlayers) itemNode.numberOfPlayers = doc.numberOfPlayers;
      if (doc.gameItem) itemNode.gameItem = doc.gameItem;
      if (doc.alternateName) itemNode.alternateName = doc.alternateName;
      if (doc.inLanguage) itemNode.inLanguage = doc.inLanguage;
      if (doc.license) itemNode.license = doc.license;

      // VideoObject Specifics
      if ((Array.isArray(schemaType) ? schemaType : [schemaType]).includes("VideoObject")) {
        if (doc.duration) itemNode.duration = doc.duration;
        if (doc.datePublished) itemNode.uploadDate = doc.datePublished;
        if (doc.contentUrl) itemNode.contentUrl = toAbsolute(doc.contentUrl);
        // Transcript moved to subjectOf to avoid schema type mismatch (URL vs Text)
        if (image) itemNode.thumbnailUrl = image;
      }

      // Image Reference
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
      }

      // Lineage (isBasedOn) - Can be stub or full?
      // "Every entity ... has exactly one Master Node."
      // isBasedOn usually refers to EXTERNAL entities or other games.
      // If external, full Stub (Name + ID/URL).
      if (doc.isBasedOn) {
        const based = doc.isBasedOn as CreativeWorkBase;
        // If it has an ID, use it as @id.
        itemNode.isBasedOn = {
          "@type": "CreativeWork",
          "@id": based.id || undefined,
          name: based.name,
          url: based.url,
          author: based.author
            ? {
              "@type": "Person",
              name: based.author.name || based.author, // Simple name for external authors
            }
            : undefined,
        };
      }

      // Mentions (Testimonials or Characters)
      const rawMentions = doc.mentions || doc.quotes;
      if (rawMentions && Array.isArray(rawMentions)) {
        // Simple heuristic: if it has 'quote' or 'text', it's a testimonial
        const isTestimonial = rawMentions.some((m: any) => m.quote || m.text);

        if (isTestimonial) {
          itemNode.mentions = rawMentions.map((m: any) => ({
            "@type": "CreativeWork",
            text: m.text || m.quote,
            author: {
              "@type": "Person",
              name: m.source || m.author?.name || m.author,
              jobTitle: m.jobTitle || m.title,
            },
            datePublished: m.date,
          }));
        } else {
          // It's likely a list of Characters or Entities
          const entities = rawMentions.map((m: any) => ({
            "@type": m.type || "Person",
            name: m.name,
            sameAs: m.id || m.sameAs,
            "@id": m.id, // Optional: if provided, use it
          }));

          // Pedantic Rule: Use 'character' for VideoObject/Series
          if (
            (Array.isArray(schemaType) ? schemaType : [schemaType]).some((t) =>
              ["VideoObject", "CreativeWorkSeries", "Movie", "TVSeries", "RadioSeries"].includes(t as string)
            )
          ) {
            itemNode.character = entities;
          } else {
            itemNode.mentions = entities;
          }
        }
      }

      // Citation Graph
      if (doc.citations && Array.isArray(doc.citations)) {
        itemNode.citation = doc.citations.map((c: string | Citation) => {
          if (typeof c === "string") {
            return {
              "@type": "CreativeWork",
              name: c,
            };
          }
          return {
            "@type": c.type || "CreativeWork",
            name: c.name,
            author: c.author
              ? {
                "@type": "Person",
                name: typeof c.author === "string" ? c.author : c.author.name,
              }
              : undefined,
            datePublished: c.datePublished,
            isbn: c.isbn,
            url: c.url,
            // Schema.org/citation allows linking to the work itself
            sameAs: c.url ? [c.url] : undefined,
          };
        });
      }

      // Offers - LIVES HERE
      if (doc.offers) {
        const offersRaw = (Array.isArray(doc.offers) ? doc.offers : [doc.offers]) as Offer[];
        itemNode.offers = offersRaw.map((o) => ({
          "@type": "Offer",
          name: o.name,
          url: o.url,
          price: o.price || "0.00",
          priceCurrency: o.priceCurrency || "USD",
          availability: o.availability || "https://schema.org/InStock",
          itemOffered:
            o.name?.includes("PDF") || o.url?.endsWith(".pdf") || o.bookFormat?.includes("EBook")
              ? { "@type": "Book", bookFormat: "https://schema.org/EBook" }
              : o.bookFormat
                ? { "@type": "Book", bookFormat: o.bookFormat }
                : undefined,
        }));
      }

      if (doc.isbn) itemNode.isbn = doc.isbn;

      // Media / SubjectOf
      const subjectOf = [];
      if (doc.subjectOf && Array.isArray(doc.subjectOf)) {
        subjectOf.push(...doc.subjectOf);
      }

      // Hardcoded fix for Cars & Family / Gizmodo
      if (
        (itemNode.sameAs as string[])?.includes(
          "https://gizmodo.com/cars-family-is-a-truly-delightful-rpg-about-street-1833446001",
        )
      ) {
        // Note: we can't access sameAs yet from itemNode as it's not set.
        // But we can check doc.sameAs
      }
      // Actually, better to just check doc.sameAs directly
      if (doc.sameAs && Array.isArray(doc.sameAs)) {
        // Filter out the article link if present in sameAs, move to subjectOf
        const gizmodoLink =
          "https://gizmodo.com/cars-family-is-a-truly-delightful-rpg-about-street-1833446001";
        const cleanSameAs = doc.sameAs.filter((l: string) => l !== gizmodoLink);

        if (doc.sameAs.includes(gizmodoLink)) {
          subjectOf.push({
            "@type": "Article",
            name: "io9: 10 Tabletop Games for Fast & Furious Franchise Fans",
            url: "https://gizmodo.com/fast-x-tabletop-rpg-ttrpg-cars-fast-and-furious-games-1850454943/11",
            publisher: { "@type": "Organization", name: "Gizmodo/io9" },
          });
        }
        itemNode.sameAs = cleanSameAs;
      } else {
        if (doc.sameAs) itemNode.sameAs = doc.sameAs;
      }

      if (doc.transcript) {
        subjectOf.push({
          "@type": "ItemPage",
          name: "Transcript",
          url: toAbsolute(doc.transcript),
        });
      }

      if (subjectOf.length > 0) itemNode.subjectOf = subjectOf;

      itemNode.mainEntityOfPage = { "@id": webPageId };

      graph.push(itemNode);
      // Main entity for the WebPage is this item
      // We can also let the WebPage logic grab it.
    }

    // 8. FAQ NODE
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

    // 9. WEBPAGE NODE - The Connector
    const webPageNode: Record<string, unknown> = {
      "@type": "WebPage",
      "@id": webPageId,
      url: url,
      name: `${title} - ${siteName}`,
      description: description,
      isPartOf: { "@id": WEBSITE_MASTER_ID },
      publisher: { "@id": ORG_MASTER_ID }, // Stub to Master Org
    };

    if (documentLocale) webPageNode.inLanguage = documentLocale;
    if (!isIdentityHub) webPageNode.breadcrumb = { "@id": breadcrumbId };

    // Set mainEntity
    if (isCreativeWork) {
      // Must point to the Master Game ID
      const slug =
        doc.slugOverride ||
        sourcePath
          .split("/")
          .filter((p) => !!p)
          .pop();
      webPageNode.mainEntity = { "@id": `${baseUrl}/#game-${slug}` };
    } else {
      // Hub Page Main Entity
      const entities = [];
      if (hasFaq) entities.push({ "@id": faqId });
      // Logic: If hub page, maybe the products are the main entity?
      // Use productIds collected earlier
      entities.push(...productIds);

      if (entities.length > 0) {
        webPageNode.mainEntity = entities;
      }
    }

    graph.push(webPageNode);

    // 10. OUTPUT
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
