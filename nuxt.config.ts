// https://nuxt.com/docs/api/configuration/nuxt-config
const env: Record<string, string | undefined> =
  (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env || {};

const ISR_TTL = Number(env.NUXT_ISR_TTL || (env.NODE_ENV === "production" ? 21600 : 60));
const API_MAX_AGE = Number(env.NUXT_API_MAX_AGE || (env.NODE_ENV === "production" ? 300 : 60));
const API_STALE = Number(env.NUXT_API_STALE || (env.NODE_ENV === "production" ? 21600 : 600));
export default {
  components: [{ path: "~/components", pathPrefix: false }],
  modules: ["@nuxt/content"],
  css: [
    "~/assets/styles/tokens.css",
    "~/assets/styles/prose.css",
    "~/assets/styles/components.css",
  ],
  typescript: {
    strict: true,
    shim: false,
  },
  nitro: {
    compatibilityDate: "2025-10-23",
    experimental: {
      websocket: true,
    },
    prerender: {
      crawlLinks: true,
    },
  },
  routeRules: {
    "/": { isr: ISR_TTL },
    "/en/**": { isr: ISR_TTL },
    "/fi/**": { isr: ISR_TTL },
    "/sv/**": { isr: ISR_TTL },
    "/**": { isr: ISR_TTL },
    "/api/**": { cache: { swr: API_STALE, maxAge: API_MAX_AGE } },
    "/ws": { cors: true, websocket: true },
    "/api/ws": { cors: true, websocket: true },
  },
  runtimeConfig: {
    public: {
      siteUrl: env.NUXT_PUBLIC_SITE_URL || "http://localhost:3000",
      buildAt: env.BUILD_AT || new Date().toISOString(),
      redirectContentWS: env.CONTENT_WS_REDIRECT ?? "1",
      defaultLocale: env.NUXT_PUBLIC_DEFAULT_LOCALE || "en",
    },
  },
  content: {
    highlight: {
      theme: "github-dark",
    },
    ws: false,
  },
} as unknown;
