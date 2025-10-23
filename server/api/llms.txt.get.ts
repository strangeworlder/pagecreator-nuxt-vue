export default defineEventHandler((event) => {
  const siteUrl: string = useRuntimeConfig(event).public.siteUrl;
  const lines = [`${siteUrl}/`, `${siteUrl}/sitemap.xml   type=sitemap`];
  setHeader(event, "Content-Type", "text/plain; charset=utf-8");
  setHeader(event, "Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  return lines.join("\n");
});
