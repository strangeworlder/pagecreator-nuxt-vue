import { d as defineEventHandler, b as useRuntimeConfig, q as queryCollection, s as setHeader } from '../_/nitro.mjs';
import 'node:http';
import 'node:https';
import 'node:events';
import 'node:buffer';
import 'node:fs';
import 'node:path';
import 'better-sqlite3';
import 'node:crypto';

const site_webmanifest_get = defineEventHandler(async (event) => {
  const runtime = useRuntimeConfig();
  const defaultLocale = runtime.public.defaultLocale || "fi";
  const homePath = `/${defaultLocale}`;
  const home = await queryCollection(event, "content").path(homePath).first();
  const name = String((home == null ? void 0 : home.title) || "Gogam");
  const shortName = "Gogam";
  const description = String((home == null ? void 0 : home.description) || "Roleplaying games by Petri Leinonen.");
  const themeColor = "#405e95";
  const backgroundColor = "#304e85";
  const manifest = {
    name,
    short_name: shortName,
    description,
    lang: (home == null ? void 0 : home.language) || defaultLocale,
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    theme_color: themeColor,
    background_color: backgroundColor,
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any maskable"
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any maskable"
      }
    ]
  };
  setHeader(event, "Content-Type", "application/manifest+json; charset=utf-8");
  setHeader(event, "Cache-Control", "public, max-age=600, stale-while-revalidate=86400");
  return manifest;
});

export { site_webmanifest_get as default };
//# sourceMappingURL=site.webmanifest.get.mjs.map
