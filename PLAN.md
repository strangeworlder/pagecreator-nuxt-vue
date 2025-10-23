## MVP Implementation Plan (Docker‑first)

### Scope of MVP
- **Prebuilt content site**: Nuxt 3 + @nuxt/content, pre-rendered for fast TTFB
- **Freshness**: ISR/SWR route rules and cached API endpoints
- **Docker-first workflows**: dev, build, run, test via Docker/Makefile
- **UI system**: atoms/molecules for consistent, reusable components
- **Robust content pipeline**: front‑matter validation, sitemaps, robots, llms.txt

### Prerequisites
- `.env` created with at least:
  - `NUXT_PUBLIC_SITE_URL=http://localhost:3000`
  - `NUXT_PUBLIC_DEFAULT_LOCALE=en`
  - `NUXT_PUBLIC_SUPPORTED_LOCALES=en,fi,sv`
- Docker and Make available

### Milestones and Steps

1) Repository bootstrap and configuration
- Initialize Nuxt 3 with TypeScript and @nuxt/content
- Configure `nuxt.config.ts`:
  - `nitro.prerender.crawlLinks = true`
  - `routeRules` for prerender and ISR/SWR
  - `runtimeConfig.public.siteUrl` and optional `public.buildAt`
- Verify dev startup
  - `make dev` → open `http://localhost:3000`

2) Content pipeline and validation
- Create `server/utils/contentSchema.ts` (Zod schema per backend README)
- Add `scripts/validate-content.ts` and `pnpm validate:content`
- Seed content
  - `content/en/index.md` (and optionally `content/fi/index.md`)
- Machine-facing endpoints
  - `server/api/robots.txt.get.ts`
  - `server/api/llms.txt.get.ts`
  - `server/api/sitemap.xml.get.ts`

3) UI foundation (atoms/molecules)
- Atoms: `components/atoms/BaseButton.vue`, `BaseInput.vue`, `BaseLabel.vue`, `BaseHeader`, `BaseParagraph`
- Molecules: `components/molecules/FormField.vue`
- Sample page demonstrating atoms/molecules usage

4) Backend endpoints and caching
- `server/api/content-index.get.ts` with `cachedEventHandler` and cache headers
- Add `/api/health` returning 200 for health checks
- Confirm sitemap/robots/llms output and caching

5) Rendering strategy: prebuild + ISR/SWR
- Route rules with ISR: `/`, `/en/**`, `/fi/**`, `/sv/**` using `NUXT_ISR_TTL` (60s dev, 6h prod)
- SWR for APIs using `NUXT_API_MAX_AGE` and `NUXT_API_STALE`
- Client hydration for freshness compares built/shown vs modified (fs mtime) and swaps content via `/api/content-doc`

6) Docker-first workflows
- Dev: `make dev` (bind mount + HMR); stop/logs/shell targets
- Build SSR: `make build-ssr`; run SSR: `make run-ssr`
- Build static: `make build-static`; run static: `make run-static`
- Export static to `./dist`: `make generate`
- CI target for validation: run `pnpm validate:content` in container

7) QA and minimal tests
- Add Vitest and base config
- Unit tests for atoms (props/emits/states)
- Endpoint test for `content-index` response shape
- Include lint + typecheck in CI (containerized)

8) Deployment (choose one for MVP)
- Static: `make build-static` and deploy behind CDN; cache aggressively
- SSR: `make build-ssr` with platform supporting edge/ISR; set `NUXT_PUBLIC_SITE_URL`
- Ensure TLS, caching, and health checks via platform/CDN

### Deliverables / Acceptance Criteria
- Content author can add a valid `.md` under `content/en/...`; build passes; invalid front‑matter fails with clear errors
- Pre-rendered pages included in `sitemap.xml`; `robots.txt` points to the sitemap; `llms.txt` lists base and sitemap
- `/api/content-index` returns items with cache headers; `/api/health` returns 200
- Dev works in Docker with HMR; production containers run via `make run-ssr` or `make run-static`
- UI uses `Base*` atoms and at least one molecule on a sample page

### Out of Scope (MVP)
- Advanced analytics and consent UIs
- Full i18n content beyond seeded examples
- Complex design system beyond a minimal atoms/molecules set
- Headless CMS integration (can replace Markdown later)

### References
- Root README: project overview, Docker commands
- `server/README.md`: backend/content pipeline, endpoints, ISR/SWR details
- `components/README.md`: atoms/molecules conventions and examples


