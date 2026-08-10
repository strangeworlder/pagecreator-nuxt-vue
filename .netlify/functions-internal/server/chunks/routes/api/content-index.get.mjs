import { c as cachedEventHandler, a as getQuery, q as queryCollection, s as setHeader } from '../../_/nitro.mjs';
import fs from 'node:fs/promises';
import { join } from 'node:path';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'better-sqlite3';
import 'node:crypto';

const API_MAX_AGE = Number(process.env.NUXT_API_MAX_AGE || 60);
const API_STALE = Number(process.env.NUXT_API_STALE || 600);
async function handler(event) {
  const { locale, path } = getQuery(event);
  const base = typeof locale === "string" && locale ? `/${locale}` : void 0;
  let q = queryCollection(event, "content").select("path", "title", "description", "datePublished", "dateModified", "tags", "id", "meta");
  if (typeof path === "string" && path) {
    q = q.where("path", "=", path);
  } else if (base) {
    q = q.where("path", "LIKE", `${base}%`);
  }
  const rawItems = await q.order("datePublished", "DESC").all();
  const contentRoot = join(process.cwd(), "content");
  const items = await Promise.all(
    rawItems.map(async (d) => {
      try {
        const fileKey = (d.id || d.path).replace(/^\//, "");
        const st = await fs.stat(join(contentRoot, fileKey));
        return { ...d, dateModified: st.mtime.toISOString() };
      } catch {
        return d;
      }
    })
  );
  {
    setHeader(
      event,
      "Cache-Control",
      `public, max-age=${API_MAX_AGE}, stale-while-revalidate=${API_STALE}`
    );
  }
  return { items };
}
const contentIndex_get = cachedEventHandler(handler, {
  name: "content-index",
  maxAge: API_MAX_AGE,
  staleMaxAge: API_STALE
});

export { contentIndex_get as default };
//# sourceMappingURL=content-index.get.mjs.map
