import { ensureLeadingSlash, removeTrailingSlash } from "./routing";

export const PETRI_IDENTITY = {
  "@id": "https://gogam.eu/en/petri-leinonen#petri",
  name: "Petri Leinonen",
  url: "https://gogam.eu/en/petri-leinonen",
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

export const GOGAM_IDENTITY = {
  "@id": "https://gogam.eu/#organization",
  name: "Gogam",
  sameAs: ["https://www.youtube.com/@gogameu"],
};

export interface KnowledgeGraphOptions {
  siteUrl: string;
  siteName: string;
  defaultLocale: string;
  documentLocale?: string;
  image?: string;
}

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function slugifyEntityId(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, "a")
    .replace(/ö/g, "o")
    .replace(/å/g, "a")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildKnowledgeGraph(
  doc: UnknownRecord,
  options: KnowledgeGraphOptions,
): { "@context": string; "@graph": UnknownRecord[] } {
  const siteUrl = options.siteUrl || "https://gogam.eu";
  const siteName = options.siteName || "Gogam";
  const baseUrl = siteUrl.endsWith("/") ? siteUrl.slice(0, -1) : siteUrl;

  const toAbsolute = (p: string | undefined): string | undefined => {
    if (!p) return undefined;
    if (p.startsWith("http")) return p;
    return `${baseUrl}${ensureLeadingSlash(p)}`;
  };

  const normalizeMasterId = (rawId: string): string => {
    if (rawId.startsWith("#")) return `${baseUrl}/${rawId}`;
    return rawId.replace(/^https?:\/\/gogam\.eu/, baseUrl);
  };

  const rawPath = ensureLeadingSlash(
    asString(doc.canonical) || asString(doc.path) || asString(doc._path) || "/",
  );
  const path = removeTrailingSlash(rawPath);
  const sourcePath = ensureLeadingSlash(asString(doc.path) || asString(doc._path) || path);
  const url = `${baseUrl}${path === "/" ? "/" : path}`;

  const title = asString(doc.title);
  const description = asString(doc.description);
  const image = options.image;
  const documentLocale = options.documentLocale;

  const docType = doc.contentType || (doc.datePublished ? "article" : "website");
  const typeArray: string[] = (Array.isArray(docType) ? docType : [docType]).map(String);

  const schemaType = typeArray.map((t: string) => {
    if (t === "article") return "Article";
    if (t === "website") return "WebPage";
    return t;
  });

  // 1. MASTER NODE IDENTIFIERS
  const ORG_MASTER_ID = `${baseUrl}/#organization`;
  const PERSON_MASTER_ID = `${baseUrl}/en/petri-leinonen#petri`;
  const WEBSITE_MASTER_ID = `${baseUrl}/#website`;

  const webPageId = `${url}#webpage`;
  const faqId = `${url}#faq`;
  const breadcrumbId = `${url}#breadcrumb`;

  const isIdentityHub =
    path === "/" ||
    doc.path === "/" ||
    doc._path === "/" ||
    doc.canonical === "/" ||
    path === "/en" ||
    doc.canonical === "/en";

  const isPersonIdentityHub = Boolean(
    (typeof doc.path === "string" && doc.path.includes("petri-leinonen")) ||
      (typeof doc._path === "string" && doc._path.includes("petri-leinonen")) ||
      (typeof doc.canonical === "string" && doc.canonical.includes("petri-leinonen")),
  );

  const graph: UnknownRecord[] = [];
  const orgRaw = isRecord(doc.organization) ? doc.organization : undefined;

  // 2. ORGANIZATION NODE
  if (orgRaw) {
    if (isIdentityHub) {
      const orgNode: UnknownRecord = {
        "@type": "Organization",
        "@id": ORG_MASTER_ID,
        name: orgRaw.name,
        url: toAbsolute(asString(orgRaw.url)) || siteUrl,
        description: orgRaw.description,
        sameAs: orgRaw.sameAs || GOGAM_IDENTITY.sameAs,
      };

      const logoUrl = toAbsolute(asString(orgRaw.logo) || "/gogam-logo.png");
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

      if (orgRaw.founder) {
        orgNode.founder = { "@id": PERSON_MASTER_ID };
      }

      const subOrgs = doc.subOrganizations as
        | Array<{ name: string; description?: string; url?: string }>
        | undefined;
      if (subOrgs && Array.isArray(subOrgs)) {
        orgNode.subOrganization = subOrgs.map((sub) => {
          const subId = `${baseUrl}/#${slugifyEntityId(sub.name)}`;
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
      // Strict Rule of Stubs (Section 1.4): ID, Type, and Name only on subpages
      const orgName = asString(orgRaw.name) || GOGAM_IDENTITY.name;
      let orgStubId = ORG_MASTER_ID;
      const rawOrgId = asString(orgRaw["@id"]);
      if (rawOrgId) {
        orgStubId = normalizeMasterId(rawOrgId);
      } else if (orgName.includes("Kustannusosakeyhtiö") || orgName.includes("Entertainment")) {
        orgStubId = `${baseUrl}/#${slugifyEntityId(orgName)}`;
      }
      graph.push({
        "@type": "Organization",
        "@id": orgStubId,
        name: orgName,
      });
    }
  }

  // 3. AUTHOR / PERSON NODE
  let resolvedAuthorStub: { "@id": string; name: string } = {
    "@id": PERSON_MASTER_ID,
    name: PETRI_IDENTITY.name,
  };

  if (orgRaw?.founder || doc.author) {
    const rawAuthor = doc.author || orgRaw?.founder || {};
    const authorObj: UnknownRecord = isRecord(rawAuthor) ? rawAuthor : {};
    const personName =
      (typeof rawAuthor === "string" ? rawAuthor : asString(authorObj.name)) || PETRI_IDENTITY.name;

    const rawAuthorId = asString(authorObj["@id"]);
    const isPetri = personName === PETRI_IDENTITY.name || Boolean(rawAuthorId?.includes("#petri"));

    if (isPetri) {
      resolvedAuthorStub = {
        "@id": PERSON_MASTER_ID,
        name: PETRI_IDENTITY.name,
      };
      if (isPersonIdentityHub) {
        const personNode: UnknownRecord = {
          "@type": "Person",
          "@id": PERSON_MASTER_ID,
          name: personName,
          url: toAbsolute(asString(authorObj.url)) || PETRI_IDENTITY.url || siteUrl,
          jobTitle: authorObj.jobTitle,
          description: authorObj.description,
          sameAs: authorObj.sameAs || PETRI_IDENTITY.sameAs,
        };

        if (authorObj.knowsAbout && Array.isArray(authorObj.knowsAbout)) {
          personNode.knowsAbout = authorObj.knowsAbout.map((topic: unknown) => ({
            "@type": "Thing",
            name: String(topic),
          }));
        }
        graph.push(personNode);
      } else {
        // Strict Rule of Stubs on subpages for Petri
        graph.push({
          "@type": "Person",
          "@id": PERSON_MASTER_ID,
          name: personName,
        });
      }
    } else {
      // External / Third-Party Author (e.g., Wille Ruotsalainen, Roachsphere)
      const thirdPartyId = rawAuthorId
        ? normalizeMasterId(rawAuthorId)
        : `${baseUrl}/#author-${slugifyEntityId(personName)}`;
      const thirdPartyType = asString(authorObj["@type"]) || asString(authorObj.type) || "Person";

      resolvedAuthorStub = {
        "@id": thirdPartyId,
        name: personName,
      };

      const thirdPartyNode: UnknownRecord = {
        "@type": thirdPartyType,
        "@id": thirdPartyId,
        name: personName,
      };
      const authorUrl = asString(authorObj.url);
      if (authorUrl) thirdPartyNode.url = toAbsolute(authorUrl);
      if (authorObj.sameAs) {
        thirdPartyNode.sameAs = Array.isArray(authorObj.sameAs)
          ? authorObj.sameAs
          : [authorObj.sameAs];
      }
      if (authorObj.jobTitle) thirdPartyNode.jobTitle = authorObj.jobTitle;
      graph.push(thirdPartyNode);
    }
  }

  // 4. WEBSITE NODE
  graph.push({
    "@type": "WebSite",
    "@id": WEBSITE_MASTER_ID,
    url: siteUrl,
    name: siteName,
    publisher: { "@id": ORG_MASTER_ID },
  });

  // 5. BREADCRUMBLIST NODE
  if (!isIdentityHub) {
    const itemListElement: UnknownRecord[] = [
      {
        "@type": "ListItem",
        position: 1,
        name: siteName,
        item: siteUrl,
      },
    ];

    let currentPosition = 2;

    if (doc.partOfSeries) {
      const seriesRaw = Array.isArray(doc.partOfSeries) ? doc.partOfSeries[0] : doc.partOfSeries;
      if (isRecord(seriesRaw) && "name" in seriesRaw && "url" in seriesRaw) {
        itemListElement.push({
          "@type": "ListItem",
          position: currentPosition,
          name: String(seriesRaw.name),
          item: toAbsolute(String(seriesRaw.url)),
        });
        currentPosition++;
      }
    }

    itemListElement.push({
      "@type": "ListItem",
      position: currentPosition,
      name: title,
      item: toAbsolute(url),
    });

    graph.push({
      "@type": "BreadcrumbList",
      "@id": breadcrumbId,
      itemListElement,
    });
  }

  // 6. TEASER PRODUCTS / GAMES (HOMEPAGE STUBS)
  const productIds: { "@id": string }[] = [];
  const rawGamesList =
    (orgRaw?.games as UnknownRecord[] | undefined) ||
    (doc.games as UnknownRecord[] | undefined) ||
    (doc.products as UnknownRecord[] | undefined);

  if (rawGamesList && Array.isArray(rawGamesList)) {
    for (const prod of rawGamesList) {
      if (!isRecord(prod)) continue;
      const rawId = asString(prod["@id"]) || asString(prod.id);
      const prodName = asString(prod.name);
      if (!rawId || !prodName) continue;
      const pId = normalizeMasterId(rawId);

      graph.push({
        "@type": "Game",
        "@id": pId,
        name: prodName,
      });
      productIds.push({ "@id": pId });
    }
  }

  // 7. CREATIVE WORK / PRODUCT / EPISODE MASTER NODE
  const isCreativeWork = [
    "Game",
    "CreativeWork",
    "Book",
    "TTRPG",
    "SoftwareApplication",
    "VideoObject",
    "TVEpisode",
    "CreativeWorkSeries",
  ].some((t) => typeArray.includes(t));

  if (isCreativeWork) {
    const slug =
      asString(doc.slugOverride) ||
      sourcePath
        .split("/")
        .filter((p) => Boolean(p))
        .pop();
    const itemId = `${baseUrl}/#game-${slug}`;

    const pubObj = isRecord(doc.publisher) ? doc.publisher : undefined;
    let targetPublisherName =
      (typeof doc.publisher === "string" ? doc.publisher : asString(pubObj?.name)) ||
      asString(orgRaw?.name);

    if (!targetPublisherName) {
      if (sourcePath.includes("/rajatiloja/") || doc.template === "episode") {
        targetPublisherName = "Gogam Entertainment";
      } else {
        targetPublisherName = GOGAM_IDENTITY.name;
      }
    }

    let publisherStub = { "@id": ORG_MASTER_ID };
    if (
      targetPublisherName.includes("Kustannusosakeyhtiö") ||
      targetPublisherName.includes("Entertainment")
    ) {
      const subId = `${baseUrl}/#${slugifyEntityId(targetPublisherName)}`;
      publisherStub = { "@id": subId };
    }

    const itemNode: UnknownRecord = {
      "@type": schemaType.length === 1 ? schemaType[0] : schemaType,
      "@id": itemId,
      name: title,
      description,
      url,
      author: resolvedAuthorStub,
      publisher: { ...publisherStub, name: targetPublisherName },
      offers: [],
    };

    if (doc.genre) itemNode.genre = doc.genre;
    if (doc.numberOfPlayers) itemNode.numberOfPlayers = doc.numberOfPlayers;
    if (doc.gameItem) itemNode.gameItem = doc.gameItem;
    if (doc.alternateName) itemNode.alternateName = doc.alternateName;
    if (doc.inLanguage) itemNode.inLanguage = doc.inLanguage;
    if (doc.license) itemNode.license = doc.license;
    if (doc.disambiguatingDescription) {
      itemNode.disambiguatingDescription = doc.disambiguatingDescription;
    }

    const isVideoOrEpisode = schemaType.some((t) => ["VideoObject", "TVEpisode"].includes(t));

    if (isVideoOrEpisode) {
      if (doc.duration) itemNode.duration = doc.duration;
      if (doc.datePublished) itemNode.uploadDate = doc.datePublished;
      if (doc.contentUrl) itemNode.contentUrl = toAbsolute(String(doc.contentUrl));
      if (doc.transcript) itemNode.transcript = toAbsolute(String(doc.transcript));
      if (image) itemNode.thumbnailUrl = image;
      if (doc.episodeNumber) itemNode.episodeNumber = doc.episodeNumber;
      if (doc.partOfSeries) itemNode.partOfSeries = doc.partOfSeries;

      if (
        doc.contentUrl &&
        typeof doc.contentUrl === "string" &&
        doc.contentUrl.includes("youtube.com")
      ) {
        itemNode.potentialAction = {
          "@type": "WatchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: doc.contentUrl,
            actionPlatform: [
              "http://schema.org/DesktopWebPlatform",
              "http://schema.org/MobileWebPlatform",
            ],
          },
          expectsAcceptanceOf: {
            "@type": "Offer",
            category: "free",
          },
        };
      }
    }

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

    if (doc.isBasedOn) {
      if (typeof doc.isBasedOn === "string") {
        itemNode.isBasedOn = doc.isBasedOn;
      } else if (isRecord(doc.isBasedOn)) {
        const based = doc.isBasedOn;
        const basedAuthor = isRecord(based.author) ? based.author : undefined;
        itemNode.isBasedOn = {
          "@type": asString(based["@type"]) || asString(based.type) || "CreativeWork",
          "@id": based["@id"] || based.id,
          name: based.name,
          url: based.url,
          author: based.author
            ? {
                "@type": "Person",
                name: typeof based.author === "string" ? based.author : basedAuthor?.name,
              }
            : undefined,
        };
      }
    }

    if (doc.about) {
      const aboutRaw = Array.isArray(doc.about) ? doc.about : [doc.about];
      itemNode.about = aboutRaw.filter(isRecord).map((a) => ({
        "@type": asString(a["@type"]) || asString(a.type) || "Thing",
        "@id": a["@id"] || a.id,
        name: a.name,
        sameAs: a.sameAs,
        url: a.url,
      }));
    }

    const rawMentions = doc.mentions || doc.quotes;
    if (rawMentions && Array.isArray(rawMentions)) {
      const recordMentions = rawMentions.filter(isRecord);
      const isTestimonial = recordMentions.some((m) => m.quote || m.text || m.abstract);

      if (isTestimonial) {
        itemNode.mentions = recordMentions.map((m) => {
          const mAuthor = isRecord(m.author) ? m.author : undefined;
          return {
            "@type": "CreativeWork",
            text: m.text || m.quote || m.abstract,
            author: {
              "@type": "Person",
              name: m.source || (typeof m.author === "string" ? m.author : mAuthor?.name),
              jobTitle: m.jobTitle || m.title || mAuthor?.jobTitle,
            },
            datePublished: m.date || m.datePublished,
          };
        });
      } else {
        const entities = recordMentions.map((m) => ({
          "@type": asString(m["@type"]) || asString(m.type) || "Person",
          name: m.name,
          sameAs: m.id || m.sameAs,
          "@id": m["@id"] || m.id,
        }));

        if (
          schemaType.some((t) =>
            [
              "VideoObject",
              "TVEpisode",
              "CreativeWorkSeries",
              "Movie",
              "TVSeries",
              "RadioSeries",
            ].includes(t),
          )
        ) {
          itemNode.character = entities;
        } else {
          itemNode.mentions = entities;
        }
      }
    }

    if (doc.citations && Array.isArray(doc.citations)) {
      itemNode.citation = doc.citations.map((c: unknown) => {
        if (typeof c === "string") {
          return {
            "@type": "CreativeWork",
            name: c,
          };
        }
        const cit = isRecord(c) ? c : {};
        const citAuthor = isRecord(cit.author) ? cit.author : undefined;
        return {
          "@type": asString(cit["@type"]) || asString(cit.type) || "CreativeWork",
          name: cit.name || cit.title,
          author: cit.author
            ? {
                "@type": "Person",
                name: typeof cit.author === "string" ? cit.author : citAuthor?.name,
              }
            : undefined,
          datePublished: cit.datePublished,
          isbn: cit.isbn,
          url: cit.url,
          sameAs: cit.url ? [cit.url] : undefined,
        };
      });
    }

    if (doc.offers) {
      const offersRaw = Array.isArray(doc.offers) ? doc.offers : [doc.offers];
      itemNode.offers = offersRaw.filter(isRecord).map((o) => {
        const oName = asString(o.name);
        const oUrl = asString(o.url);
        const oFormat = asString(o.bookFormat);
        return {
          "@type": "Offer",
          name: oName,
          url: oUrl,
          price: o.price || "0.00",
          priceCurrency: o.priceCurrency || "USD",
          availability: o.availability || "https://schema.org/InStock",
          itemOffered:
            oName?.includes("PDF") || oUrl?.endsWith(".pdf") || oFormat?.includes("EBook")
              ? { "@type": "Book", bookFormat: "https://schema.org/EBook" }
              : oFormat
                ? { "@type": "Book", bookFormat: oFormat }
                : undefined,
        };
      });
    }

    if (doc.isbn) itemNode.isbn = doc.isbn;
    if (doc.sameAs && Array.isArray(doc.sameAs)) {
      itemNode.sameAs = doc.sameAs;
    }

    const subjectOf: UnknownRecord[] = [];
    if (doc.subjectOf && Array.isArray(doc.subjectOf)) {
      subjectOf.push(...doc.subjectOf.filter(isRecord));
    }
    if (doc.transcript) {
      subjectOf.push({
        "@type": "ItemPage",
        name: "Transcript",
        url: toAbsolute(String(doc.transcript)),
      });
    }
    if (subjectOf.length > 0) itemNode.subjectOf = subjectOf;

    itemNode.mainEntityOfPage = { "@id": webPageId };
    graph.push(itemNode);
  }

  // 8. FAQ NODE
  let hasFaq = false;
  const faq = doc.faq as Array<{ q: string; a: string }> | undefined;
  if (faq && Array.isArray(faq) && faq.length > 0) {
    hasFaq = true;
    graph.push({
      "@type": "FAQPage",
      "@id": faqId,
      mainEntity: faq.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: {
          "@type": "Answer",
          text: item.a,
        },
      })),
    });
  }

  // 9. WEBPAGE NODE
  const webPageNode: UnknownRecord = {
    "@type": "WebPage",
    "@id": webPageId,
    url,
    name: `${title} - ${siteName}`,
    description,
    isPartOf: { "@id": WEBSITE_MASTER_ID },
    publisher: { "@id": ORG_MASTER_ID },
  };

  if (documentLocale) webPageNode.inLanguage = documentLocale;
  if (!isIdentityHub) webPageNode.breadcrumb = { "@id": breadcrumbId };

  if (isCreativeWork) {
    const slug =
      asString(doc.slugOverride) ||
      sourcePath
        .split("/")
        .filter((p) => Boolean(p))
        .pop();
    webPageNode.mainEntity = { "@id": `${baseUrl}/#game-${slug}` };
  } else {
    const entities: Array<{ "@id": string }> = [];
    if (hasFaq) entities.push({ "@id": faqId });
    entities.push(...productIds);
    if (entities.length > 0) {
      webPageNode.mainEntity = entities;
    }
  }

  graph.push(webPageNode);

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}
