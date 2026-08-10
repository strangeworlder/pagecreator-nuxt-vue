import { d as defineEventHandler, b as useRuntimeConfig, s as setHeader } from '../_/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'better-sqlite3';
import 'node:crypto';

const robots_txt_get = defineEventHandler((event) => {
  const siteUrl = useRuntimeConfig(event).public.siteUrl;
  const lines = ["User-agent: *", "Allow: /", "", `Sitemap: ${siteUrl}/sitemap.xml`];
  setHeader(event, "Content-Type", "text/plain; charset=utf-8");
  setHeader(event, "Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  setHeader(event, "X-Robots-Tag", "noindex");
  return lines.join("\n");
});

export { robots_txt_get as default };
//# sourceMappingURL=robots.txt.get.mjs.map
