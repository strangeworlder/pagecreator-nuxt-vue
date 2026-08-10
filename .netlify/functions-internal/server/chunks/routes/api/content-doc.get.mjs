import { d as defineEventHandler, a as getQuery, s as setHeader, q as queryCollection } from '../../_/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'better-sqlite3';
import 'node:crypto';

const contentDoc_get = defineEventHandler(async (event) => {
  const { path } = getQuery(event);
  if (!path || typeof path !== "string") {
    setHeader(event, "Cache-Control", "no-store");
    return { error: "Missing path" };
  }
  const ensureLeadingSlash = (p) => p.startsWith("/") ? p : `/${p}`;
  const normalize = (p) => {
    const withSlash = ensureLeadingSlash(p);
    const collapsed = withSlash.replace(/\/{2,}/g, "/");
    return collapsed !== "/" && collapsed.endsWith("/") ? collapsed.slice(0, -1) : collapsed;
  };
  const base = normalize(path);
  const candidates = Array.from(/* @__PURE__ */ new Set([base, `${base}/`]));
  let doc = null;
  for (const p of candidates) {
    const found = await queryCollection(event, "content").path(p).first();
    if (found) {
      doc = found;
      break;
    }
  }
  setHeader(event, "Cache-Control", "no-store");
  return { doc };
});

export { contentDoc_get as default };
//# sourceMappingURL=content-doc.get.mjs.map
