import { serverQueryContent } from "#content/server";

export default defineEventHandler(async (event) => {
  const runtime = useRuntimeConfig(event);
  const siteUrl: string = runtime.public.siteUrl;
  const defaultLocale: string = runtime.public.defaultLocale || "en";

  // Fetch Home for definition and metadata
  const homePath = `/${defaultLocale}`;
  const home = await serverQueryContent(event).where({ _path: homePath }).findOne();

  // Fetch all docs for filtering
  const allDocs = await serverQueryContent(event).where({ _partial: false }).find();

  // Helper to ensure absolute URLs
  const toAbsolute = (path: string) => {
    if (path.startsWith("http")) return path;
    return `${siteUrl}${path}`;
  };

  // 1. Preamble
  const lines: string[] = [];
  const date = new Date().toISOString().split("T")[0];

  lines.push(`# Gogam: Roleplaying Games from Finland`);
  lines.push(`> [Last Updated: ${date} | Token Estimate: ~1,200 | License: CC BY-NC-SA 3.0]`);
  lines.push(`> ${home.description || "Petri Leinonen's independent TTRPG brand and publishing house. Ground truth for the \"Black Shield Canton\" setting and minimalist game systems."}`);
  lines.push("");

  // 2. Entity Hierarchy

  // A. Primary Links
  lines.push(`## Primary Links`);
  lines.push(`- [Homepage](${siteUrl})`);
  lines.push(`- [Full Context (llms-full.txt)](${toAbsolute("/llms-full.txt")})`);
  lines.push("");

  // B. Products (Games)
  const games = allDocs.filter((doc: any) => {
    const isGame = doc.contentType?.includes("Game") || doc.contentType?.includes("Product");
    // Filter out languages other than English for simplicity if needed, or include them? 
    // Spec says "High-density... low-noise". 
    // Let's stick to English pages for the main list if they exist, or just primary pages.
    // The current content seems to be mixed or mostly English in content/en.
    return isGame && !doc._path?.startsWith("/fi/");
  });

  if (games.length > 0) {
    lines.push(`## Products (Games)`);
    for (const game of games) {
      lines.push(`- [${game.title}](${toAbsolute(game._path)})`);
      if (game.description) {
        lines.push(`  - ${game.description.trim()}`);
      }
    }
    lines.push("");
  }

  // C. Lore & Worldbuilding
  const lore = allDocs.filter((doc: any) => {
    const isLore = doc._path?.includes("mustan-kilven-kantoni") || doc.tags?.includes("world") || doc.tags?.includes("lore");
    return isLore && !doc._path?.startsWith("/fi/");
  });

  if (lore.length > 0) {
    lines.push(`## Lore & Worldbuilding`);
    for (const item of lore) {
      lines.push(`- [${item.title}](${toAbsolute(item._path)})`);
      if (item.description) {
        lines.push(`  - ${item.description.trim()}`);
      }
    }
    lines.push("");
  }

  // D. Multimedia & Social Satellites
  if (home.sameAs || home.organization?.sameAs || home.organization?.founder?.sameAs) {
    lines.push(`## Multimedia & Social Satellites`);
    const links = new Set([
      ...(home.sameAs || []),
      ...(home.organization?.sameAs || []),
      ...(home.organization?.founder?.sameAs || [])
    ]);

    for (const link of links) {
      // Simple label extraction
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
    lines.push(`## FAQ`);
    for (const item of home.faq) {
      lines.push(`Q: ${item.q}`);
      lines.push(`A: ${item.a}`);
      lines.push("");
    }
  }

  setHeader(event, "Content-Type", "text/plain; charset=utf-8");
  setHeader(event, "Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  return lines.join("\n");
});
