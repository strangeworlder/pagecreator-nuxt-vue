import type { FrontMatter } from "./contentSchema";

type JsonLdNode = Record<string, unknown>;

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
    const statProperties = doc.stats.map((stat) => {
      let desc = stat.source ? `Source: ${stat.source}` : "";
      if (stat.date) {
        desc = desc ? `${desc} (Observed: ${stat.date})` : `Observed: ${stat.date}`;
      }

      const node: Record<string, unknown> = {
        "@type": "PropertyValue",
        name: stat.metric,
        value: stat.value,
      };
      if (desc) node.description = desc;

      return node;
    });

    // Merge into additionalProperty
    const existing = (productNode.additionalProperty as Record<string, unknown>[]) || [];
    productNode.additionalProperty = [...existing, ...statProperties];
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

  // 4. Game Stubs (AEO Source of Truth)
  if (doc.games && doc.games.length > 0) {
    const gameNodes = doc.games.map((game) => ({
      "@type": "Game",
      name: game.name,
      "@id": game["@id"],
    }));
    nodes.push(...gameNodes);

    // Link from Organization (Gogam) -> owns/knows these games? 
    // Or just exists in graph? The user prompted for "nested CreativeWork or Game entity within the graph".
    // If we want them nested under the main node, we'd add them to `hasPart` or `exampleOfWork`?
    // But usually flat graph is better with `@id` references.
    // Let's link them to the main product node if it represents the Brand/Organization page.
    // The main node is type ["CreativeWork", "Product"].
    // If this is the index page, it's virtually the "Organization" page too.
    // Let's add them as `hasOfferCatalog` or `owns`? Or simply `mentions`?
    // The prompt said "knowsAbout: In the Person node...". 
    // For games: "each game listed... should be a nested CreativeWork or Game entity".
    // Let's add them to the graph (which we did with push) AND references them.
    // Ideally, we'd add `hasPart` to the main node?
    // Let's stick to adding them to the `nodes` array for now, effectively defining them in the graph.
    // If the main node is the page/product, maybe `mentions` or `about`?
    // Actually, "nested" might mean physically nested in the JSON structure, OR just linked. 
    // Flattened with @id is best practice.
  }

  return nodes;
}
