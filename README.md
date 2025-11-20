## TSS: Generative‑Engine‑Optimized Vue SSR Starter (Nuxt 3 + Markdown)

### Overview
This project is a minimal, production‑ready starter for a server‑side rendered Vue site focused on Generative Engine Optimization (GEO) — making content maximally understandable and discoverable by large language model (LLM) crawlers — with content stored as Markdown files. It uses Nuxt 3 (SSR by default) and the Nuxt Content module to source Markdown with rich front‑matter, enabling fast authoring with strong SEO and LLM‑friendly structure out of the box!

### Primary goals
- **SSR by default**: Fast first byte, crawlable HTML, stable rendering for search engines.
- **Markdown content**: Simple authoring stored in version control; scalable to headless CMS later.
- **Generative Engine Optimization**: Clear information architecture, entities, citations, FAQs, and explicit crawler guidance.
- **International SEO** (optional): `hreflang`, canonical URLs, structured data, sitemaps, robots rules, clean slugs.
- **Performance**: Edge‑friendly rendering, cache headers, image optimization, and prefetching.
- **Privacy‑aware**: Explicit consent for GEO/analytics; sensible defaults for compliance.

### Why Nuxt 3
- **SSR/Hybrid rendering** with server routes and easy edge deployment support.
- **@nuxt/content** provides Markdown parsing, search, and code highlighting.
- **First‑class DX**: TypeScript, auto imports, layouts, modules, runtime config.
- **SEO primitives**: `@nuxtjs/seo`, `nuxt-simple-robots`, `nuxt-simple-sitemap` (planned).

### High‑level architecture
- **Web app**: Nuxt 3 SSR (TypeScript), Tailwind CSS (optional), and Nuxt modules.
- **Content**: Markdown files in `content/` with front‑matter controlling SEO and LLM signals (entities, FAQs, citations).
- **Localization** (optional): `@nuxtjs/i18n` for language routing and `hreflang` emission.
- **Delivery**: Deploy on an edge‑capable platform (Cloudflare, Vercel, Netlify). Use cache tags/keys that vary on locale/region.
- **Images**: `@nuxt/image` with a CDN loader; responsive sizes and modern formats.

### Planned tech stack
- Nuxt 3 (SSR) with TypeScript
- @nuxt/content for Markdown
- @nuxtjs/i18n for localization
- nuxt-simple-robots and nuxt-simple-sitemap for SEO
- @nuxt/image (or nuxt-img) for image optimization
- Tailwind CSS (optional but recommended)
- Vitest + Playwright + Lighthouse CI for quality

### Installation (Docker‑first)
Quickstart:
```bash
git clone <this-repo-url> tss && cd tss

# Create .env (adjust values as needed)
cat > .env << 'EOF'
NUXT_PUBLIC_SITE_URL=http://localhost:3000
NUXT_PUBLIC_DEFAULT_LOCALE=en
NUXT_PUBLIC_SUPPORTED_LOCALES=en,fi,sv
# Dev server ports (override if needed)
APP_PORT=3000
HMR_PORT=24678
# Optional: hostname the browser should use for content WS (defaults to localhost)
CONTENT_WS_HOSTNAME=localhost
EOF

# Start dev (bind mount + HMR)
make dev
```

Common tasks:
```bash
make stop         # stop dev
make logs         # follow logs
make sh           # shell inside container
make build-ssr    # build SSR image
make run-ssr      # run SSR container on :3000
make build-static # build static image (Nginx)
make run-static   # run static container on :8080
make generate     # export static to ./dist
make test         # run unit tests in container (Vitest UI: pnpm dlx vitest --ui)
make test-run     # run unit tests once in container
make lint         # run linter in container
make typecheck    # run TS typecheck in container
make validate-content # validate markdown front-matter in container
make biome-check  # run Biome lint checks
make biome-format # format code with Biome
```

### Content model (Markdown)
All content lives under `content/`. Each Markdown file includes rich front‑matter to drive SEO and LLM comprehension (entities, summaries, FAQs, citations).

Recommended front‑matter schema (extend as needed):

```yaml
---
title: "Clear Page Title"
description: "1–2 sentence summary that answers the page’s core question."
slug: "my-page"                 # optional; falls back to filename
locale: "en"                    # BCP‑47 (e.g., en, fi, sv)
tags: ["topic", "feature"]
datePublished: 2025-10-22
dateModified: 2025-10-22
author: "Team TSS"
image: "/images/og/my-page.png" # OG/Twitter card
noindex: false
canonical: "/en/my-page"        # absolute URL set at build/deploy
priority: 0.7                    # sitemap hint
alternateLocales: ["fi", "sv"]  # for cross‑links/hreflang (if localized)
summary: |
  A short, factual abstract of the page. Keep it objective and citation‑friendly.
entities:
  - name: "Nuxt 3"
    type: "SoftwareApplication"
  - name: "Generative Engine Optimization"
    type: "Thing"
faq:
  - q: "What is Generative Engine Optimization?"
    a: "GEO is the practice of structuring content so LLMs can parse and cite it."
citations:                                    # authoritative sources referenced on the page
  - title: "Nuxt 3 Docs"
    url: "https://nuxt.com/docs"
structuredData:                               # JSON‑LD additions (merged with defaults)
  - "@type": "WebPage"
    name: "My Page"
llmPriority: 0.8                              # optional signal for inclusion in llms.txt
---

# Heading

Your Markdown content starts here.
```

### Routing and localization
- **URL strategy**: Prefix routes with locale (`/en/...`, `/fi/...`). `/` resolves to `NUXT_PUBLIC_DEFAULT_LOCALE`.
- **Rendering**: `pages/index.vue` renders `/`; `pages/[...slug].vue` renders any Markdown doc at its `_path`.
- **Hreflang**: Add `alternateLocales` in front‑matter to emit `hreflang` for each variant; `x-default` points to the default locale.
- **Canonical**: Defaults to the document `_path` under `siteUrl`; override via `canonical` in front‑matter.

### Head/meta from content
Per‑page `<head>` is generated from Markdown front‑matter via `useContentHead(doc)`:
- `title`, `description`
- `image` (used for Open Graph/Twitter cards)
- `canonical` (fallback: `_path` + `siteUrl`)
- `noindex` (adds `robots: noindex, nofollow`)
- `alternateLocales` (emits `hreflang` + `x-default`)
- `structuredData` (merged with base WebPage/Article JSON‑LD)

Usage in pages:
```ts
import { useContentHead } from "~/composables/useContentHead";
// after computing `data` (the current content doc):
useContentHead(data);
```

### Generative Engine Optimization (LLM‑facing)
- **Information architecture**: One primary question per page; clear H1; concise lead; scannable sections (H2/H3); bullets for lists; definitions and glossary pages for entities.
- **Signals for LLMs**: Front‑matter `summary`, `entities`, `faq`, and `citations` for authority. Keep tone factual and neutral; avoid fluff.
- **Structured data**: JSON‑LD for WebSite/WebPage, BreadcrumbList, Article, FAQPage where relevant. Use canonical, last modified, author.
- **Citations**: Link to authoritative external sources; prefer stable, reputable domains.
- **Versioning/freshness**: Maintain `dateModified`; surface change logs for key pages.
- **Duplication control**: Canonicalize near‑duplicate pages; consolidate thin content.
- **Sitemaps**: Generate language‑aware sitemaps; include priority pages surfaced in `llms.txt`.

### Crawler guidance files
- **robots.txt** (standard; at `/robots.txt`): Allow reputable AI crawlers while keeping control. Example allowing popular LLM crawlers and pointing to sitemap:

```txt
User-agent: *
Allow: /

# Popular AI/LLM crawlers
User-agent: GPTBot
Allow: /
User-agent: CCBot
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Anthropic-RespectfulCrawler
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: Google-Extended
Allow: /

Sitemap: https://example.com/sitemap.xml
```

- **llms.txt** (community convention; at `/llms.txt`): Plain text listing high‑value, canonical resources for LLM ingestion. Include absolute URLs to topic hubs, FAQs, glossaries, policies, and sitemaps.

```txt
# Canonical sources for LLMs
# Priority: 1.0 is highest; omit if unknown

https://example.com/
https://example.com/faq           priority=1.0
https://example.com/glossary      priority=0.9
https://example.com/resources/guides/generative-engine-optimization
https://example.com/sitemap.xml   type=sitemap
```

- **.well-known/ai.txt** (optional, alternative convention): Can mirror `llms.txt` to maximize discoverability.

### SEO checklist (MVP)
- Title and meta description from front‑matter
- Open Graph and Twitter cards
- JSON‑LD WebSite/WebPage + BreadcrumbList where appropriate
- `hreflang` for all locales + `x-default`
- Canonical URLs
- XML sitemap per locale (plus combined) and `robots.txt`
- Clean slugs; avoid parameterized duplicate content
- Error pages: localized 404 with noindex

### Performance and delivery
- Edge SSR for low TTFB; streaming enabled
- HTTP caching with `Cache-Control` and `ETag`
- Preload critical resources (fonts, hero images); preconnect to CDN origins
- Image optimization with responsive `srcset`, AVIF/WebP, and placeholders
- Minimal JS on content pages; progressive enhancement for interactive widgets

### Image API (`/api/image`)
- `src`: absolute path under `public/` (e.g., `/gogam-facebook-etc.png`) or a fully-qualified `https://` URL. Local paths are read directly from disk (no internal HTTP fetch), guarding against traversal.
- `size`: one of `150, 320, 480, 768, 1024, 1200, 1280, 1536`. The `1200` preset renders a 1200×630 canvas for OG/Twitter.
- `format` (optional): defaults to `webp`, but the 1200 preset falls back to `png` when unspecified so that `og:image` is always a PNG. You can force `format=png|webp|jpeg`.
- Responses are cached under `public/gen_images` with filenames like `<name>-<size>.<format>` and returned with the correct `Content-Type`.
- Components requesting responsive content images should keep using the default WebP derivatives; Open Graph metadata now requests PNG variants via `format=png`.
- If a local file is missing inside the serverless bundle (e.g., Netlify function runtime), the handler automatically retries by fetching the same path from `siteUrl`/request host so OG images continue to work in production.

### Security and compliance
- Content Security Policy (CSP) with nonces/hashes
- Cookie categories (strictly necessary vs analytics/marketing)
- Consent banner and storage of preferences
- Do not geofence without disclosure; provide manual override

### Project structure (planned)
```
.
├─ app/                      # Nuxt app entry/customization
├─ components/               # UI components (atoms/molecules; Nuxt auto-imports)
│  ├─ atoms/                 # Base* presentational components
│  ├─ molecules/             # Compositions of atoms, light glue logic
│  └─ README.md              # Component conventions and examples
├─ composables/              # Shared composables (locale, geo, seo)
├─ content/                  # Markdown content (localized)
│  ├─ en/
│  ├─ fi/
│  └─ sv/
├─ layouts/                  # App/page layouts
├─ middleware/               # Server and route middleware (geo detection)
├─ pages/                    # Conventional routes
├─ public/                   # Static assets (robots.txt, llms.txt, .well-known/ai.txt, icons)
├─ server/                   # API routes, server utils, nitro plugins
│  └─ README.md              # Backend content pipeline and endpoints
├─ assets/                   # Styles, fonts, images (processed)
├─ scripts/                  # One‑off maintenance scripts
├─ test/                     # Unit/e2e/lighthouse tests
└─ nuxt.config.ts            # Nuxt configuration
```

### UI component architecture (atoms/molecules)
- **Goal**: Keep components small, predictable, and reusable. Prefer composition. Fetching and global state live outside components; molecules orchestrate atoms with minimal glue logic.
- **Autoload**: Nuxt 3 auto‑imports components from `components/` (including subfolders). `components/atoms/BaseButton.vue` is available as `<BaseButton />` without manual registration.

#### Directory layout
```
components/
  atoms/        # Base* presentational primitives
  molecules/    # Compositions of atoms with simple behavior
  README.md     # Conventions and examples
```

#### Naming
- **Atoms**: prefix with `Base` (e.g., `BaseButton.vue`, `BaseInput.vue`, `BaseIcon.vue`). No app‑specific behavior.
- **Molecules**: descriptive names (e.g., `FormField.vue`, `SearchInput.vue`, `AvatarWithText.vue`). May coordinate validation, ids, ARIA.

#### Conventions
- **Props/Emits**
  - Atoms: narrowly scoped props; emit DOM‑like events (`click`, `update:modelValue`).
  - Molecules: define clear API; pass through essential props to inner atoms when helpful.
- **Styling**
  - Atoms: use design tokens/utility classes; avoid app‑specific CSS.
  - Molecules: light layout only; do not hardcode content.
- **Accessibility**
  - Atoms render semantic elements (`button`, `input`, `label`).
  - Molecules wire `for`/`id`, `aria-describedby`, error/help associations.
- **Testing**
  - Atoms: unit tests for props/emits/states.
  - Molecules: integration behavior (labels, errors, interactions).

#### Example atom: `components/atoms/BaseButton.vue`
```vue
<script setup lang="ts">
import { computed } from 'vue'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const props = withDefaults(defineProps<{ variant?: Variant; size?: Size; disabled?: boolean; type?: 'button' | 'submit' | 'reset' }>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  type: 'button'
})

const emit = defineEmits<{ (e: 'click', event: MouseEvent): void }>()

const classes = computed(() => [
  'inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
  props.size === 'sm' ? 'h-8 px-3 text-sm' : props.size === 'lg' ? 'h-11 px-6 text-base' : 'h-9 px-4 text-sm',
  props.variant === 'primary' && !props.disabled ? 'bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-600' : '',
  props.variant === 'secondary' && !props.disabled ? 'bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-400' : '',
  props.variant === 'ghost' ? 'bg-transparent text-gray-900 hover:bg-gray-100 focus:ring-gray-400' : '',
  props.variant === 'danger' && !props.disabled ? 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-600' : '',
  props.disabled ? 'opacity-50 cursor-not-allowed' : ''
].filter(Boolean).join(' '))
</script>

<template>
  <button :type="type" :class="classes" :disabled="disabled" @click="(e) => emit('click', e)">
    <slot />
  </button>
  </template>
```

#### Example molecule: `components/molecules/FormField.vue`
```vue
<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ id: string; label: string; helpText?: string; error?: string; required?: boolean }>(), {
  helpText: undefined,
  error: undefined,
  required: false
})

const describedBy = computed(() => {
  const ids: string[] = []
  if (props.helpText) ids.push(`${props.id}-help`)
  if (props.error) ids.push(`${props.id}-error`)
  return ids.join(' ') || undefined
})
</script>

<template>
  <div class="w-full">
    <label :for="id" class="mb-1 block text-sm font-medium text-gray-700">
      {{ label }}<span v-if="required" aria-hidden="true" class="text-red-600"> *</span>
    </label>

    <slot name="control" :id="id" :ariaDescribedBy="describedBy" />

    <p v-if="helpText" :id="`${id}-help`" class="mt-1 text-xs text-gray-500">
      {{ helpText }}
    </p>
    <p v-if="error" :id="`${id}-error`" class="mt-1 text-xs text-red-600">
      {{ error }}
    </p>
  </div>
  </template>
```

#### Usage example
```vue
<FormField id="email" label="Email" :error="errors.email">
  <template #control="{ id, ariaDescribedBy }">
    <BaseInput v-model="form.email" :id="id" type="email" :aria-describedby="ariaDescribedBy" />
  </template>
  </FormField>
```

#### Scaffolding (when starting the UI layer)
```bash
mkdir -p components/atoms components/molecules
```

Create the example components above, then consume them directly in pages or other molecules. Nuxt will auto‑register them.

#### Migration checklist
- Move presentational components into `components/atoms/` and rename to `Base*`.
- Extract repeated label+input+error patterns into `components/molecules/FormField.vue`.
- Keep data fetching, global state, and routing outside components; pass data via props.
- Add tests: atoms (props/emits), molecules (behavior and wiring).

### Environment and runtime config
- `NUXT_PUBLIC_SITE_URL`: Absolute base URL (used for canonical/sitemaps)
- `NUXT_PUBLIC_DEFAULT_LOCALE`: e.g., `en`
- `NUXT_PUBLIC_SUPPORTED_LOCALES`: e.g., `en,fi,sv`
- `NUXT_PUBLIC_DEFAULT_REGION`: e.g., `FI`
- `NUXT_GEO_HEADER_COUNTRY`: Provider header name (e.g., `cf-ipcountry`)
- `NUXT_ANALYTICS_*`: Analytics keys guarded by consent

### Development workflow (to be wired in init)
- Install deps: `pnpm i` (or npm/yarn)
- Dev server: `pnpm dev`
- Typecheck and lint: `pnpm typecheck && pnpm lint`
- Unit tests: `pnpm test`
- E2E tests: `pnpm e2e`
- LHR (CI): `pnpm lhr`

### Docker (development)
Ports exposed:
- App: `http://localhost:${APP_PORT}` (default 3000)
- Vite HMR: `${HMR_PORT}` (default 24678)
  

Environment defaults set in compose: `NUXT_HOST=0.0.0.0`, `NUXT_PORT=3000`, polling enabled for file watching inside containers.

### Deployment targets
- Cloudflare Pages/Workers (edge SSR)
- Vercel (edge SSR)
- Netlify Edge (edge SSR)

### Rendering strategy (overview)
- Pre-render/ISR pages for fast TTFB; server revalidates after TTL (1 min dev, 6 h prod; configurable).
- Cache API endpoints with `stale-while-revalidate`; the client compares and replaces content if newer exists.
- Client freshness logic compares three timestamps:
  - built: SSR render time for the page (per-request SSR timestamp)
  - shown: what the user is currently seeing (initially built, updates on client swaps)
  - modified: actual file save time (fs mtime) via content index API
- If `modified > shown`, the client fetches the latest doc and remounts the renderer.
- See `server/README.md` for concrete `routeRules`, `/api/content-index`, and `/api/content-doc` details.

### Revalidation TTLs (env-driven)
Set these in `.env` (examples for dev):
```
NUXT_ISR_TTL=60
NUXT_API_MAX_AGE=60
NUXT_API_STALE=600
```
Suggested production:
```
NUXT_ISR_TTL=21600
NUXT_API_MAX_AGE=300
NUXT_API_STALE=21600
```

### WebSocket (dev)
- Nuxt Content WS is disabled in dev to avoid port/host issues.
- A custom WS is provided at `/api/ws` (and `/ws`) on the app port for future live features.
- If a tool attempts `ws://localhost:4000/ws`, the client rewrites to `ws://{host}/api/ws`.

### Docker (production)
Use Makefile helpers or raw Docker commands:
```bash
make build-ssr && make run-ssr
make build-static && make run-static
```

Best practice: use SSR for dynamic features or ISR; use static when fully pre-rendered and CDN-cached.

### Roadmap (initial)
1) Initialize Nuxt 3 project with Content module
2) Define content structure and front‑matter schema in `content/` (LLM signals: summary/entities/faq/citations)
3) Implement GEO (Generative) helpers: JSON‑LD, canonical rules, content templates
4) Add crawler guidance: `robots.txt`, `llms.txt`, optional `/.well-known/ai.txt`
5) Implement SEO: meta, `hreflang` (if localized), sitemaps, robots
6) Configure image optimization and CDN caching headers
7) Add analytics with consent management
8) Set up unit/e2e tests and Lighthouse CI

### Migration path
- Replace Markdown with a headless CMS later by swapping `@nuxt/content` sources or adding a sync step.
- Retain front‑matter schema as a content model reference.

### License
MIT (to be confirmed)
