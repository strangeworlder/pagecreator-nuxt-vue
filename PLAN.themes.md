## Theming Phase Plan (Markdown → Vue components + Simple Themes)

### Goals
- Map Markdown elements to Vue components to control typography and semantics.
- Add a simple, dependency‑light theming system (light/dark) using CSS variables.
- Keep SSR friendly with minimal FOUC and no client‑only coupling.

### Scope (MVP)
- Typography for core Markdown tags: h1–h3, p, a, ul/ol/li, blockquote, code/pre, img, table.
- Theme tokens via CSS variables with `[data-theme]` switch on `html`.
- Lightweight theme toggle with persistence (`localStorage`) and media query default.

### Deliverables
- Global CSS tokens and prose styles registered in Nuxt.
- Content render mapping components (e.g., `ProseH1`, `ProseP`, `ProseA`, …).
- A theme toggle atom and `useTheme` composable.
- Updated page wiring to render Markdown via the mapped components.

### Architecture Decisions
- Markdown → Vue mapping: use `ContentRenderer` `:components` prop to map HTML tags to Vue components. This keeps @nuxt/content and allows progressive enhancement.
  - Example (usage concept):
    ```vue
    <ContentRenderer :value="doc" :components="{ h1: ProseH1, p: ProseP, a: ProseA }" />
    ```
- Theming: CSS variables (custom properties) provide a stable API across components.
  - Define tokens in `:root` for light theme; override in `[data-theme="dark"]`.
  - Components and prose styles consume tokens; no hardcoded colors.
- SSR theming default: pick system preference on first load; persist user choice.

### Implementation Plan (Milestones)
1) Global style foundation
   - Create `assets/styles/tokens.css` with color, spacing, radius, and typography variables.
   - Create `assets/styles/prose.css` to style core Markdown tags using tokens (scoped under a `.prose` utility class or component selectors).
   - Create `assets/styles/components.css` for atoms/molecules overrides (e.g., buttons) using tokens.
   - Register styles in `nuxt.config.ts` via `css: [...]`.

2) Content render components (minimal set)
   - Add `components/prose/ProseH1.vue`, `ProseH2.vue`, `ProseH3.vue`, `ProseP.vue`, `ProseA.vue`, `ProseCode.vue`, `ProsePre.vue`, `ProseUl.vue`, `ProseOl.vue`, `ProseLi.vue`, `ProseBlockquote.vue`.
   - Each component renders the corresponding semantic tag and applies class hooks (e.g., `class="prose-h1"`) or consumes tokens directly.

3) Wire Markdown mapping
   - Update pages that render Markdown (e.g., `pages/index.vue`) to pass the components map to `<ContentRenderer>`.
   - Wrap rendered content with a `.prose` container for default typography.

4) Theme system
   - Add `composables/useTheme.ts` with:
     - reactive `theme` state (`'light' | 'dark'`),
     - `setTheme` that updates `document.documentElement.dataset.theme`,
     - persistence to `localStorage`,
     - initial value from `localStorage` or `prefers-color-scheme`.
   - Add `components/atoms/BaseThemeToggle.vue` (button/switch) to flip themes.
   - Mount default theme early on client and ensure SSR degrades gracefully.

5) Docs and samples
   - Document available tokens and how to extend themes.
   - Add a sample page section demonstrating headers, links, lists, code blocks under both themes.

### Token Sketch (CSS variables)
```css
/* assets/styles/tokens.css */
:root {
  /* base */
  --color-bg: #ffffff;
  --color-fg: #111827;
  --color-muted: #6b7280;
  --color-accent: #2563eb;
  --color-border: #e5e7eb;
  --radius-sm: 6px; --radius-md: 8px; --radius-lg: 12px;
  --font-sans: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, Noto Sans, "Helvetica Neue", Arial, "Apple Color Emoji", "Segoe UI Emoji";
  --size-1: 12px; --size-2: 14px; --size-3: 16px; --size-4: 20px; --size-5: 24px; --size-6: 30px;
}

html[data-theme="dark"] {
  --color-bg: #0b1020;
  --color-fg: #e5e7eb;
  --color-muted: #94a3b8;
  --color-accent: #60a5fa;
  --color-border: #1f2937;
}
```

```css
/* assets/styles/prose.css */
.prose { color: var(--color-fg); }
.prose a { color: var(--color-accent); text-decoration: underline; }
.prose h1 { font-family: var(--font-sans); font-size: var(--size-6); margin: 0 0 0.5em; }
.prose h2 { font-size: var(--size-5); margin: 1.25em 0 0.5em; }
.prose h3 { font-size: var(--size-4); margin: 1em 0 0.5em; }
.prose p { font-size: var(--size-3); line-height: 1.7; margin: 0.8em 0; }
.prose blockquote { border-left: 4px solid var(--color-border); padding-left: 1em; color: var(--color-muted); }
.prose code { background: color-mix(in oklab, var(--color-border), transparent 70%); padding: 0.15em 0.35em; border-radius: var(--radius-sm); }
.prose pre { background: color-mix(in oklab, var(--color-border), transparent 60%); padding: 1em; border-radius: var(--radius-md); overflow: auto; }
.prose ul { list-style: disc; padding-left: 1.2em; }
.prose ol { list-style: decimal; padding-left: 1.2em; }
.prose table { border-collapse: collapse; width: 100%; }
.prose th, .prose td { border: 1px solid var(--color-border); padding: 0.5em; }
```

### Page Wiring Sketch
```vue
<script setup lang="ts">
import ProseH1 from '~/components/prose/ProseH1.vue'
import ProseP from '~/components/prose/ProseP.vue'
import ProseA from '~/components/prose/ProseA.vue'
const components = { h1: ProseH1, p: ProseP, a: ProseA }
</script>

<template>
  <div class="prose">
    <ContentRenderer :value="doc" :components="components" />
  </div>
  </template>
```

### Theme Composable Sketch
```ts
// composables/useTheme.ts
export function useTheme() {
  const theme = useState<'light' | 'dark'>('ui-theme', () => 'light')
  const apply = (t: 'light' | 'dark') => {
    theme.value = t
    if (process.client) {
      document.documentElement.dataset.theme = t
      localStorage.setItem('ui-theme', t)
    }
  }
  onMounted(() => {
    const saved = localStorage.getItem('ui-theme') as 'light' | 'dark' | null
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    apply(saved ?? (prefersDark ? 'dark' : 'light'))
  })
  return { theme, setTheme: apply, toggle: () => apply(theme.value === 'light' ? 'dark' : 'light') }
}
```

### Optional Alternatives (Future)
- Tailwind CSS + Typography plugin for prose defaults; still use CSS variables for tokens.
- `@nuxtjs/color-mode` for SSR‑aware theme handling and class switching.
- Design tokens via style dictionary and CSS layers if scaling to a full design system.

### Risks / Considerations
- Ensure no FOUC: set initial `data-theme` as early as possible (inline script or server default).
- Keep mapping minimal first; expand tags as needed to avoid over‑engineering.
- Current atoms use utility‑like classes; ensure they also consume variables in `components.css`.

### Acceptance Criteria
- Markdown renders through mapped components with consistent typography under `.prose`.
- Theme toggle switches tokens and updates all mapped components without page reload.
- User choice persists across navigations and reloads.


