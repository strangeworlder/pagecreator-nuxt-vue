import { d as defineEventHandler, b as useRuntimeConfig, q as queryCollection, s as setHeader } from '../_/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'better-sqlite3';
import 'node:crypto';

const llms_txt_get = defineEventHandler(async (event) => {
  var _a, _b, _c, _d, _e, _f;
  const runtime = useRuntimeConfig(event);
  const siteUrl = runtime.public.siteUrl;
  const defaultLocale = runtime.public.defaultLocale || "fi";
  const homePath = `/${defaultLocale}`;
  const home = await queryCollection(event, "content").path(homePath).first();
  if (!home) return "";
  const allDocs = await queryCollection(event, "content").all();
  const toAbsolute = (path) => {
    if (path.startsWith("http")) return path;
    return `${siteUrl}${path}`;
  };
  const lines = [];
  const date = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  lines.push(`# Gogam: Roleplaying Games from Finland`);
  lines.push(`> [Last Updated: ${date} | Token Estimate: ~1,200 | License: CC BY-NC-SA 3.0]`);
  lines.push(
    `> ${home.description || `Petri Leinonen's independent TTRPG brand and publishing house. Ground truth for the "Black Shield Canton" setting and minimalist game systems.`}`
  );
  lines.push("");
  lines.push(`## Primary Links`);
  lines.push(`- [Homepage](${siteUrl})`);
  lines.push(`- [Full Context (llms-full.txt)](${toAbsolute("/llms-full.txt")})`);
  lines.push("");
  if (home.subOrganizations && Array.isArray(home.subOrganizations) && home.subOrganizations.length > 0) {
    lines.push(`## Organizations`);
    for (const org of home.subOrganizations) {
      lines.push(`- **${org.name}**`);
      if (org.description) {
        lines.push(`  - ${org.description}`);
      }
      const orgDocs = allDocs.filter((doc) => {
        var _a2, _b2;
        return ((_a2 = doc.organization) == null ? void 0 : _a2.name) === org.name || ((_b2 = doc.publisher) == null ? void 0 : _b2.name) === org.name || // Check if it's in a sub-field or alternate listing
        Array.isArray(doc.organization) && doc.organization.some((o) => o.name === org.name);
      });
      if (orgDocs.length > 0) {
        for (const doc of orgDocs) {
          lines.push(`  - [${doc.title}](${toAbsolute(doc.path)})`);
        }
      }
    }
    lines.push("");
  }
  const games = allDocs.filter((doc) => {
    var _a2, _b2, _c2;
    const isGame = ((_a2 = doc.contentType) == null ? void 0 : _a2.includes("Game")) || ((_b2 = doc.contentType) == null ? void 0 : _b2.includes("Product"));
    return isGame && !((_c2 = doc.path) == null ? void 0 : _c2.startsWith("/fi/"));
  });
  if (games.length > 0) {
    lines.push(`## Products (Games)`);
    for (const game of games) {
      lines.push(`- [${game.title}](${toAbsolute(game.path)})`);
      if (game.description) {
        lines.push(`  - ${game.description.trim()}`);
      }
    }
    lines.push("");
  }
  const lore = allDocs.filter((doc) => {
    var _a2, _b2, _c2, _d2;
    const isLore = ((_a2 = doc.path) == null ? void 0 : _a2.includes("mustan-kilven-kantoni")) || ((_b2 = doc.tags) == null ? void 0 : _b2.includes("world")) || ((_c2 = doc.tags) == null ? void 0 : _c2.includes("lore"));
    return isLore && !((_d2 = doc.path) == null ? void 0 : _d2.startsWith("/fi/"));
  });
  if (lore.length > 0) {
    lines.push(`## Lore & Worldbuilding`);
    for (const item of lore) {
      lines.push(`- [${item.title}](${toAbsolute(item.path)})`);
      if (item.description) {
        lines.push(`  - ${item.description.trim()}`);
      }
    }
    lines.push("");
  }
  const petriPath = `/${defaultLocale}/petri-leinonen`;
  const petriDoc = await queryCollection(event, "content").path(petriPath).first().catch(() => null);
  const founderSameAs = (typeof (petriDoc == null ? void 0 : petriDoc.author) === "object" ? petriDoc.author.sameAs : null) || ((_b = (_a = petriDoc == null ? void 0 : petriDoc.organization) == null ? void 0 : _a.founder) == null ? void 0 : _b.sameAs) || ((_d = (_c = home.organization) == null ? void 0 : _c.founder) == null ? void 0 : _d.sameAs);
  if (home.sameAs || ((_e = home.organization) == null ? void 0 : _e.sameAs) || founderSameAs) {
    lines.push(`## Multimedia & Social Satellites`);
    const links = /* @__PURE__ */ new Set([
      ...home.sameAs || [],
      ...((_f = home.organization) == null ? void 0 : _f.sameAs) || [],
      ...founderSameAs || []
    ]);
    for (const link of links) {
      let label = "Link";
      if (link.includes("bluesky") || link.includes("bsky")) label = "Bluesky";
      else if (link.includes("instagram")) label = "Instagram";
      else if (link.includes("substack")) label = "Substack";
      else if (link.includes("youtube")) label = "YouTube";
      else if (link.includes("itch.io")) label = "Itch.io";
      else if (link.includes("medium")) label = "Medium";
      else if (link.includes("threads")) label = "Threads";
      else if (link.includes("rpggeek")) label = "RPGGeek";
      else if (link.includes("drivethrurpg")) label = "DriveThruRPG";
      lines.push(`- [${label}](${link})`);
    }
    lines.push("");
  }
  if (home.faq && Array.isArray(home.faq)) {
    lines.push(`## FAQ`);
    for (const item of home.faq) {
      lines.push(`Q: ${item.q}`);
      lines.push(`A: ${item.a}`);
      lines.push("");
    }
  }
  setHeader(event, "Content-Type", "text/plain; charset=utf-8");
  setHeader(event, "Cache-Control", "public, max-age=3600, stale-while-revalidate=86400");
  setHeader(event, "X-Robots-Tag", "noindex");
  return lines.join("\n");
});

export { llms_txt_get as default };
//# sourceMappingURL=llms.txt.get.mjs.map
