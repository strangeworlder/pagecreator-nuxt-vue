// @ts-nocheck
import { getQuery, setHeader } from "h3";
import { serverQueryContent } from "#content/server";

export default defineEventHandler(async (event) => {
  const { path } = getQuery(event);
  if (!path || typeof path !== "string") {
    setHeader(event, "Cache-Control", "no-store");
    return { error: "Missing path" };
  }
  const ensureLeadingSlash = (p: string) => (p.startsWith("/") ? p : `/${p}`);
  const normalize = (p: string) => {
    const withSlash = ensureLeadingSlash(p);
    // Collapse duplicate slashes
    const collapsed = withSlash.replace(/\/{2,}/g, "/");
    // Remove trailing slash except for root
    return collapsed !== "/" && collapsed.endsWith("/") ? collapsed.slice(0, -1) : collapsed;
  };

  const base = normalize(path);
  const candidates = Array.from(new Set([base, `${base}/`]));

  let doc = null as any;
  for (const p of candidates) {
    const found = await serverQueryContent(event).where({ _path: p, _partial: false }).findOne();
    if (found) {
      doc = found;
      break;
    }
  }
  setHeader(event, "Cache-Control", "no-store");
  return { doc };
});
