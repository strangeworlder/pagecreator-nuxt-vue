---
title: JSON-LD & AEO Ecosystem Guide
description: Internal guide for AEO structure and Knowledge Graph philosophy.
dateModified: 2026-01-04
---
# JSON-LD & AEO Ecosystem Guide

This project is optimized for AEO (Answer Engine Optimization), meaning we structure data not just for search engines, but for AI models to understand the *relationships* between our content.

## The Core Philosophy: The Knowledge Graph

Instead of independent pages, we build a **Knowledge Graph**. Every entity (Person, Game, Organization) is a node in this graph, connected by stable IDs.

### 1. Stable IDs (`@id`)
We use stable IDs to ensure that "Petri Leinonen" mentioned on the front page is the *same* entity as the "Author" of a game page.
- **Organization**: `https://gogam.eu/#organization`
- **Founder**: `https://gogam.eu/#petri`
- **WebSite**: `https://gogam.eu/#website` (The abstract site entity)
- **WebPage**: `[Current URL]#webpage` (The specific page content)

### 2. The `@graph` Structure
Our JSON-LD output is a single root object containing a `@graph` array. This allows us to define multiple entities on a single page and explain how they relate.

**Example Structure:**
```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://gogam.eu/#organization",
      "name": "Gogam",
      "founder": { "@id": "https://gogam.eu/#petri" }
    },
    {
      "@type": "Person",
      "@id": "https://gogam.eu/#petri",
      "name": "Petri Leinonen"
    },
    {
      "@type": "WebSite",
      "@id": "https://gogam.eu/#website",
      "url": "https://gogam.eu/"
    },
    {
      "@type": "WebPage",
      "@id": "https://gogam.eu/#webpage",
      "isPartOf": { "@id": "https://gogam.eu/#website" },
      "publisher": { "@id": "https://gogam.eu/#organization" }
    }
  ]
}
```

## Frontmatter Guide

You control this graph directly from Markdown frontmatter.

### Organization & Founder (in `index.md`)
The root `index.md` defines the core entities.
```yaml
organization:
  name: Gogam
  url: 'https://gogam.eu'
  founder:
    name: Petri Leinonen
    knowsAbout:
      - Tabletop RPGs
      - OnlyFans
```

### Game Pages
For standard game pages, the system automatically links them to the graph.
- **Author**: If you set `author: Petri Leinonen`, the system matches it to the `#petri` node if possible, or creates a connected Person node.
- **FAQ**: FAQs are automatically embedded and linked.

### Linking Entities
To strengthen the graph, use `sameAs`:
```yaml
sameAs:
  - https://twitter.com/gogam
  - https://itch.io/gogam
```
This tells AI that all these profiles represent the same entity.

## Best Practices for AEO
1. **First Sentence Matters**: AI snippets often grab the first paragraph. Make it a summary of *what* the thing is and *who* made it.
2. **Use Tables**: `markdown-table` syntax is parsed perfectly by AI. Use it for "Key Facts".
3. **Connect Everything**: Avoid orphan pages. Ensure every game links back to the Author and Organization via the schema.
