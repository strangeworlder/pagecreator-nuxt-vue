import { queryCollection } from "@nuxt/content/server";
// @ts-nocheck
import fs from "node:fs/promises";
import { join } from "node:path";
import { getQuery, setHeader } from "h3";

const API_MAX_AGE = Number(process.env.NUXT_API_MAX_AGE || 60);
const API_STALE = Number(process.env.NUXT_API_STALE || 600);

import type { H3Event } from "h3";

async function handler(event: H3Event) {
  const { locale, path } = getQuery(event);
  const base = typeof locale === "string" && locale ? `/${locale}` : undefined;

  let q = queryCollection(event, 'content')
    .select("path", "title", "description", "datePublished", "dateModified", "tags", "id", "meta");

  // If a specific path is requested, filter to just that page
  if (typeof path === "string" && path) {
    q = q.where('path', '=', path);
  } else if (base) {
    // Otherwise, filter by locale if provided
    q = q.where('path', 'LIKE', `${base}%`);
  }
  const rawItems = await q.order('datePublished', 'DESC').all();
  const contentRoot = join(process.cwd(), "content");
  type ContentItem = {
    path: string;
    id?: string;
    title?: string;
    description?: string;
    datePublished?: string | number;
    dateModified?: string | number;
    tags?: unknown;
  };
  const items = await Promise.all(
    (rawItems as unknown as ContentItem[]).map(async (d) => {
      try {
        const fileKey = (d.id || d.path).replace(/^\//, "");
        const st = await fs.stat(join(contentRoot, fileKey));
        return { ...d, dateModified: st.mtime.toISOString() };
      } catch {
        return d;
      }
    }),
  );

  if (process.env.NODE_ENV !== "production") {
    setHeader(event, "Cache-Control", "no-store");
  } else {
    setHeader(
      event,
      "Cache-Control",
      `public, max-age=${API_MAX_AGE}, stale-while-revalidate=${API_STALE}`,
    );
  }
  return { items };
}

export default process.env.NODE_ENV !== "production"
  ? defineEventHandler(handler)
  : cachedEventHandler(handler, {
      name: "content-index",
      maxAge: API_MAX_AGE,
      staleMaxAge: API_STALE,
    });
