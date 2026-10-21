import { z } from "zod";

const personOrOrgStubSchema = z.object({
  name: z.string(),
  "@type": z.string().optional(),
  type: z.string().optional(),
  "@id": z.string().optional(),
  id: z.string().optional(),
  url: z.string().optional(),
  sameAs: z.union([z.string(), z.array(z.string())]).optional(),
  jobTitle: z.union([z.string(), z.array(z.string())]).optional(),
  knowsAbout: z.array(z.string()).optional(),
  description: z.string().optional(),
});

const personOrOrgRefSchema = z.union([
  z.string(),
  personOrOrgStubSchema,
  z.array(personOrOrgStubSchema),
]);

const creativeWorkRefSchema = z.object({
  "@type": z.string().optional(),
  type: z.string().optional(),
  name: z.string(),
  url: z.string().optional(),
  "@id": z.string().optional(),
  id: z.string().optional(),
  sameAs: z.union([z.string(), z.array(z.string())]).optional(),
  author: personOrOrgRefSchema.optional(),
  publisher: personOrOrgRefSchema.optional(),
  datePublished: z.union([z.string(), z.date()]).optional(),
  isbn: z.string().optional(),
});

const gameStubSchema = z.object({
  name: z.string(),
  "@type": z.string().optional(),
  type: z.string().optional(),
  "@id": z.string().optional(),
  id: z.string().optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  url: z.string().optional(),
  image: z.string().optional(),
});

export const frontMatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  slugOverride: z.string().optional(),
  tags: z.array(z.string()).default([]),
  datePublished: z.union([z.string(), z.date()]).optional(),
  dateModified: z.union([z.string(), z.date()]).optional(),
  summary: z.string().optional(),
  contentType: z.union([z.string(), z.array(z.string())]).optional(),
  author: personOrOrgRefSchema.optional(),
  publisher: personOrOrgRefSchema.optional(),
  illustrator: personOrOrgRefSchema.optional(),

  // AEO / Semantic Precision
  genre: z.string().optional(),
  gameInterfaceType: z.literal("Tabletop").optional(),
  disambiguatingDescription: z.string().optional(),
  alternateName: z.string().optional(),
  license: z.string().optional(),
  isbn: z.string().optional(),

  // Rule: inLanguage must be array of strings check
  inLanguage: z.array(z.string()).optional(),

  // Rule: QuantitativeValue for numbers
  numberOfPlayers: z
    .object({
      "@type": z.literal("QuantitativeValue").optional(),
      minValue: z.union([z.string(), z.number()]),
      maxValue: z.union([z.string(), z.number()]),
    })
    .optional(),

  // Pedagogical Payload
  gameItem: z.array(z.string()).optional(),

  // Rule: isBasedOn must be a CreativeWork object, string, or array (Pedagogical Hub)
  isBasedOn: z
    .union([
      z.string(),
      creativeWorkRefSchema,
      z.array(z.union([z.string(), creativeWorkRefSchema])),
    ])
    .optional(),

  // Episode & Series Metadata
  duration: z.string().optional(),
  contentUrl: z.string().optional(),
  transcript: z.string().optional(),
  episodeNumber: z.number().optional(),
  partOfSeries: z
    .union([
      z.string(),
      creativeWorkRefSchema,
      z.array(z.union([z.string(), creativeWorkRefSchema])),
    ])
    .optional(),
  actor: z.array(personOrOrgStubSchema).optional(),
  character: z.array(personOrOrgStubSchema).optional(),
  hasPart: z.array(creativeWorkRefSchema).optional(),
  subjectOf: z.array(creativeWorkRefSchema).optional(),
  sameAs: z.array(z.string()).optional(),

  // Entities & Graph
  entities: z.array(personOrOrgStubSchema).optional(),

  // Rule: Subject Matter (Distinct from Mentions)
  about: z
    .array(
      z.object({
        "@type": z.string().optional(),
        type: z.string().optional(),
        name: z.string(),
        sameAs: z.union([z.string(), z.array(z.string())]).optional(),
        "@id": z.string().optional(),
        id: z.string().optional(),
        url: z.string().optional(),
      }),
    )
    .optional(),

  // Rule: Testimonials (CreativeWork with abstract/text) OR Entity/Character Mentions
  mentions: z
    .array(
      z.object({
        "@type": z.string().optional(),
        type: z.string().optional(),
        name: z.string().optional(),
        "@id": z.string().optional(),
        id: z.string().optional(),
        url: z.string().optional(),
        sameAs: z.union([z.string(), z.array(z.string())]).optional(),
        jobTitle: z.string().optional(),
        abstract: z.string().optional(),
        text: z.string().optional(),
        quote: z.string().optional(),
        source: z.string().optional(),
        title: z.string().optional(),
        date: z.union([z.string(), z.date()]).optional(),
        datePublished: z.union([z.string(), z.date()]).optional(),
        author: personOrOrgRefSchema.optional(),
        publisher: personOrOrgRefSchema.optional(),
      }),
    )
    .optional(),

  // Commercial
  offers: z
    .array(
      z.object({
        name: z.string().optional(),
        price: z.string().optional(),
        priceCurrency: z.string().optional(),
        url: z.string().url(),
        availability: z.string().optional(),
        bookFormat: z.string().optional(),
        inLanguage: z.string().optional(),
      }),
    )
    .optional(),

  faq: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
  citations: z
    .array(
      z.union([
        z.string(),
        z.object({
          title: z.string().optional(),
          name: z.string().optional(),
          type: z.string().optional(),
          "@type": z.string().optional(),
          author: personOrOrgRefSchema.optional(),
          datePublished: z.union([z.string(), z.date()]).optional(),
          isbn: z.string().optional(),
          url: z.string().optional(),
        }),
      ]),
    )
    .optional(),
  noindex: z.boolean().optional(),
  canonical: z.string().optional(),
  llmPriority: z.number().min(0).max(1).optional(),
  llms_context: z.string().optional(),
  lastValidated: z.union([z.string(), z.date()]).optional(),
  facts: z.array(z.object({ label: z.string(), value: z.string() })).optional(),

  stats: z
    .array(
      z.object({
        metric: z.string(),
        value: z.string(),
        date: z.union([z.string(), z.date()]).optional(),
        source: z.string().optional(),
      }),
    )
    .optional(),

  // Deprecated/Transitional
  quotes: z
    .array(
      z.object({
        source: z.string().optional(),
        text: z.string().optional(),
        date: z.union([z.string(), z.date()]).optional(),
      }),
    )
    .optional(),

  // UI / Theme
  template: z.string().optional(),
  theme: z.string().optional(),
  pageTheme: z.string().optional(),
  cover: z.string().optional(),
  image: z.string().optional(),
  heroImage: z.string().optional(),
  year: z.string().optional(),
  productTheme: z.record(z.string()).optional(),
  productNav: z.array(z.object({ href: z.string(), text: z.string() })).optional(),
  aliases: z.array(z.string()).optional(),
  alternateLocales: z
    .array(z.union([z.string(), z.object({ code: z.string(), path: z.string().optional() })]))
    .optional(),

  // Organization (SSOT on Index, Stubs elsewhere)
  organization: z
    .object({
      name: z.string(),
      "@type": z.string().optional(),
      type: z.string().optional(),
      url: z.string().url().optional(),
      logo: z.string().optional(),
      sameAs: z.array(z.string()).optional(),
      "@id": z.string().optional(),
      founder: personOrOrgStubSchema.optional(),
      description: z.string().optional(),
      games: z.array(gameStubSchema).optional(),
    })
    .optional(),

  subOrganizations: z
    .array(
      z.object({
        name: z.string(),
        "@type": z.string().optional(),
        "@id": z.string().optional(),
        description: z.string().optional(),
        url: z.string().url().optional(),
        sameAs: z.array(z.string()).optional(),
      }),
    )
    .optional(),

  // AEO Game/Product Stubs
  games: z.array(gameStubSchema).optional(),
  products: z.array(gameStubSchema).optional(),

  structuredData: z.array(z.record(z.unknown())).optional(),
});

export type FrontMatter = z.infer<typeof frontMatterSchema>;
