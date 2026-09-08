---
trigger: always_on
dateModified: 2026-09-08
---
# AI Agent Guide: TSS (Generative‑Engine‑Optimized Vue Starter)

This document provides high-level context, architectural decisions, and coding conventions for AI agents working on this codebase.

## Project Overview
**TSS** is a production-ready **Nuxt 3 SSR** starter designed for **Answer Engine Optimization (AEO)**.
- **Core Goal**: Structured, source-of-truth content allowing LLMs (Answer Engines) to extract factual answers with high confidence.
- **Data Source**: Markdown files in `content/` with strict front-matter adherence to rules in `.agent/rules/schema.md`.
- **Rendering**: SSR by default with aggressive caching (ISR/SWR) for edge performance.

## Tech Stack
- **Framework**: Nuxt 3 (SSR enabled) + TypeScript (Strict)
- **Content**: `@nuxt/content` v3 (`content.config.ts`, Markdown AST, MDC components)
- **Validation**: `Zod` (Schema enforcement via `server/utils/contentSchema.ts`).
- **Styling**: Vanilla CSS variables + Custom Token System (`assets/styles/tokens.css`). **No Tailwind.**
- **Linting/Formatting**: Biome (`biomejs`)
- **Testing**: Vitest (Unit), @vitest/ui (Visual), @vitest/coverage-v8 (Coverage) (Playwright E2E planned).
- **Scripts**: `npm run <script>` (defined in `package.json`).
- **Infrastructure**: Netlify (Nitro Preset).

## Architectural Patterns

### 1. Progressive Enhancement (Base vs Enhanced)
- **Concept**: Ship a functional, fast, SEO-friendly "Base" component first. Layer interactions/animations in a `.client.vue` component.
- **Example**: 
  - `Navigation.vue`: Semantic HTML, standard links, zero JS. Instant load.
  - `NavigationEnhanced.client.vue`: Adds floating behaviors, scroll-spying, and smooth scrolling. Loaded only on client.
- **Rule**: If a component needs complex JS or "dazzle", split it. Keep the base standard and lightweight.

### 2. Atomic Design (`components/`)
Components are strictly categorized to manage complexity.
- **Atoms** (`components/atoms/`): Pure presentation. No app-specific logic.
- **Molecules** (`components/molecules/`): Composition of atoms. Handles glue logic.
- **Prose** (`components/prose/`): Tightly coupled to Markdown tags.
  - **Rules**: Must consume semantic tokens from `tokens.css`.
  - **Customization**: heavily customized to support rich layouts within Markdown.

### 3. Content-Driven Architecture (`content/`)
- **Schema Source of Truth**: `.agent/rules/schema.md` defines the rules, `server/utils/contentSchema.ts` enforces them code-wise.
- **Front-matter**: The "Fact Layer" for AEO.
  - **AEO Critical**:
    - `summary`: Abstract optimized for LLM consumption.
    - `entities`: Structured data links. Use `type: "CreativeWork"` for main subjects.
    - `about` vs `mentions`: Distinguish between the subject (conceptual) and references (cited works).
  - **Strict Rules**:
    - **Do NOT** duplicate biographical data. Use Stub References (ID + Name).
    - **Do NOT** put offers on the homepage.

### 4. AEO & Server Architecture (`server/`)
- **Routes (`server/routes/`)**:
  - `llms.txt` / `llms-full.txt`: The "Shadow Homepage" for agents. Logic defined in `.agent/rules/llmstxt.md`.
  - `robots.txt`, `sitemap.xml`: SEO fundamentals.
- **Utils (`server/utils/`)**: Shared backend logic, specifically `contentSchema.ts`.

## Key Directories
- `components/`: UI components (Atoms/Molecules/Prose).
- `content/`: Markdown source of truth.
- `server/routes/`: Root-level AEO endpoints.
- `server/utils/`: Shared server logic and schemas.
- `scripts/`: Maintenance & Build hooks (`generate-image-meta`, `build-content-index`, `validate-content`, `update-modified-date`).
- `.agent/rules/`: Definitive documentation for Schema and LLM text generation.
- `.agent/skills/`: Workspace-specific procedural skills.

## Coding Conventions
- **TypeScript**: Strict mode. No `any`. Explicit returns.
- **Styles**: Use CSS variables from `tokens.css`. Themes reassign these variables.
- **Testing**: Unit test Atoms. Integration test Molecules.

## Common Workflows (npm run)
- **Start Dev**: `npm run dev` (runs on port 3000).
- **Validate Content**: `npm run validate:content`.
- **Lint/Format**: `npm run biome:check` / `npm run biome:format`.
- **Unit Tests**: `npm run test` (or `npm run test:run`).
- **Typecheck**: `npm run typecheck`.
- **Build / Generate**: `npm run build` / `npm run generate`.
- **Update Modified Date**: `npm run update-date`.

## User Rules to Remember
- **Aesthetics**: "Sleek and unobtrusive."
- **SEO/AEO**: "Automatically implement SEO best practices."
- **Workspaces**: Only edit files in `c:\Users\alvan\gogameu`.
