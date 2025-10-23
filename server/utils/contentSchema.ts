import { z } from "zod";

export const frontMatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  tags: z.array(z.string()).default([]),
  datePublished: z.union([z.string(), z.date()]).optional(),
  dateModified: z.union([z.string(), z.date()]).optional(),
  summary: z.string().optional(),
  entities: z.array(z.object({ name: z.string(), type: z.string().optional() })).optional(),
  faq: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
  citations: z.array(z.object({ title: z.string(), url: z.string().url() })).optional(),
  noindex: z.boolean().optional(),
  canonical: z.string().optional(),
  llmPriority: z.number().min(0).max(1).optional(),
});

export type FrontMatter = z.infer<typeof frontMatterSchema>;
