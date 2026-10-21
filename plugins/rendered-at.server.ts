export default defineNuxtPlugin(() => {
  // Per-request SSR render time for hydration logs
  const now = new Date().toISOString();
  useState<string>("ssrRenderedAt", () => now);
  if (import.meta.dev) {
    console.log("[ssr] rendered at", now);
  }
});
