import type { FrontMatter } from "./contentSchema";

type JsonLdNode = Record<string, any>;

export function generateGeoGraph(doc: FrontMatter, url: string): JsonLdNode[] {
  const nodes: JsonLdNode[] = [];

  // 1. Primary CreativeWork (The Game/Product itself)
  const productNode: JsonLdNode = {
    "@context": "https://schema.org",
    "@type": ["CreativeWork", "Product"],
    "@id": `${url}#product`,
    url: url,
    name: doc.title,
    description: doc.description,
    image: doc.cover ? new URL(doc.cover, url).href : undefined,
    datePublished: doc.datePublished,
    dateModified: doc.dateModified,
    inLanguage: doc.alternateLocales ? ["en", ...doc.alternateLocales] : "en",
  };

  // Add Facts as additionalProperty
  if (doc.facts && doc.facts.length > 0) {
    productNode.additionalProperty = doc.facts.map((fact) => ({
      "@type": "PropertyValue",
      name: fact.label,
      value: fact.value,
    }));
  }

  // Add Entities (sameAs links)
  if (doc.entities && doc.entities.length > 0) {
    productNode.sameAs = doc.entities
      .flatMap((e) => e.sameAs)
      .filter((url): url is string => !!url);
  }

  nodes.push(productNode);

  // 2. Stats (as Dataset or Observation - represented here as specific PropertyValues on the product for simplicity,
  // or distinct entities if they were more complex. sticking to simple addition to product for now)
  // Actually, let's treat Stats as a separate "Dataset" if they are significant, or just more properties.
  // For TTRPG stats (page count, word count), PropertyValue is best.
  if (doc.stats && doc.stats.length > 0) {
    const statProperties = doc.stats.map((stat) => ({
      "@type": "PropertyValue",
      name: stat.metric,
      value: stat.value,
      dateObserved: stat.date,
      description: stat.source ? `Source: ${stat.source}` : undefined,
    }));

    // Merge into additionalProperty
    productNode.additionalProperty = [...(productNode.additionalProperty || []), ...statProperties];
  }

  // 3. Quotes (Reviews/ endorsements)
  if (doc.quotes && doc.quotes.length > 0) {
    const reviewNodes = doc.quotes.map((quote) => ({
      "@type": "Review",
      reviewRating: {
        "@type": "Rating",
        ratingValue: "5", // Implicit positive sentiment
        bestRating: "5",
      },
      author: {
        "@type": "Person",
        name: quote.source,
      },
      reviewBody: quote.text,
      datePublished: quote.date,
    }));

    productNode.review = reviewNodes;
  }

  return nodes;
}
