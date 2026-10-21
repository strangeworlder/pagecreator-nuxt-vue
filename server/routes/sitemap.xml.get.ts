import { queryCollection } from "@nuxt/content/server";
import { type CanonicalizableDoc, resolveCanonicalPath } from "~/utils/routing";

export default defineEventHandler(async (event) => {
  const runtime = useRuntimeConfig(event);
  const baseUrl = String(runtime.public.siteUrl || "");
  const defaultLocale = String(runtime.public.defaultLocale || "fi");
  const docs = await queryCollection(event, "content").all();

  const urls: string[] = [];

  for (const rawDoc of docs) {
    const record = rawDoc as unknown as Record<string, unknown>;
    const d: Record<string, unknown> =
      record.meta && typeof record.meta === "object"
        ? { ...record, ...(record.meta as Record<string, unknown>) }
        : record;

    if (d.noindex) continue;

    const loc = resolveCanonicalPath(d as CanonicalizableDoc, defaultLocale);
    const path = loc === "/" ? "" : loc.replace(/\/$/, "");

    let lastmodDate = d.dateModified ? new Date(d.dateModified as string | Date) : new Date();
    if (Number.isNaN(lastmodDate.getTime())) {
      lastmodDate = new Date();
    }
    const lastmod = lastmodDate.toISOString();

    urls.push(
      `<url><loc>${baseUrl.replace(/\/$/, "")}${path}</loc><lastmod>${lastmod}</lastmod></url>`,
    );
  }

  const uniqueUrls = Array.from(new Set(urls));

  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${uniqueUrls.join("")}</urlset>`;
  setHeader(event, "Content-Type", "application/xml; charset=utf-8");
  setHeader(event, "Cache-Control", "public, max-age=600, stale-while-revalidate=86400");
  return xml;
});
