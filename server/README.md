## Backend: Content Pipeline and Server Structure (Nuxt 3 + Nitro)

### Goal
Be robust for production while staying simple for content authors. Authors only add Markdown files to `content/<locale>/...`. The backend validates, indexes, and serves pages and machine-consumable files (sitemaps, robots, llms.txt).

### TL;DR for content authors
1) Place Markdown in `content/en/`, `content/fi/`, or `content/sv/` using kebab-case filenames (e.g., `my-page.md`).
2) Include the minimal front‑matter below; add optional fields as needed.

```yaml
---
title: "Clear Page Title"
description: "1–2 sentence summary."
datePublished: 2025-10-23
dateModified: 2025-10-23
tags: ["topic"]
# Optional: slug, summary, entities, faq, citations, canonical, noindex, llmPriority
---
```

3) Images go under `public/images/...` and are referenced as `/images/...` from Markdown.
4) Preview locally with `pnpm dev` (or npm/yarn equivalent). Build will fail if required fields are missing or invalid.

---

### Server layout
```
server/
  api/                # Runtime endpoints (Nitro handlers)
    content-index.get.ts
    sitemap.xml.get.ts
    robots.txt.get.ts
    llms.txt.get.ts
  middleware/         # Server/route middleware (normalization, headers)
  plugins/            # Nitro plugins (e.g., logging, content hooks)
  utils/              # Shared server utilities (schema, seo, i18n)
```

### Content validation (robustness)
- Define a single front‑matter schema using Zod.
- Validate all Markdown during dev and CI. Fail fast with helpful error messages listing file and field.
- Keep required set minimal: `title`, `description`. Recommended: `datePublished`, `dateModified`.

Example schema (`server/utils/contentSchema.ts`):
```ts
import { z } from 'zod'

export const frontMatterSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  slug: z.string().regex(/^[a-z0-9-]+$/).optional(),
  tags: z.array(z.string()).default([]),
  datePublished: z.union([z.string(), z.date()]).optional(),
  dateModified: z.union([z.string(), z.date()]).optional(),
  summary: z.string().optional(),
  entities: z.array(z.object({ name: z.string(), type: z.string().optional() })).optional(),
  faq: z.array(z.object({ q: z.string(), a: z.string() })).optional(),
  citations: z.array(z.object({ title: z.string(), url: z.string().url() })).optional(),
  noindex: z.boolean().optional(),
  canonical: z.string().optional(),
  llmPriority: z.number().min(0).max(1).optional()
})
```

Example validation script (run in CI: `pnpm validate:content`):
```ts
// scripts/validate-content.ts
import { glob } from 'glob'
import fs from 'node:fs/promises'
import matter from 'gray-matter'
import { frontMatterSchema } from '../server/utils/contentSchema'

async function main() {
  const files = await glob('content/**/*.md')
  const errors: string[] = []
  for (const file of files) {
    const raw = await fs.readFile(file, 'utf8')
    const { data } = matter(raw)
    const result = frontMatterSchema.safeParse(data)
    if (!result.success) {
      errors.push(`${file}:\n${result.error.issues.map(i => `- ${i.path.join('.')}: ${i.message}`).join('\n')}`)
    }
  }
  if (errors.length) {
    console.error('\nFront‑matter validation failed:')
    console.error(errors.join('\n\n'))
    process.exit(1)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
```

Package script suggestion:
```json
{
  "scripts": {
    "validate:content": "tsx scripts/validate-content.ts"
  }
}
```

### Runtime endpoints
Leverage Nuxt Content for querying and Nitro for output and caching.

Content index (`server/api/content-index.get.ts`):
```ts
export default cachedEventHandler(async (event) => {
  const { locale } = getQuery(event)
  const base = typeof locale === 'string' && locale ? `/${locale}` : undefined
  let q = serverQueryContent(event)
    .where({ _partial: false })
    .only(['_path', 'title', 'description', 'datePublished', 'dateModified', 'tags', '_file'])
  if (base) q = q.where({ _path: { $regex: `^${base}(?:/|$)` } })
  const raw = await q.sort({ datePublished: -1 }).find()
  // Replace front-matter dateModified with filesystem mtime for freshness comparisons
  const contentRoot = join(process.cwd(), 'content')
  const items = await Promise.all(raw.map(async (d: any) => {
    try { const st = await fs.stat(join(contentRoot, d._file)); return { ...d, dateModified: st.mtime.toISOString() } }
    catch { return d }
  }))
  setHeader(event, 'Cache-Control', `public, max-age=${API_MAX_AGE}, stale-while-revalidate=${API_STALE}`)
  return { items }
}, { name: 'content-index', maxAge: API_MAX_AGE, staleMaxAge: API_STALE })
```
Single doc fetch (`server/api/content-doc.get.ts`):
```ts
export default defineEventHandler(async (event) => {
  const { path } = getQuery(event)
  if (!path || typeof path !== 'string') { setHeader(event, 'Cache-Control', 'no-store'); return { error: 'Missing path' } }
  const doc = await serverQueryContent(event).where({ _path: path }).findOne()
  setHeader(event, 'Cache-Control', 'no-store')
  return { doc }
})
```

Sitemap (`server/api/sitemap.xml.get.ts`):
```ts
export default defineEventHandler(async (event) => {
  const baseUrl: string = useRuntimeConfig(event).public.siteUrl
  const docs = await queryContent().only(['_path', 'dateModified']).find()
  const urls = docs.map(d => `<url><loc>${baseUrl}${d._path}</loc><lastmod>${new Date(d.dateModified || Date.now()).toISOString()}</lastmod></url>`).join('')
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`
  setHeader(event, 'Content-Type', 'application/xml')
  setHeader(event, 'Cache-Control', 'public, max-age=600, stale-while-revalidate=86400')
  return xml
})
```

Robots (`server/api/robots.txt.get.ts`):
```ts
export default defineEventHandler((event) => {
  const lines = [
    'User-agent: *',
    'Allow: /',
    '',
    'Sitemap: ' + useRuntimeConfig(event).public.siteUrl + '/sitemap.xml'
  ]
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  return lines.join('\n')
})
```

LLMs file (`server/api/llms.txt.get.ts`):
```ts
export default defineEventHandler(async (event) => {
  const baseUrl: string = useRuntimeConfig(event).public.siteUrl
  const lines = [
    `${baseUrl}/`,
    `${baseUrl}/sitemap.xml   type=sitemap`
  ]
  setHeader(event, 'Content-Type', 'text/plain; charset=utf-8')
  setHeader(event, 'Cache-Control', 'public, max-age=3600, stale-while-revalidate=86400')
  return lines.join('\n')
})
```

### Internationalization (optional)
- Place localized Markdown under `content/<locale>/...` (e.g., `content/fi/my-page.md`).
- Generate locale‑aware `hreflang` and sitemap entries.
- Ensure canonical URLs include the locale path when localized.

### Caching and headers
- Public endpoints emit `Cache-Control` with sensible `max-age` and `stale-while-revalidate`.
- Use `ETag` on JSON endpoints if needed for client caching.

### Error handling
- Validation failures are surfaced during dev/build with file paths and field messages.
- Unknown locales are skipped with warnings; pages without required fields are excluded and flagged.

### Deployment
- Runs on any Nitro target (Cloudflare, Vercel, Netlify). Configure `public.siteUrl` in `nuxt.config.ts` runtime config.
- Prefer edge deployment and enable streaming for fastest TTFB.

### Containerization and deployment best practices
- Use the provided multi-stage `Dockerfile`.
  - `runner-ssr` target: SSR server at port 3000 (Nitro). Add env like `NUXT_PUBLIC_*` at run time.
  - `runner-static` target: Nginx serving pre-rendered `/usr/share/nginx/html` at port 80.
- Set `NODE_ENV=production` in containers; keep `NUXT_PUBLIC_SITE_URL` consistent with deployment.
- Put a CDN (e.g., Cloudflare, Fastly) in front of SSR or static for caching and TLS.
- Health checks: add a lightweight `GET /api/health` returning 200.
- Logs: stream stdout/stderr; use structured logging in Nitro plugins if needed.
- Security: set minimal permissions, no root if your platform supports it; restrict outbound egress where possible.

### Rendering strategy: prebuild + freshness (ISR/SWR)
Goal: serve static HTML for maximum speed, then transparently refresh when content changes.

Approach options (can be combined):
- Pre-render content routes at build time.
- Add route-level ISR/SWR so the server refreshes pages after a TTL while serving cached HTML.
- Cache API endpoints with stale-while-revalidate to hydrate pages with fresher data after mount.

#### 1) Pre-render content pages
```ts
// nuxt.config.ts
export default defineNuxtConfig({
  nitro: {
    prerender: {
      crawlLinks: true
    }
  },
  routeRules: {
    '/': { prerender: true },
    '/en/**': { prerender: true },
    '/fi/**': { prerender: true },
    '/sv/**': { prerender: true }
  }
})
```

Build static output:
```bash
pnpm generate
# Output at .output/public for static hosting, or combine with serverless/edge functions
```

#### 2) Add incremental revalidation (ISR/SWR)
For platforms supporting Nuxt route rules with revalidation, enable time-based cache refresh:

```ts
// nuxt.config.ts (choose one depending on Nuxt/platform support)
export default defineNuxtConfig({
  routeRules: {
    '/**': { isr: Number(process.env.NUXT_ISR_TTL || 60) },
    '/api/**': { cache: { swr: Number(process.env.NUXT_API_STALE || 600), maxAge: Number(process.env.NUXT_API_MAX_AGE || 60) } }
  }
})
```

For programmatic endpoint caching, use a cached handler:
```ts
// server/api/content-index.get.ts
export default cachedEventHandler(async (event) => {
  const items = await queryContent().only(['_path','title','description','dateModified']).find()
  return { items }
}, { name: 'content-index', maxAge: 60, staleMaxAge: 600 })
```

#### 3) Client hydration for fresher data
Pages are pre-rendered; on client mount, fetch the latest lightweight index to decide whether to refresh data.

```vue
<script setup lang="ts">
const route = useRoute()
const { data: idx } = await useFetch(`/api/content-index?ts=${Date.now()}`, { server: false, headers: { 'cache-control': 'no-cache' } })
onMounted(() => {
  // If page's dateModified in idx is newer than the rendered one, re-fetch page data
  // Example: call refreshNuxtData() or fetch the specific content again
})
</script>
```

#### 4) Built/shown/modified timestamps
Client freshness logic compares:
- built: per-request SSR render time
- shown: currently displayed content timestamp (initialized to built; updates on client swap)
- modified: fs mtime from content index
If `modified > shown`, fetch `/api/content-doc?path=...` and replace.
Expose a build timestamp to compare freshness on the client.

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  runtimeConfig: {
    public: { buildAt: process.env.BUILD_AT || new Date().toISOString() }
  }
})
```

In CI:
```bash
export BUILD_AT="$(date -u +%FT%TZ)"
pnpm generate
```


