---
trigger: always_on
dateModified: 2026-01-04
---

---
dateModified: 2026-01-04
---
# AI Agent Guide: TSS (Generative‑Engine‑Optimized Vue Starter)

This document provides high-level context, architectural decisions, and coding conventions for AI agents working on this codebase.

## Project Overview
**TSS** is a production-ready **Nuxt 3 SSR** starter designed for **Answer Engine Optimization (AEO)**.
- **Core Goal**: Structured, source-of-truth content allowing LLMs (Answer Engines) to extract factual answers with high confidence.
- **Data Source**: Markdown files in `content/` with strict front-matter adherence to `SCHEMA.md`.
- **Rendering**: SSR by default with aggressive caching (ISR/SWR) for edge performance.

## Tech Stack
- **Framework**: Nuxt 3 (SSR enabled) + TypeScript (Strict)
- **Content**: `@nuxt/content` v2 (Markdown → JSON AST)
- **Styling**: Tailwind CSS (optional but recommended) or Vanilla CSS variables for theming.
- **Linting/Formatting**: Biome (`biomejs`)
- **Testing**: Vitest (Unit), @vitest/ui (Visual), @vitest/coverage-v8 (Coverage) (Playwright E2E planned).
- **Quality Control**: Biome (Lint/Format), `tsc` (Typecheck), `validate-content.ts` (Content Schema).
- **Infrastructure**: Docker-first (Dev & Prod), `Makefile` for one-command workflows.

## Architectural Patterns

### 1. Progressive Enhancement (Base vs Enhanced)
- **Concept**: Ship a functional, fast, SEO-friendly "Base" component first. Layer interactions/animations in a `.client.vue` component.
- **Example**: 
  - `Navigation.vue`: Semantic HTML, standard links, zero JS. Instant load.
  - `NavigationEnhanced.client.vue`: Adds floating behaviors, scroll-spying, and smooth scrolling. Loaded only on client.
- **Rule**: If a component needs complex JS or "dazzle", split it. Keep the base standard and lightweight.

### 2. Atomic Design (`components/`)
Components are strictly categorized to manage complexity.
- **Atoms** (`components/atoms/`):
  - **Naming**: `Base[Name].vue` (e.g., `BaseButton.vue`, `BaseInput.vue`).
  - **Rules**: Pure presentation. No app-specific logic. Props in, events out.
- **Molecules** (`components/molecules/`):
  - **Naming**: Descriptive (e.g., `FormField.vue`, `SearchBox.vue`).
  - **Rules**: Composition of atoms. Can handle "glue" logic (IDs, ARIA, simple state).
- **Prose** (`components/prose/`):
  - **Naming**: `Prose[Tag].vue` (e.g., `ProseH1.vue`, `ProseImg.vue`) or `Prose[Name].vue` for custom components (e.g., `ProseAlert.vue`).
  - **Rules**: Mapped to Markdown tags via Nuxt Content. Handles typography and layout for content.
  - **Registration**:
    - **Standard Tags**: Auto-mapped (e.g., `h1` -> `ProseH1`).
    - **Custom Components**: Must be manually registered in the `proseComponents` map within `pages/[...slug].vue` to avoid hydration mismatches and ensure proper rendering.
    - **Usage**: Use MDC syntax in Markdown: `::prose-alert{type="note"}`.
  - **Styling**: Must consume semantic tokens from `tokens.css` for theming support (e.g., `var(--color-note)`).

### 3. Content-Driven Architecture (`content/`)
The file system mirrors the URL structure.
- **Front-matter**: The "Fact Layer" for AEO (Answer Engine Optimization).
  - **AEO Critical**:
    - `summary`: A multi-line abstract optimized for LLM consumption.
    - `entities`: Structured data links. **Note**: Always use `type: "CreativeWork"` for the main subject unless a specific reason exists to deviate, to ensure broad AEO compatibility.
  - **Strict Schema Rules**: Refer to `SCHEMA.md` for the definitive rules on Source-Truth Hierarchy (Master/Stub nodes) and allowed fields.
    - **Do NOT** duplicate biographical data on subpages. Use Stub References.
    - **Do NOT** put offers on the homepage. Use Stub References.
- **Localization**: Subdirectories `en/`, `fi/`, etc. `nuxt.config.ts` handles route generation.

### 4. Caching & Freshness (`nuxt.config.ts` & `server/`)
- **Route Rules**:
  - Pages (`/`, `/en/**`): **ISR** (Incremental Static Regeneration). TTL defined by `NUXT_ISR_TTL` (default 60s dev, 6h prod).
  - APIs (`/api/**`): **SWR** (Stale-While-Revalidate).
- **Client Hydration**: Custom logic checks `modified` timestamp vs. built time to fetch fresh content if the static page is stale.

## Key Directories
- `components/`: UI components (Atoms/Molecules/Prose).
- `composables/`: Shared logic (auto-imported).
- `content/`: Markdown source of truth.
- `server/api/`: Backend endpoints (sitemaps, custom content indices).
- `assets/styles/`: Global CSS tokens (`tokens.css`, `prose.css`).
- `scripts/`: Maintenance scripts (validation, generation).

## Coding Conventions

### TypeScript & Vue
- Use `<script setup lang="ts">`.
- Use `type` or `interface` for Props definition.
- **Explicit Returns**: Prefer explicit return types for complex composables/functions.
- **No `any`**: TypeScript strict mode is on.

### Styles
- **Tokens**: Use semantic CSS variables defined in `tokens.css`. 
  - **Implementation**: Themes (`classic`, `modern`) redefine these *exact* variable names within their scope. Components should simply consume `var(--token-name)` and allow the context to determine the value.
  - **Colors**: `--color-bg`, `--color-fg`, `--color-muted`, `--color-accent`, `--color-border`.
  - **Typography**: `--font-sans`, `--font-size`, `--h[1-6]-font-size`.
  - **Radii**: `--radius-sm`, `--radius-md`, `--radius-lg`.
- **Theming**:
  - **Source**: Controlled by front-matter (`theme: "classic"`) or template logic in `pages/[...slug].vue`.
  - **Mechanism**: The `data-page-theme` attribute on `<html>` sets the CSS scope.
  - **Themes**:
    - `classic` (Default): Serif fonts, traditional layout.
    - `modern`: Sans-serif, cleaner lines.
    - `product`: Special layout for product pages, supports `productTheme` front-matter for custom branding/images.
  - **Dark Mode**: Handled strictly via `@media (prefers-color-scheme: dark)` *inside* the theme definition.
- **Scoped**: Use `<style scoped>` or utility classes (Tailwind) if added.

### Testing
- **Unit (Vitest)**: Test Atoms for correct prop rendering and event emission.
- **Integration**: Test Molecules for correct wiring of Atoms.

## Common Workflows (Docker/Make)
- **Start Dev**: `make dev` (runs on port 3000).
- **Lint/Format**: `make biome-check` / `make biome-format`.
- **Unit Tests**: `make test` (watch mode) or `make test-run` (single run).
- **Typecheck**: `make typecheck`.
- **Validate Content**: `make validate-content` (checks content against schema).
- **Generate Static Site**: `make generate` (SSG build).

## User Rules to Remember
- **Aesthetics**: "Sleek and unobtrusive." Prioritize fast load times and clean, functional design over "wow" effects or complex animations.
- **SEO**: "Automatically implement SEO best practices." (Check `useContentHead` usage).
- **Workspaces**: Only edit files in `c:\Users\alvan\gogameu`.
