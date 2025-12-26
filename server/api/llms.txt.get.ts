import { serverQueryContent } from "#content/server";

export default defineEventHandler(async (event) => {
  const runtime = useRuntimeConfig(event);
  const siteUrl: string = runtime.public.siteUrl;
  const defaultLocale: string = runtime.public.defaultLocale || "en";

  const homePath = `/${defaultLocale}`;
  const home = await serverQueryContent(event).where({ _path: homePath }).findOne();

  const allDocs = await serverQueryContent(event).where({ _partial: false }).find();

  const defaultLocaleDocs = allDocs
    .filter((d: any) => d._path && d._path.startsWith(`/${defaultLocale}`))
    .sort((a: any, b: any) => a._path.localeCompare(b._path));

  const otherLocaleDocs = allDocs
    .filter((d: any) => d._path && !d._path.startsWith(`/${defaultLocale}`))
    .sort((a: any, b: any) => a._path.localeCompare(b._path));

  const makeItemLine = (d: any) => {
    const title = String(d.title || d._path.split("/").pop() || d._path).replace(/-/g, " ");
    return `- [${title}](${siteUrl}${d._path})`;
  };

  const lines: string[] = [];
  // H1 title
  lines.push(`# ${String(home?.title || "Gogam")}`);
  lines.push("");

  // Blockquote summary
  lines.push(`> ${String(home?.description || "Roleplaying games by Petri Leinonen.")}`);
  lines.push("");

  // Optional details paragraph
  lines.push(
    `This site provides articles and product pages. The default locale is "${defaultLocale}" and URLs follow the pattern /<locale>/... (e.g. ${siteUrl}/${defaultLocale}). For a full list of pages, see the sitemap at ${siteUrl}/sitemap.xml.`,
  );
  lines.push("");

  // Key pages
  if (defaultLocaleDocs.length) {
    lines.push("## Key pages");
    lines.push("");
    for (const d of defaultLocaleDocs) {
      lines.push(makeItemLine(d));

      const doc = d as any;

      if (doc.description) {
        lines.push(`  - Description: ${doc.description}`);
      }

      if (doc.facts && Array.isArray(doc.facts)) {
        const factsStr = doc.facts.map((f: any) => `${f.label}: ${f.value}`).join(", ");
        lines.push(`  - Facts: ${factsStr}`);
      }

      if (doc.stats && Array.isArray(doc.stats)) {
        const statsStr = doc.stats.map((s: any) => `${s.metric}: ${s.value}`).join(", ");
        lines.push(`  - Stats: ${statsStr}`);
      }

      lines.push("");
    }
    lines.push("");
  }

  // Optional secondary pages (e.g. other locales)
  if (otherLocaleDocs.length) {
    lines.push("## Optional");
    lines.push("");
    for (const d of otherLocaleDocs) {
      lines.push(makeItemLine(d));
    }
    lines.push("");
  }

  // Headers
  setHeader(event, "Content-Type", "text/plain; charset=utf-8");
  setHeader(event, "Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  return lines.join("\n");
});
