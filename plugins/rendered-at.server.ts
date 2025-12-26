// @ts-nocheck
export default defineNuxtPlugin((nuxtApp) => {
  // Per-request SSR render time for hydration logs
  const now = new Date().toISOString();
  useState<string>("ssrRenderedAt", () => now);
  if (process.dev) {
    console.log("[ssr] rendered at", now);
  }
});
