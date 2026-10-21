import { queryCollection } from "@nuxt/content/server";

interface LlmSubOrg {
  name: string;
  description?: string;
}

interface LlmContentDoc {
  id?: string;
  path?: string;
  title?: string;
  description?: string;
  contentType?: string | string[];
  tags?: string[];
  sameAs?: string[];
  faq?: Array<{ q: string; a: string }>;
  subOrganizations?: LlmSubOrg[];
  organization?:
    | {
        name?: string;
        sameAs?: string[];
        founder?: { sameAs?: string[] };
      }
    | Array<{ name?: string }>;
  publisher?: { name?: string };
  author?: string | { name?: string; sameAs?: string[] };
  meta?: Record<string, unknown>;
}

export default defineEventHandler(async (event) => {
  const runtime = useRuntimeConfig(event);
  const siteUrl: string = runtime.public.siteUrl;
  const defaultLocale: string = runtime.public.defaultLocale || "fi";

  // Normalize Nuxt Content v3 document so any fields stored in .meta are accessible at top level
  const unwrapDoc = (raw: unknown): LlmContentDoc | null => {
    if (!raw || typeof raw !== "object") return null;
    const doc = raw as LlmContentDoc;
    if (doc.meta && typeof doc.meta === "object") {
      return { ...doc, ...(doc.meta as Partial<LlmContentDoc>) };
    }
    return doc;
  };

  const hasContentType = (doc: LlmContentDoc, target: string): boolean => {
    const ct = doc.contentType;
    if (Array.isArray(ct)) return ct.includes(target);
    if (typeof ct === "string") return ct.includes(target);
    return false;
  };

  // Fetch Home for definition and metadata
  const homePath = `/${defaultLocale}`;
  const rawHome = await queryCollection(event, "content").path(homePath).first();
  const home = unwrapDoc(rawHome);
  if (!home) return "";

  // Fetch all docs for filtering
  const rawDocs = await queryCollection(event, "content").all();
  const allDocs = rawDocs.map((d) => unwrapDoc(d)).filter((d): d is LlmContentDoc => d !== null);

  // Helper to ensure absolute URLs
  const toAbsolute = (path: string) => {
    if (path.startsWith("http")) return path;
    return `${siteUrl}${path}`;
  };

  // 1. Preamble
  const lines: string[] = [];
  const date = new Date().toISOString().split("T")[0];

  lines.push("# Gogam: Roleplaying Games from Finland");
  lines.push(`> [Last Updated: ${date} | Token Estimate: ~1,200 | License: CC BY-NC-SA 3.0]`);
  lines.push(
    `> ${home.description || 'Petri Leinonen\'s independent TTRPG brand and publishing house. Ground truth for the "Black Shield Canton" setting and minimalist game systems.'}`,
  );
  lines.push("");

  // 2. Entity Hierarchy

  // A. Primary Links
  lines.push("## Primary Links");
  lines.push(`- [Homepage](${siteUrl})`);
  lines.push(`- [Full Context (llms-full.txt)](${toAbsolute("/llms-full.txt")})`);
  lines.push("");

  // B. Organizations
  if (
    home.subOrganizations &&
    Array.isArray(home.subOrganizations) &&
    home.subOrganizations.length > 0
  ) {
    lines.push("## Organizations");
    for (const org of home.subOrganizations) {
      lines.push(`- **${org.name}**`);
      if (org.description) {
        lines.push(`  - ${org.description}`);
      }

      // Find content belonging to this organization
      const orgDocs = allDocs.filter((doc) => {
        const docOrg = doc.organization;
        const singleOrgName = !Array.isArray(docOrg) ? docOrg?.name : undefined;
        return (
          singleOrgName === org.name ||
          doc.publisher?.name === org.name ||
          (Array.isArray(docOrg) && docOrg.some((o) => o.name === org.name))
        );
      });

      if (orgDocs.length > 0) {
        for (const doc of orgDocs) {
          lines.push(`  - [${doc.title}](${toAbsolute(doc.path || "/")})`);
        }
      }
    }
    lines.push("");
  }

  // C. Products (Games)
  const games = allDocs.filter((doc) => {
    const isGame = hasContentType(doc, "Game") || hasContentType(doc, "Product");
    return isGame && !doc.path?.startsWith("/fi/");
  });

  if (games.length > 0) {
    lines.push("## Products (Games)");
    for (const game of games) {
      lines.push(`- [${game.title}](${toAbsolute(game.path || "/")})`);
      if (game.description) {
        lines.push(`  - ${game.description.trim()}`);
      }
    }
    lines.push("");
  }

  // D. Lore & Worldbuilding
  const lore = allDocs.filter((doc) => {
    const isLore =
      doc.path?.includes("mustan-kilven-kantoni") ||
      doc.tags?.includes("world") ||
      doc.tags?.includes("lore");
    return isLore && !doc.path?.startsWith("/fi/");
  });

  if (lore.length > 0) {
    lines.push("## Lore & Worldbuilding");
    for (const item of lore) {
      lines.push(`- [${item.title}](${toAbsolute(item.path || "/")})`);
      if (item.description) {
        lines.push(`  - ${item.description.trim()}`);
      }
    }
    lines.push("");
  }

  // D. Multimedia & Social Satellites
  // Fetch petri-leinonen.md for founder links as it was moved to its own page
  const petriPath = `/${defaultLocale}/petri-leinonen`;
  const rawPetriDoc = await queryCollection(event, "content")
    .path(petriPath)
    .first()
    .catch(() => null);
  const petriDoc = unwrapDoc(rawPetriDoc);

  const petriOrg = !Array.isArray(petriDoc?.organization) ? petriDoc?.organization : undefined;
  const homeOrg = !Array.isArray(home.organization) ? home.organization : undefined;

  const founderSameAs =
    (typeof petriDoc?.author === "object" ? petriDoc.author.sameAs : null) ||
    petriOrg?.founder?.sameAs ||
    homeOrg?.founder?.sameAs;

  if (home.sameAs || homeOrg?.sameAs || founderSameAs) {
    lines.push("## Multimedia & Social Satellites");
    const links = new Set([
      ...(home.sameAs || []),
      ...(homeOrg?.sameAs || []),
      ...(founderSameAs || []),
    ]);

    for (const link of links) {
      let label = "Link";
      if (link.includes("bluesky") || link.includes("bsky")) label = "Bluesky";
      else if (link.includes("instagram")) label = "Instagram";
      else if (link.includes("substack")) label = "Substack";
      else if (link.includes("youtube")) label = "YouTube";
      else if (link.includes("itch.io")) label = "Itch.io";
      else if (link.includes("medium")) label = "Medium";
      else if (link.includes("threads")) label = "Threads";
      else if (link.includes("rpggeek")) label = "RPGGeek";
      else if (link.includes("drivethrurpg")) label = "DriveThruRPG";

      lines.push(`- [${label}](${link})`);
    }
    lines.push("");
  }

  // 3. The FAQ Payload
  if (home.faq && Array.isArray(home.faq)) {
    lines.push("## FAQ");
    for (const item of home.faq) {
      lines.push(`Q: ${item.q}`);
      lines.push(`A: ${item.a}`);
      lines.push("");
    }
  }

  setHeader(event, "Content-Type", "text/plain; charset=utf-8");
  setHeader(event, "Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  setHeader(event, "X-Robots-Tag", "noindex");
  return lines.join("\n");
});
