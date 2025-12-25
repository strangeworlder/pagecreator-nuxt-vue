# Front Matter Standardization Plan

This document combines structural field analysis and content field analysis to provide a complete plan for standardizing all product page front matter.

**Validation against codebase:**
- ✅ All fields in this plan are used by the system
- ✅ Schema validation: `contentSchema.ts` defines core fields (title, description, tags, dates, summary, entities, canonical)
- ✅ Page rendering: `pages/[...slug].vue` uses template, theme, heroImage, cover
- ✅ SEO/LLM: `geoGraph.ts` uses lastValidated, facts, stats, quotes, entities
- ✅ Head generation: `useContentHead.ts` uses alternateLocales, canonical, image/cover
- ✅ LLMs.txt: `llms.txt.get.ts` uses lastValidated, facts, stats, tags

---

## Standard Field Structure

### Required Field Order
1. `title` ✅ (required by schema)
2. `description` ✅ (required by schema)
3. `datePublished` ✅ (used by geoGraph, useContentHead)
4. `dateModified` ✅ (used by geoGraph, useContentHead)
5. `tags` ✅ (required by schema, used by llms.txt)
6. `canonical` ✅ (used by useContentHead, schema)
7. `alternateLocales` ✅ (used by useContentHead for hreflang)
8. `template` ✅ (used by pages/[...slug].vue)
9. `theme` ✅ (used by pages/[...slug].vue, defaults to "classic")
10. `cover` ✅ (used by pages/[...slug].vue, useContentHead for OG image)
11. `heroImage` ✅ (used by pages/[...slug].vue)
12. `summary` ✅ (defined in schema)
13. `lastValidated` ✅ (used by geoGraph as lastReviewed, llms.txt)
14. `facts` ✅ (used by geoGraph, llms.txt)
15. `stats` ✅ (used by geoGraph, llms.txt)
16. `quotes` ✅ (used by geoGraph)
17. `entities` ✅ (used by geoGraph, defined in schema)

---

## Field-by-Field Standardization Rules

### Core Metadata Fields

#### `datePublished` / `dateModified`
- **Standard**: Both fields required
- **Issue**: `plus-h.md` uses single `date` field
- **Fix**: Convert `date: 2024-01-01` → `datePublished: 2024-01-01` and `dateModified: 2024-01-01`

#### `canonical`
- **Standard**: Must be present, format `/en/[slug]`
- **Missing in**: `plus-h.md`
- **Fix**: Add `canonical: "/en/plus-h"`

#### `alternateLocales`
- **Standard**: Must be present, format `["fi"]`
- **Missing in**: `plus-h.md`
- **Fix**: Add `alternateLocales: ["fi"]` (if Finnish version exists)

#### `category`
- **Standard**: Should not exist (or be added to all files)
- **Issue**: Only `plus-h.md` has `category: "games"`
- **Fix**: Remove from `plus-h.md`

---

### Display Fields

#### `template`
- **Standard**: Must be `"hero"`
- **Missing in**: `the-pig-is-sus.md`, `vuosisata.md`
- **Fix**: Add `template: "hero"`

#### `theme`
- **Standard**: Default is `"classic"` (as defined in codebase). Files using default should explicitly set `theme: "classic"` for consistency. Files using `"modern"` should keep it.
- **Missing in**: `a-particular-group-of-corvids.md`, `nott.md`, `the-pig-is-sus.md`, `we-cant-stop-here.md`
- **Has "modern"**: `vuosisata.md` (keep as is)
- **Fix**: Add `theme: "classic"` to all missing files (they're using the default, so make it explicit)

#### `cover` / `heroImage`
- **Standard**: Both required, typically same image path
- **Missing in**: `the-pig-is-sus.md`, `vuosisata.md`
- **Fix**: Add both fields with appropriate image paths

---

### Content Fields - Facts

#### Structure
- **Standard**: Exactly 2 facts, each with `label` and `value`
- **Current state**: All have 2 facts ✅

#### Label Standardization
**Current labels (inconsistent):**
- "Tone", "System", "Engine", "Core mechanic", "Genre", "Format", "Play mode", "Table size", "Table makeup", "Subject", "Design goal", "Scenario", "Timeline", "Resolution", "Hook"

**Recommended standard:**
1. **First fact**: Always `label: "System"` (or `"Engine"` for PbtA games like +H)
   - Describe the core system/engine
2. **Second fact**: Choose from standard set based on relevance:
   - `"Tone"` - For games with distinctive tone/style
   - `"Play mode"` - For games with specific play patterns (one-shot, campaign, etc.)
   - `"Format"` - For games with unique formats (two-player, card-based, etc.)
   - `"Table size"` - For games with specific player count requirements
   - `"Genre"` - For games with strong genre identity

**Files needing updates:**
- `a-particular-group-of-corvids.md`: Has "Tone" first, "System" second → Swap to "System" first, "Tone" second
- `nott.md`: "Genre" → Change first to "System", keep "Table makeup" or change to "Table size"
- `plus-h.md`: "Engine" is correct for PbtA, but "Subject" → Change to "Tone" or "Play mode"
- `pros-and-cons.md`: "Core mechanic" → Change to "System", keep "Tone"
- `the-necessary-eagle-vs-the-good-cad.md`: "Format" is good, but "Theme" → Change to "Tone" (Theme conflicts with frontmatter field)
- `the-pig-is-sus.md`: "Design goal" → Change to "System", "Scenario" → Change to "Format" or "Play mode"
- `vuosisata.md`: "Timeline" → Change to "System", "Resolution" → Change to "Format" or keep as is
- `we-cant-stop-here.md`: "System" is good, "Hook" → Change to "Tone" or "Play mode"

---

### Content Fields - Stats

#### Structure
- **Standard**: Exactly 2 stats, each with `metric`, `value`, `date`, `source`
- **Current state**: All have 2 stats ✅

#### Source Standardization
**Current sources (inconsistent):**
- "Rules text", "Rule text", "Rule sheet", "Rules manuscript", "Release PDF", "Player sheet", "Playtest notes", "Prototype rules", "Module text", "Community releases"

**Recommended standard:**
- Always use `source: "Rules text"` (plural, consistent)
- Exception: For production info (translations, page count), use `source: "Release PDF"` or `source: "Community releases"` if appropriate

**Files needing updates:**
- `cyberpunk-is-dead.md`: "Rule sheet" → "Rules text"
- `plus-h.md`: "Rules manuscript" → "Rules text"
- `the-necessary-eagle-vs-the-good-cad.md`: "Rule text" (singular) → "Rules text"
- `the-pig-is-sus.md`: "Prototype rules" → "Rules text" (or keep if "Prototype" is important distinction)
- `vuosisata.md`: "Rule manuscript" → "Rules text"
- `we-cant-stop-here.md`: "Module text" → "Rules text"

#### Date Standardization
- **Standard**: Always use `datePublished` date value
- **Issue**: `plus-h.md` uses old `date` field value (2024-01-01)
- **Fix**: Update stats dates to match `datePublished` (2024-01-01 is correct, but ensure consistency)

---

### Content Fields - Quotes

#### Structure
- **Standard**: At least 1 quote, each with `source`, `text`, `date`
- **Current state**: All have 1 quote except `nott.md` has empty array

#### Content Standardization
- **Source**: Always "Petri Leinonen"
- **Date**: Always `2025-11-28` (or update to current `lastValidated` date)

**Files needing updates:**
- `nott.md`: Empty array `quotes: []` → Add a quote or remove the field entirely

---

### Content Fields - Entities

#### Structure
- **Standard**: `type: "CreativeWork"`, `name` (must match title exactly), `sameAs` array

#### Name Standardization
- **Standard**: Entity name must exactly match the `title` field
- **Issue**: `the-pig-is-sus.md` has "The Pig Is Sus" but title is "The Pig Is Sus. Eliminate the Pig."
- **Fix**: Update entity name to match full title

#### sameAs URL Standardization
- **Standard**: Must include itch.io link if game is on itch.io
- **Format**: `https://strangeworlder.itch.io/[slug]`

**Files needing updates:**
- `plus-h.md`: Missing itch.io link (only has roachsphere.com)
  - **Action**: Add itch.io link if game is on itch.io, or verify if it's intentionally not there
- `vuosisata.md**: Uses Google Docs link instead of itch.io
  - **Action**: Verify if game is on itch.io, add link if available

**Additional links (optional but consistent):**
- Consider adding `roolipelikirjasto.fi` links where they exist for consistency

---

## File-by-File Action Items

### `a-particular-group-of-corvids.md`
- [x] Add `theme: "classic"` (explicit default)
- [x] Reorder facts: "System" first, "Tone" second
- [x] Reorder fields to match standard order

### `cars-and-family.md`
- [x] Reorder fields to match standard order (already has all fields)

### `cyberpunk-is-dead.md`
- [x] Change stats source "Rule sheet" → "Rules text"
- [x] Reorder fields to match standard order

### `nott.md`
- [x] Add `theme: "classic"` (explicit default)
- [x] Fix `quotes: []` → Add quote or remove field
- [x] Update facts: "System" first, "Table makeup" or "Table size" second
- [x] Reorder fields to match standard order

### `plus-h.md`
- [x] Convert `date` → `datePublished` and `dateModified`
- [x] Add `canonical: "/en/plus-h"`
- [x] Add `alternateLocales: ["fi"]` (if Finnish version exists)
- [x] Remove `category: "games"`
- [x] Update facts: Keep "Engine" (PbtA), change "Subject" → "Tone" or "Play mode"
- [x] Update stats source "Rules manuscript" → "Rules text"
- [ ] Add itch.io link to entities if available (not on itch.io, only roachsphere.com)
- [x] Reorder fields to match standard order

### `pros-and-cons.md`
- [x] Update facts: "Core mechanic" → "System", keep "Tone"
- [x] Reorder fields to match standard order

### `the-necessary-eagle-vs-the-good-cad.md`
- [x] Update facts: Keep "Format", change "Theme" → "Tone"
- [x] Update stats source "Rule text" → "Rules text"
- [x] Reorder fields to match standard order

### `the-pig-is-sus.md`
- [x] Add `template: "hero"`
- [x] Add `theme: "classic"` (explicit default)
- [x] Add `cover` and `heroImage` (using `/images/the-pig-is-sus-cover.png` - verify image exists)
- [x] Update facts: "Design goal" → "System", "Scenario" → "Format" or "Play mode"
- [x] Update entity name to match full title: "The Pig Is Sus. Eliminate the Pig."
- [x] Reorder fields to match standard order

### `vuosisata.md`
- [x] Add `template: "hero"`
- [x] Keep `theme: "modern"` (already set)
- [x] Add `cover` and `heroImage` (using `/images/vuosisata-cover.png` - verify image exists)
- [x] Update facts: "Timeline" → "System", keep "Resolution" or change to "Format"
- [x] Update stats source "Rule manuscript" → "Rules text"
- [ ] Verify/add itch.io link to entities if available (only has Google Docs, not on itch.io)
- [x] Reorder fields to match standard order

### `we-cant-stop-here.md`
- [x] Add `theme: "classic"` (explicit default)
- [x] Update facts: Keep "System", change "Hook" → "Tone" or "Play mode"
- [x] Update stats source "Module text" → "Rules text"
- [x] Reorder fields to match standard order

---

## Summary Checklist

### Structural Issues
- [ ] 4 files missing `theme` (should explicitly set `theme: "classic"` for default)
- [ ] 2 files missing `template`
- [ ] 2 files missing `cover`/`heroImage`
- [ ] 1 file missing `canonical`/`alternateLocales`
- [ ] 1 file has extra `category` field
- [ ] 1 file uses `date` instead of `datePublished`/`dateModified`

### Content Issues
- [ ] 8 files need facts label standardization
- [ ] 6 files need stats source standardization
- [ ] 1 file has empty quotes array
- [ ] 1 file has entity name mismatch
- [ ] 1-2 files may need itch.io links added

### Field Order
- [ ] All 10 files need field reordering to match standard order

---

## Notes

- **Image paths**: Need to determine cover/heroImage paths for `the-pig-is-sus.md` and `vuosisata.md`
- **itch.io links**: Verify if `plus-h.md` and `vuosisata.md` have itch.io pages
- **Facts labels**: Some games may legitimately need non-standard labels - use judgment
- **Stats sources**: "Prototype rules" and "Module text" might be intentionally different - verify before changing

## Field Usage Reference

### Schema-defined fields (`contentSchema.ts`)
- `title`, `description` (required)
- `tags` (optional, defaults to [])
- `datePublished`, `dateModified` (optional)
- `summary` (optional)
- `entities` (optional)
- `canonical` (optional)
- `slug`, `faq`, `citations`, `noindex`, `llmPriority` (optional, not in plan)

### Page rendering fields (`pages/[...slug].vue`)
- `template` - Controls layout (hero, plain, product)
- `theme` - Controls CSS theme (classic, modern, product)
- `heroImage` / `cover` - Hero image display
- `productTheme`, `productNav` - Product template specific (not in plan)

### SEO/LLM fields (`geoGraph.ts`, `useContentHead.ts`)
- `lastValidated` - Maps to `lastReviewed` in schema.org
- `facts` - Array of `{label, value}` → PropertyValue
- `stats` - Array of `{metric, value, date, source}` → PropertyValue
- `quotes` - Array of `{source, text, date, url?}` → Quotation
- `entities` - Array of `{type, name, sameAs?}` → Thing/CreativeWork
- `alternateLocales` - Array of locale codes for hreflang
- `cover` / `image` - Used for Open Graph images

### All fields in plan are validated and used ✅

