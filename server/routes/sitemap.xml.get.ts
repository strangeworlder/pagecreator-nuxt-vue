import { serverQueryContent } from "#content/server";

export default defineEventHandler(async (event) => {
  const baseUrl: string = useRuntimeConfig(event).public.siteUrl;
  const docs = await serverQueryContent(event).only(["_path", "dateModified", "canonical", "aliases"]).find();

  const urls: string[] = [];

  for (const d of docs) {
    // 1. Determine the primary URL for this document
    let loc = d._path;

    // If canonical is specified and matches a path format, use it as the primary location
    // (e.g. content/en/index.md having canonical: "/" means we list https://site.com/)
    if (d.canonical && typeof d.canonical === "string" && d.canonical.startsWith("/")) {
      loc = d.canonical;
    }

    // Ensure no trailing slash for consistency (unless root)
    const path = loc === "/" ? "" : loc.replace(/\/$/, "");
    const lastmod = new Date(d.dateModified || Date.now()).toISOString();

    urls.push(`<url><loc>${baseUrl.replace(/\/$/, "")}${path}</loc><lastmod>${lastmod}</lastmod></url>`);

    // 2. If aliases exist, we SHOULD NOT add them to sitemap automatically as duplicates,
    // unless they are canonical interactions, but standard practice is listing ONLY the canonical URL.
    // However, if the user explicitly mapped content/fi/hirviokirja -> canonical: /hirviokirja,
    // then the above check handles it.
  }

  // Filter out duplicates in case multiple files claim the same canonical URL (though that would be an error arguably)
  const uniqueUrls = Array.from(new Set(urls));

  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${uniqueUrls.join("")}</urlset>`;
  setHeader(event, "Content-Type", "application/xml");
  setHeader(event, "Cache-Control", "public, max-age=600, stale-while-revalidate=86400");
  return xml;
});
