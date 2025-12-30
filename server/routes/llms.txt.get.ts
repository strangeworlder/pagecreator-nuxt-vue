import { serverQueryContent } from "#content/server";

export default defineEventHandler(async (event) => {
  const runtime = useRuntimeConfig(event);
  const siteUrl: string = runtime.public.siteUrl;
  const defaultLocale: string = runtime.public.defaultLocale || "en";

  const homePath = `/${defaultLocale}`;
  const home = await serverQueryContent(event).where({ _path: homePath }).findOne();

  const allDocs = await serverQueryContent(event).where({ _partial: false }).find();

  // Helper to append rich details (Description, Facts, Stats)
  const appendDocDetails = (lines: string[], doc: Record<string, unknown>) => {
    // Title link
    const path = typeof doc._path === "string" ? doc._path : "";
    const title = String(doc.title || path.split("/").pop() || path).replace(/-/g, " ");
    lines.push(`- [${title}](${siteUrl}${doc._path})`);

    // Description / Summary
    if (doc.summary) {
      lines.push(`  - Description: ${doc.summary}`);
    } else if (doc.description) {
      lines.push(`  - Description: ${doc.description}`);
    }

    // Facts
    if (doc.facts && Array.isArray(doc.facts)) {
      const factsStr = doc.facts
        .map((f: Record<string, unknown>) => `${f.label}: ${f.value}`)
        .join(", ");
      lines.push(`  - Facts: ${factsStr}`);
    }

    // Stats
    if (doc.stats && Array.isArray(doc.stats)) {
      const statsStr = doc.stats
        .map((s: Record<string, unknown>) => `${s.metric}: ${s.value}`)
        .join(", ");
      lines.push(`  - Stats: ${statsStr}`);
    }

    lines.push("");
  };

  const sortDocs = (a: Record<string, unknown>, b: Record<string, unknown>) =>
    String(a._path).localeCompare(String(b._path));

  const keyPages = allDocs
    .filter(
      (d: Record<string, unknown>) =>
        d._path && (String(d._path).startsWith("/en") || String(d._path) === "/"),
    )
    .sort(sortDocs);

  const fiPages = allDocs
    .filter((d: Record<string, unknown>) => String(d._path || "").startsWith("/fi"))
    .sort(sortDocs);

  const lines: string[] = [];

  // H1 title
  lines.push(`# ${String(home?.title || "Gogam")}`);
  lines.push("");

  // Blockquote summary
  lines.push(`> ${String(home?.description || "Roleplaying games by Petri Leinonen.")}`);
  lines.push("");

  // LLM Context from Frontmatter
  // This allows manual curation of the narrative context for LLMs
  if (home.llms_context) {
    if (Array.isArray(home.llms_context)) {
      lines.push(...home.llms_context);
    } else {
      lines.push(String(home.llms_context));
    }
    lines.push("");
  }

  // Context paragraph
  lines.push(
    `This site provides articles and product pages. The content is available in English and Finnish. For a full list of pages, see the sitemap at ${siteUrl}/sitemap.xml.`,
  );
  lines.push("");

  // English Section
  if (keyPages.length) {
    lines.push("## English Pages");
    lines.push("");
    for (const doc of keyPages) {
      appendDocDetails(lines, doc);
    }
    lines.push("");
  }

  // Finnish Section
  if (fiPages.length) {
    lines.push("## Finnish Pages");
    lines.push("");
    for (const doc of fiPages) {
      appendDocDetails(lines, doc);
    }
    lines.push("");
  }

  // Headers
  setHeader(event, "Content-Type", "text/plain; charset=utf-8");
  setHeader(event, "Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  return lines.join("\n");
});
