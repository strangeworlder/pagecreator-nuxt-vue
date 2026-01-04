import { z } from "zod";

export const frontMatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  tags: z.array(z.string()).default([]),
  datePublished: z.union([z.string(), z.date()]).optional(),
  dateModified: z.union([z.string(), z.date()]).optional(),
  summary: z.string().optional(),

  // AEO / Semantic Precision
  genre: z.string().optional(),
  gameInterfaceType: z.literal("Tabletop").optional(),

  // Rule: inLanguage must be array of strings check
  inLanguage: z.array(z.string()).optional(),

  // Rule: QuantitativeValue for numbers
  numberOfPlayers: z.object({
    "@type": z.literal("QuantitativeValue").optional(),
    minValue: z.union([z.string(), z.number()]),
    maxValue: z.union([z.string(), z.number()]),
  }).optional(),

  // Pedagogical Payload
  gameItem: z.array(z.string()).optional(),

  // Rule: isBasedOn must be a CreativeWork object (Pedagogical Hub)
  isBasedOn: z.object({
    "@type": z.literal("CreativeWork").optional(),
    name: z.string(),
    url: z.string().url(),
  }).optional(),

  // Entities & Graph
  // Rule: Strict Stubs (ID, Type, Name only) for mentioned entities
  entities: z.array(z.object({
    name: z.string(),
    "@type": z.string().optional(),
    "@id": z.string().optional(),
    sameAs: z.array(z.string()).optional(),
  })).optional(),

  // Rule: Testimonials must be Mentions, NO Reviews
  mentions: z.array(z.object({
    "@type": z.literal("CreativeWork").optional(),
    abstract: z.string().optional(), // The quote
    text: z.string().optional(),     // Fallback
    datePublished: z.union([z.string(), z.date()]).optional(),
    author: z.object({
      "@type": z.literal("Person").optional(),
      name: z.string(),
      jobTitle: z.string().optional(),
      url: z.string().optional(),
    }),
  })).optional(),

  // Commercial
  offers: z.array(z.object({
    name: z.string().optional(),
    price: z.string().optional(),
    priceCurrency: z.string().optional(),
    url: z.string().url(),
    availability: z.string().optional(),
    bookFormat: z.string().optional(),
    inLanguage: z.string().optional(),
  })).optional(),

  faq: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
  citations: z.array(z.object({ title: z.string(), url: z.string().url() })).optional(),
  noindex: z.boolean().optional(),
  canonical: z.string().optional(),
  llmPriority: z.number().min(0).max(1).optional(),
  lastValidated: z.union([z.string(), z.date()]).optional(),
  facts: z.array(z.object({ label: z.string(), value: z.string() })).optional(),

  stats: z.array(z.object({
    metric: z.string(),
    value: z.string(),
    date: z.union([z.string(), z.date()]).optional(),
    source: z.string().optional(),
  })).optional(),

  // Deprecated/Transitional
  // Rule: Abolition of the Review Type
  quotes: z.never().optional().or(z.array(z.any()).optional()), // Soft deprecation: allow but warn/ignore? SCHEMA says "Forbidden". Let's leave optional for now to avoid breaking existing without cleanup, but strict would use .never()

  // UI / Theme
  template: z.string().optional(),
  theme: z.string().optional(),
  cover: z.string().optional(),
  heroImage: z.string().optional(),
  productTheme: z.any().optional(),
  productNav: z.any().optional(),
  aliases: z.array(z.string()).optional(),
  alternateLocales: z.array(z.string()).optional(),

  // Organization (SSOT on Index)
  organization: z.object({
    name: z.string(),
    url: z.string().url().optional(),
    logo: z.string().optional(),
    sameAs: z.array(z.string()).optional(),
    "@id": z.string().optional(),
    founder: z.object({
      name: z.string(),
      jobTitle: z.union([z.string(), z.array(z.string())]).optional(),
      url: z.string().optional(),
      sameAs: z.array(z.string()).optional(),
      knowsAbout: z.array(z.string()).optional(),
      description: z.string().optional(),
      "@id": z.string().optional(),
    }).optional(),
    description: z.string().optional(),
  }).optional(),

  subOrganizations: z.array(z.object({
    name: z.string(),
    description: z.string().optional(),
    url: z.string().url().optional(),
  })).optional(),
  structuredData: z.array(z.any()).optional(),
});

export type FrontMatter = z.infer<typeof frontMatterSchema>;
