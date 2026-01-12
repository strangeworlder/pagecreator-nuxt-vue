export default defineEventHandler((event) => {
  const siteUrl: string = useRuntimeConfig(event).public.siteUrl;
  const lines = ["User-agent: *", "Allow: /", "", `Sitemap: ${siteUrl}/sitemap.xml`];
  setHeader(event, "Content-Type", "text/plain; charset=utf-8");
  setHeader(event, "Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  setHeader(event, "X-Robots-Tag", "noindex");
  return lines.join("\n");
});
