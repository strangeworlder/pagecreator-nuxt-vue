export default defineNuxtPlugin((nuxtApp) => {
  // Use a per-request SSR render time, which aligns with ISR cached response time
  // This represents when the HTML being served was produced
  const now = new Date().toISOString();
  useState<string>("ssrRenderedAt", () => now);
});
