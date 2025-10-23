export default defineEventHandler(async (event) => {
  const baseUrl: string = useRuntimeConfig(event).public.siteUrl;
  const docs = await queryContent().only(["_path", "dateModified"]).find();
  const urls = docs
    .map(
      (d) =>
        `<url><loc>${baseUrl}${d._path}</loc><lastmod>${new Date(d.dateModified || Date.now()).toISOString()}</lastmod></url>`,
    )
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;
  setHeader(event, "Content-Type", "application/xml");
  setHeader(event, "Cache-Control", "public, max-age=600, stale-while-revalidate=86400");
  return xml;
});
