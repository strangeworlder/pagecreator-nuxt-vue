---
name: gogameu-content
description: >-
  Authoring, structuring, and validating content on gogam.eu. Covers Nuxt
  Content v3 Markdown, Zod frontmatter schemas, MDC components, Answer Engine
  Optimization (AEO), and validation via npm run validate:content.
dateModified: 2026-09-08
---

# Content Authoring & AEO Guide for Gogam.eu

This skill provides step-by-step instructions for creating, updating, and validating content across `gogam.eu`.

---

## 1. Content Organization

Content is stored as Markdown files in the `content/` directory:

```
content/
├── fi/
│   ├── index.md                      # Finnish homepage
│   ├── eevenkoto.md                  # Product/setting page
│   ├── eevenkoto/
│   │   ├── ladattavat-resurssit.md
│   │   └── artikkelit/               # Deep-dive articles
│   ├── rajatiloja/                   # Campaign episodes
│   └── uutiset/                      # News posts
└── en/
    ├── index.md                      # English homepage
    └── news/                         # English news posts
```

---

## 2. Frontmatter Standards (Zod Schema)

All Markdown files must satisfy the schema enforced by `server/utils/contentSchema.ts`.

### Core Template

```yaml
---
title: "Title of the Page or Article"
description: "Concise summary for meta tags and search snippets (1-2 sentences)."
datePublished: 2026-08-10
dateModified: 2026-09-08
contentType: CreativeWork             # CreativeWork, Article, Product, WebSite
canonical: /fi/polku                  # Optional: explicit canonical path
aliases:                              # Optional: redirect/alias routes
  - /polku
tags:
  - roolipelit
  - julkaisut
organization:
  name: Kustannusosakeyhtiö Gogam
  url: 'https://gogam.eu'
  sameAs:
    - 'https://instagram.com/gogam.eu'
    - 'https://gogameu.substack.com/'
author:
  name: Petri Leinonen
  url: 'https://gogam.eu'
  sameAs:
    - 'https://rpggeek.com/rpgdesigner/111688/petri-leinonen'
    - 'https://strangeworlder.itch.io/'
isBasedOn:                            # Optional: source games / systems
  - type: Game
    name: System Reference Document 5.2.1 (SRD 5.2.1)
    url: 'https://dnd.wizards.com/resources/systems-reference-document'
about:                                # Conceptual topics
  - '@type': Thing
    name: Urbaani fantasia
summary: >-
  Direct, factual executive summary optimized for Answer Engines (AEO).
  State the core who, what, why immediately without fluff.
faq:                                  # Q&A pairs for search engines / LLMs
  - q: Mikä on teoksen aihe?
    a: Teos esittelee...
---
```

### Critical Rules
- **Stub References for Authors**: Never duplicate full biographical text in content files. Use `name`, `url`, and `sameAs`.
- **Summary**: Must be clear, factual, and answer-oriented. Avoid filler phrases ("Tässä artikkelissa tarkastelemme...").
- **No Offers on the Homepage**: Keep the homepage focused on identity and navigation.

---

## 3. Markdown & Component Syntax (Nuxt Content v3 / MDC)

Use standard Markdown and Nuxt Content MDC syntax. **Do not use mustache-like tags** (`{{define:}}` or `{{ref:}}`):

### Components

- **Alerts**:
  ```markdown
  ::alert{type="note" title="Huomautus"}
  Tärkeä huomio tai lisätieto lukijalle.
  ::
  ```
  Supported types: `note`, `warning`, `tip`.

- **Latest Articles List**:
  ```markdown
  ::latest-articles
  ::
  ```

- **Links**:
  Use standard markdown relative links:
  ```markdown
  [*Tervetuloa Eevenkotoon*](/tervetuloaeevenkotoon)
  ```

---

## 4. Verification Workflow

Always run these npm scripts from the workspace root:

1. **Validate Frontmatter**:
   ```bash
   npm run validate:content
   ```
   Checks every `.md` file against the Zod schema in `server/utils/contentSchema.ts`.

2. **Update Modified Dates**:
   ```bash
   npm run update-date
   ```
   Synchronizes `dateModified` in frontmatter with Git history or current date.

3. **Check Code & Markdown Formatting**:
   ```bash
   npm run biome:check
   ```
   (Use `npm run biome:format` to auto-format if needed.)
