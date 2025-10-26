// @ts-nocheck
import fs from "node:fs/promises";
import { join } from "node:path";
import { getQuery, setHeader } from "h3";
import { serverQueryContent } from "#content/server";

const API_MAX_AGE = Number(process.env.NUXT_API_MAX_AGE || 60);
const API_STALE = Number(process.env.NUXT_API_STALE || 600);

async function handler(event: any) {
  const { locale } = getQuery(event);
  const base = typeof locale === "string" && locale ? `/${locale}` : undefined;

  let q = serverQueryContent(event)
    .where({ _partial: false })
    .only(["_path", "title", "description", "datePublished", "dateModified", "tags", "_file"]);
  if (base) {
    q = q.where({ _path: { $regex: `^${base}(?:/|$)` } });
  }
  const rawItems = await q.sort({ datePublished: -1 }).find();
  const contentRoot = join(process.cwd(), "content");
  type ContentItem = {
    _path: string;
    _file: string;
    title?: string;
    description?: string;
    datePublished?: string | number;
    dateModified?: string | number;
    tags?: unknown;
  };
  const items = await Promise.all(
    (rawItems as ContentItem[]).map(async (d) => {
      try {
        const st = await fs.stat(join(contentRoot, d._file));
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

export default (process.env.NODE_ENV !== "production")
  ? defineEventHandler(handler)
  : cachedEventHandler(handler, { name: "content-index", maxAge: API_MAX_AGE, staleMaxAge: API_STALE });
