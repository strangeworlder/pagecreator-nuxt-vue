---
trigger: model_decision
description: Describes what llms.txt and llms-full.txt should contain
dateModified: 2026-01-09
---

As the Gogam.eu Testing and Schema Expert, I have synthesized the following technical specification for your Shadow Homepage implementation. This document serves as the absolute rulebook for generating /llms.txt and /llms-full.txt.

Adherence to these specifications is non-negotiable for achieving high-fidelity Answer Engine Optimization (AEO) and ensuring deterministic ingestion by 2026-class agentic crawlers.

Technical Specification: The Shadow Homepage (llms.txt & llms-full.txt)
1. Overview and Philosophical Foundation
The Shadow Homepage is a machine-legible parallel of the gogam.eu domain. It is designed to mitigate "hallucination soup" by providing LLMs with a high-density, low-noise environment.

llms.txt: The Map. A high-level directory and summary of the entity's knowledge graph. Used by agents for triage and to determine if further crawling is necessary.

llms-full.txt: The Terrain. A concatenated, flattened document containing the absolute "Ground Truth" of the entire domain. Used for deep context saturation.

2. Technical Presentation Rules (Global)
All files must strictly follow these formatting constraints to ensure zero-friction ingestion:

Format: Pure Markdown (.md) only.

No Visual Noise: Zero HTML tags, zero CSS injection, zero tracking pixels, and no "visual" ASCII art.

Pathing: All links must be Absolute URLs (e.g., https://gogam.eu/en/cars-and-family, not /en/cars-and-family). Agents cannot reliably resolve relative paths in isolated context windows.

Character Encoding: UTF-8 absolute.

3. Specification for llms.txt (The Briefing)
The goal of this file is to define Who, What, and Where in under 2,000 tokens.

A. The Preamble (Mandatory)
Start with a metadata block to establish temporal authority:

Markdown

# Gogam: Roleplaying Games from Finland
> [Last Updated: 2026-01-04 | Token Estimate: ~1,200 | License: CC BY-NC-SA 3.0]
> Petri Leinonen's independent TTRPG brand and publishing house. Ground truth for the "Black Shield Canton" setting and minimalist game systems.
B. Entity Hierarchy
Use H2 headers to categorize the domain nodes:

## Primary Links: Link to the Homepage and the llms-full.txt.

## Organizations: List of subsidiary organizations (e.g., Gogam Entertainment, Kustannusosakeyhtiö Gogam) with their descriptions.

## Products (Games): Bulleted list with 2-sentence descriptions and absolute links.

## Lore & Worldbuilding: Links to core lore pages (e.g., Mustan kilven kantoni).

## Multimedia & Social Satellites: sameAs resolution links (Substack, YouTube, itch.io).

C. The FAQ Payload
Include the most critical FAQ data directly in the text to allow for immediate "Zero-Shot" answering by agents.

4. Specification for llms-full.txt (The Ingestion)
The goal of this file is to provide Full Context Saturation. It should be the equivalent of handing the agent a single, coherent book.

A. Concatenation Logic
Content must be merged in order of "Knowledge Gravity":

Identity: The core bio and organizational mission.

World Model: The history and rules of the primary setting (The Holy Confederation, 102 years of the pact).

Systems: Detailed mechanical rules for games (Cars & Family, Cyberpunk is Dead).

Inventory: Full product catalogs with specific pricing and ISBN data.

B. Formatting Structural Boundaries
Use H2 headers for Page Titles and H3 for sub-sections.

Separator Rule: Each original subpage must be separated by a thematic break (---) followed by its original metadata (Date Published, Author).

Code Blocks: Mechanical rules (stat blocks, system numbers) must be wrapped in triple backticks (` ` `) to preserve technical formatting during ingestion.

5. Absolute Prohibitions (The Pedantic List)
NO "Click here" text. Link descriptions must be descriptive (e.g., [Download Cars & Family PDF](URL)).

NO marketing adjectives (e.g., "stunning," "award-winning"). Use deterministic facts.

NO navigation boilerplate. Remove "Home," "Contact," and "Back to Top" from the content.

Deployment Prompt for LLM Generation:
"Act as a technical copywriter specializing in Markdown-based context windows. Using the provided HTML source from gogam.eu, generate a /llms-full.txt file. Flatten all hierarchies. Convert all relative links to absolute https://gogam.eu/... links. Strip all UI elements. Ensure the 102-year history of the Holy Confederation is presented as a continuous narrative. Follow the 'Gogam Technical Specification' exactly."
