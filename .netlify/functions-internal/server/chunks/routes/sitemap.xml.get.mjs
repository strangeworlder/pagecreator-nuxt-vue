import { d as defineEventHandler, b as useRuntimeConfig, q as queryCollection, s as setHeader } from '../_/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'better-sqlite3';
import 'node:crypto';

const sitemap_xml_get = defineEventHandler(async (event) => {
  const baseUrl = useRuntimeConfig(event).public.siteUrl;
  const docs = await queryCollection(event, "content").select("path", "dateModified", "canonical", "aliases").all();
  const urls = [];
  for (const d of docs) {
    let loc = d.path;
    if (d.canonical && typeof d.canonical === "string" && d.canonical.startsWith("/")) {
      loc = d.canonical;
    }
    const path = loc === "/" ? "" : loc.replace(/\/$/, "");
    const lastmod = new Date(d.dateModified || Date.now()).toISOString();
    urls.push(
      `<url><loc>${baseUrl.replace(/\/$/, "")}${path}</loc><lastmod>${lastmod}</lastmod></url>`
    );
  }
  const uniqueUrls = Array.from(new Set(urls));
  const xml = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${uniqueUrls.join("")}</urlset>`;
  setHeader(event, "Content-Type", "application/xml");
  setHeader(event, "Cache-Control", "public, max-age=600, stale-while-revalidate=86400");
  return xml;
});

export { sitemap_xml_get as default };
//# sourceMappingURL=sitemap.xml.get.mjs.map
