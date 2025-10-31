// https://nuxt.com/docs/api/configuration/nuxt-config
import { globSync } from "glob";
import fs from "node:fs";
import matter from "gray-matter";
const env: Record<string, string | undefined> =
  (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env || {};

const ISR_TTL = Number(env.NUXT_ISR_TTL || (env.NODE_ENV === "production" ? 21600 : 60));
const API_MAX_AGE = Number(env.NUXT_API_MAX_AGE || (env.NODE_ENV === "production" ? 300 : 60));
const API_STALE = Number(env.NUXT_API_STALE || (env.NODE_ENV === "production" ? 21600 : 600));
const DEFAULT_LOCALE = env.NUXT_PUBLIC_DEFAULT_LOCALE || "en";

// Prerender all content routes for static export
const contentFiles = globSync("content/**/*.{md,mdx,markdown}", { dot: false });
const fileToRoute = (file: string) => {
  const rel = file.replace(/^content\//, "").replace(/\.(md|mdx|markdown)$/i, "");
  // Map .../index to its directory root
  let route = `/${rel}`;
  route = route.replace(/\/?index$/i, "");
  // Collapse duplicate slashes and ensure leading slash only
  route = route.replace(/\/+/, "/");
  if (route === "") route = "/";
  return route;
};
// Extract alias routes from front matter
const aliasRoutes = new Set<string>();
for (const file of contentFiles) {
  try {
    const src = fs.readFileSync(file, "utf8");
    const fm = matter(src).data as Record<string, any>;
    const aliases: unknown = fm.aliases;
    if (Array.isArray(aliases)) {
      for (const a of aliases) {
        if (typeof a === "string" && a.trim()) {
          const route = a.startsWith("/") ? a : `/${a}`;
          aliasRoutes.add(route);
        }
      }
    } else if (typeof aliases === "string" && aliases.trim()) {
      const route = aliases.startsWith("/") ? aliases : `/${aliases}`;
      aliasRoutes.add(route);
    }
  } catch {}
}
const contentRoutes = Array.from(new Set(["/", `/${DEFAULT_LOCALE}`, ...contentFiles.map(fileToRoute), ...aliasRoutes]));
export default {
  components: [{ path: "~/components", pathPrefix: false }],
  modules: ["@nuxt/content"],
  vue: {
    compilerOptions: {
      warnHandler: (msg: string) => {
        // Suppress the NuxtLink slot warning
        if (msg.includes('Slot "default" invoked outside of the render function')) {
          return;
        }
        // Show other warnings
        console.warn(msg);
      },
    },
  },
  experimental: {
    appManifest: false,
  },
  css: [
    "~/assets/styles/tokens.css",
    "~/assets/styles/prose.css",
    "~/assets/styles/components.css",
    "~/assets/styles/product.css",
  ],
  app: {
    head: {
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "theme-color", content: "#405e95" },
        { name: "referrer", content: "origin" },
        { name: "google-site-verification", content: "gg3Wz2OOtdYQCHFwae6F6PToGHUWQbUWaieUS1SwiI0" },
        { name: "msapplication-TileColor", content: "#304e85" },
      ],
      link: [
        { rel: "apple-touch-icon", sizes: "180x180", href: "/apple-touch-icon.png" },
        { rel: "icon", type: "image/png", sizes: "32x32", href: "/favicon-32x32.png" },
        { rel: "icon", type: "image/png", sizes: "16x16", href: "/favicon-16x16.png" },
        { rel: "manifest", href: "/site.webmanifest" },
        { rel: "mask-icon", href: "/safari-pinned-tab.svg", color: "#405e95" },
      ],
    },
  },
  typescript: {
    strict: true,
    shim: false,
  },
  nitro: {
    preset: "netlify",
    compatibilityDate: "2025-10-24",
    experimental: {
      websocket: true,
    },
    // When deploying SSR (Netlify functions), don't override output dir
    prerender: {
      crawlLinks: true,
      routes: contentRoutes,
    },
  },
  routeRules: {
    // Root should serve canonical homepage at '/' and use ISR like other pages
    "/": { isr: ISR_TTL },
    "/en/**": { isr: ISR_TTL },
    "/fi/**": { isr: ISR_TTL },
    "/sv/**": { isr: ISR_TTL },
    "/**": { isr: ISR_TTL },
    // Disable caching for dynamic binary responses to prevent hangs on large payloads
    "/api/image": { cache: false },
    "/api/**": { cache: { swr: API_STALE, maxAge: API_MAX_AGE } },
    "/ws": { cors: true, websocket: true },
    "/api/ws": { cors: true, websocket: true },
    // "/api/image": { cache: { maxAge: 300, swr: 300 } },
  },
  runtimeConfig: {
    public: {
      siteUrl: env.NUXT_PUBLIC_SITE_URL || "http://localhost:3000",
      buildAt: env.BUILD_AT || new Date().toISOString(),
      redirectContentWS: env.CONTENT_WS_REDIRECT ?? "1",
      defaultLocale: env.NUXT_PUBLIC_DEFAULT_LOCALE || "en",
      disableFreshness: env.NUXT_PUBLIC_DISABLE_FRESHNESS || (env.NUXT_PUBLIC_STATIC_HOSTING ? "1" : "0"),
      staticHosting: env.NUXT_PUBLIC_STATIC_HOSTING || "",
    },
  },
  // Using custom /api/i endpoint for transforms to avoid native deps
  content: {
    highlight: {
      theme: "github-dark",
    },
    ws: false,
  },
} as unknown;
