// @ts-nocheck
import { getQuery, setHeader } from "h3";
import { serverQueryContent } from "#content/server";
import fs from "node:fs/promises";
import { join } from "node:path";

const API_MAX_AGE = Number(process.env.NUXT_API_MAX_AGE || 60)
const API_STALE = Number(process.env.NUXT_API_STALE || 600)

export default cachedEventHandler(
  async (event) => {
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
    const items = await Promise.all(
      rawItems.map(async (d: any) => {
        try {
          const st = await fs.stat(join(contentRoot, d._file));
          return { ...d, dateModified: st.mtime.toISOString() };
        } catch {
          return d;
        }
      }),
    );

    setHeader(event, "Cache-Control", `public, max-age=${API_MAX_AGE}, stale-while-revalidate=${API_STALE}`);
    return { items };
  },
  { name: "content-index", maxAge: API_MAX_AGE, staleMaxAge: API_STALE },
);
