---
trigger: model_decision
description: rules for editing the json-ld frontmatter schema
dateModified: 2026-01-08
---

---
dateModified: 2026-01-08
---
# The Gogam Standard: Technical Directive for Sovereign Graph Architecture

**Objective**: Eliminate "Digital Kudzu" (redundant, fragmented slop). The schema must function as a **Relational Graph**, where every fact exists in exactly one "Master" location and is merely referenced elsewhere.

---

## 1. The Absolute Master of Truth (SSOT)

You must designate **Primary Subject Authorities**.

### 1.1 Home Page (`/`)
*   **Role**: The Identity Hub.
*   **Exclusive Authority**: This is the *only* place authorized to host:
    *   Full **Person** biography (`#petri`).
    *   **Organization** metadata (`#organization`).
    *   Every social link (`sameAs`), founder detail, and high-level brand description.

### 1.2 Product Pages
*   **Role**: The Master Node for that specific entity (Game/Book).
*   **Exclusive Authority**: Description, offers, and detailed attributes for that specific game.

### 1.3 The Rule of Stubs
On any page where you reference an entity that is *not* the primary subject (e.g., referencing Petri on a game page), you are **strictly forbidden** from repeating its full metadata.
*   **Requirement**: You must use a "Stub Reference" consisting **only** of:
    *   `@id`
    *   `@type`
    *   `name`

---

## 2. URI Fragments for Entity Resolution

An ID must distinguish the **Abstract Entity** from the **Physical Document**.

*   **FORBIDDEN**: Using a bare URL as an ID (e.g., `"@id": "https://gogam.eu/en/cars-and-family"`). This conflates the rule set with the HTML file.
*   **REQUIREMENT**: Every Master Node must use a **fragment ID**.

| Entity | ID Format | Example |
| :--- | :--- | :--- |
| **Organization** | `/#organization` | `https://gogam.eu/#organization` |
| **Person** | `/#petri` | `https://gogam.eu/#petri` |
| **Game/Book** | `[URL]#game` | `https://gogam.eu/en/cars-and-family#game` |

**Why**: This allows agents to perform entity resolution, connecting authority across platforms (RPGGeek, Itch.io) back to this specific "Ground Truth."

---

## 3. Abolition of the "Review" Type

Gogam is a Brand Hub, not a transactional webstore. We do not participate in the "star-rating" economy.

*   **FORBIDDEN**: `@type: Review`, `aggregateRating`. These signal retail intent and trigger validation errors.
*   **REQUIREMENT**: Testimonials must be modeled as **Citations** using the `mentions` property on the primary entity.

### Execution
`mentions` must contain a `CreativeWork` object:
*   `abstract`: The literal quote/testimonial text.
*   `author`: The `Person` who gave the testimonial.
    *   Must include `name` and `jobTitle`.
*   Result: Human provenance without consumer baggage.

---

## 4. Mechanical Lineage & Intellectual Rigor

We must provide the "Pedagogical Hub" that proves work was grown from established roots.

*   **REQUIREMENT**: Use the `isBasedOn` property for every game.
*   **Execution**: Must be a nested `CreativeWork` object.
    *   **Hack**: Cite original engine (e.g., "Lasers & Feelings") and author.
    *   **Supplement**: Cite core system (e.g., "Legendoja & lohikäärmeitä").

---

## 5. Semantic Precision (AEO)

Machine agents require parseable data, not narrative text.

*   **FORBIDDEN**: Strings for numbers (e.g., `"numberOfPlayers": "3 to 5"`).
*   **REQUIREMENT**:
    *   **numberOfPlayers**: Must use `QuantitativeValue` with `minValue` and `maxValue`.
    *   **inLanguage**: Must be an array of ISO 639-1 strings (e.g., `["en", "fi", "pt"]`).
    *   **ImageObject**: The `image` property must be an **object** containing `url`, `width`, and `height`.

---

## 6. The WebPage Nexus

The `WebPage` node on every page is the "briefing" for the agent.

*   **REQUIREMENT**: Every subpage must include a `WebPage` entity.
*   **Fulfillment**:
    *   `isPartOf`: Pointing to the `WebSite` ID.
    *   `breadcrumb`: Pointing to hierarchy.
    *   `mainEntity`: Pointing to the **Master Node** (`#game`) of the subject on that page.

---

**Summary**: If you update a fact (like a social media link) in `index.md`, that update must propagate across the entire Knowledge Graph via the `@id` references. If you find yourself copying and pasting a bio or an "Offer" across multiple files, you are creating bloat and failing the Sovereign Homepage mandate.

---

## 7. Technical Directive Addendum: Conceptual Nodes & Pedagogical Hubs

### 7.1 Defining the "World" Entity
Since this article analyzes a specific setting, we must define that setting as a unique entity so that all products can point to it.
*   **The Master Node**: The lore article (e.g., `/en/mustan-kilven-kantoni`) acts as the Master Node for the World Concept.
*   **The Requirement**: Create a conceptual `@id` for the world.
    *   Example: `https://gogam.eu/#world-black-shield-canton`
*   **Property**: The Article node must use the `about` property to point to this World ID.

### 7.2 "About" (Subject) vs. "Mentions" (References)
The subcontractor must strictly distinguish between what the page is *about* (the primary subject) and what it *mentions* (related items).
*   `about`: Reserved for the high-level concepts (e.g., Finnish Folklore, Post-apocalyptic Fantasy).
*   `mentions`: Used for the products analyzed in the text (e.g., *Hirviökirja*, *Them Deeper Bones*).
*   **Literal Execution**: The products in the `mentions` array must be stubs (ID + Name only).

### 7.3 The Article Node Structure
This page is not a Product. It is an Article (or Analysis).
*   **Requirement**: Use `@type: Article` or `@type: TechArticle` (if it’s a design analysis).
*   **Fulfillment**:
    *   `author`: Stub reference to `/#petri`.
    *   `publisher`: Stub reference to `/#organization`.
    *   `headline`: Must match the `<h1>` exactly.
    *   `abstract`: Use your summary frontmatter here for AEO ingestion.

### 7.4 SSOT for Themes & Style
This article is the "Master of Truth" for your design philosophy (Melancholy, Respect for Nature).
*   **Requirement**: Use the `keywords` property to list the core themes literally (e.g., "Finnish National Romanticism", "OSR", "Animism").
*   **Benefit**: When an AI agent asks "What is the tone of Gogam games?", it will cite this specific article as the primary source.

### 7.5 Updated Logic Table for Subcontractor

| Entity Type | Master Location | Required Properties (Master Only) | Stub Properties (Everywhere else) |
| :--- | :--- | :--- | :--- |
| **Lore Article** | `/en/mustan-kilven-kantoni` | `headline`, `articleBody` (or `abstract`), `about`, `mentions` | `@id`, `@type`, `headline` |
| **World Concept** | `/en/mustan-kilven-kantoni` | `@id: ...#world`, `name`, `description` | `@id`, `name` |
| **Game/Book** | Product Subpage | `offers`, `isBasedOn`, `numberOfPlayers` | `@id`, `name` |

### 7.6 Section: Lore & Analysis Articles
*   **MainEntity**: The `WebPage` must have `mainEntity` pointing to `[URL]#article`.
*   **Subject Matter**: The `Article` must have an `about` array.
    *   Include a `Thing` for "Finnish Folklore" (with a `sameAs` link to Wikipedia).
    *   Include the `@id` for the "Black Shield Canton" world.
*   **Cross-Linking**: Use the `mentions` array to link to every product described in the analysis. Do not repeat product descriptions or offers. Only use IDs.
*   **Language Integrity**: This specific page has an alternate link to the Finnish version (e.g. `/fi/mustan-kilven-kantoni`). The `WebPage` node must include `alternateLanguage` pointing to the Finnish URL.

---

## 8. Author and Organization Identity (Exception to Stubs)

While "The Rule of Stubs" applies to general entity references, for **Author** (Petri Leinonen) and **Organization** (Gogam / Kustannusosakeyhtiö Gogam) fields on product pages, we prioritize **Explicit Identity Resolution**.

*   **Requirement**: You MUST include the `sameAs` array for the `author` and `organization` entities.
*   **Execution**: Do not rely solely on the `@id`. Duplicate the canonical `sameAs` links (e.g., RPGGeek, Itch.io, Instagram) to ensure immediate resolution.

---

## 9. External Content & Actual Plays

When indexing substantial third-party content (like "Actual Play" series) that serves as a pedagogical resource for our games, we treat them as **Pedagogical Hubs**.

*   **Type**: Must be `CreativeWorkSeries`.
    *   **Note**: The Series itself is *not* a `VideoObject`. The individual episodes are.
*   **Structure**: The Series page should act as a collection.
    *   **Episodes**: Referenced via links or `hasPart` (if applicable), utilizing the **Episode Logic** (Section 10).
*   **The Pedagogical Link**: The `about` property is critical. It must point to the **Master Node** of the game being played (e.g., `https://gogam.eu/en/plus-h#game`).
    *   **Reasoning**: This signals to the Answer Engine that "This series teaches you how to play This Game".
*   **Author vs. Publisher**:
    *   `author`: The Content Creator (e.g., Roachsphere).
    *   `publisher`: Gogam (as the hosting/curating entity).
*   **Cast References**: Use the `mentions` array to credit the GM and relevant cast members/groups (e.g., Fate-akatemia).

---

## 10. Episode Logic

Individual episodes are Atomic Units of the series. They are not just "Articles" but `VideoObjects` embedded in a page.

*   **Template**: Must use `template: episode` to trigger the video layout.
*   **ContentType**: Must be `VideoObject`.
*   **Required Properties**:
    *   `contentUrl`: The direct link to the video file or stream (e.g., YouTube URL).
    *   `partOfSeries`: A reference to the parent Series ID (e.g., `https://gogam.eu/fi/rajatiloja`).
    *   `duration`: ISO 8601 duration string (e.g. `PT57M`).
*   **Mentions**:
    *   Use the `mentions` array to list Character references (`/#didi`, `/#sten`) relevant to that specific episode.
    *   Use `type: Person` or `type: Thing` for one-off entities not in the global graph.
