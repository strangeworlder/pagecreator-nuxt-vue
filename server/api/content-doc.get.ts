import { queryCollection } from "@nuxt/content/server";
import { getQuery, setHeader } from "h3";

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

  let doc: Record<string, unknown> | null = null;
  for (const p of candidates) {
    const found = await queryCollection(event, "content").path(p).first();
    if (found) {
      const raw = found as unknown as Record<string, unknown>;
      doc =
        raw.meta && typeof raw.meta === "object"
          ? { ...raw, ...(raw.meta as Record<string, unknown>) }
          : raw;
      break;
    }
  }
  setHeader(event, "Cache-Control", "no-store");
  return { doc };
});
