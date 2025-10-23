export default defineNuxtPlugin(async () => {
  const route = useRoute();
  const runtime = useRuntimeConfig();
  const ssrRenderedAt = useState<string>('ssrRenderedAt').value
  const buildAt = ssrRenderedAt || runtime.public.buildAt;
  // Track the timestamp of the version currently shown to the user
  const shownAtState = useState<number>('content-shown-at', () => new Date(buildAt).getTime())
  const defaultLocale = runtime.public.defaultLocale || 'en'

  // Attempt a lightweight freshness check on client
  const poll = async () => {
    const url = `/api/content-index?ts=${Date.now()}`
    const { data } = await useFetch<{ items: Array<{ _path: string; dateModified?: string | number }> }>(
      url,
      { server: false, headers: { "cache-control": "no-cache" } },
    );
    const items = data.value?.items || [];
    // Normalize path by ensuring default locale prefix for content lookup
    const candidatePath = route.path.startsWith(`/${defaultLocale}`) ? route.path : `/${defaultLocale}${route.path === '/' ? '' : route.path}`
    const current = items.find((i) => i._path === candidatePath || i._path === route.path);
    if (current?.dateModified) {
      const modified = new Date(current.dateModified).getTime();
      const built = new Date(buildAt).getTime();
      const shown = Number(shownAtState.value || built)
      console.log("modified", modified, `(${new Date(modified).toLocaleString()})`);
      console.log("built", built, `(${new Date(built).toLocaleString()})`);
      console.log("shown", shown, `(${new Date(shown).toLocaleString()})`);
      console.log("modified > shown", modified > shown);
      if (modified > shown) {
        // Prefer a server API to fetch the fully-resolved doc; bust any caches with a ts param
        const freshResp = await $fetch<{ doc: any }>(
          '/api/content-doc',
          {
            params: { path: candidatePath, ts: Date.now() },
            headers: { 'cache-control': 'no-cache' },
          },
        )
        const fresh = freshResp?.doc || await queryContent(candidatePath).findOne();
        if (fresh) {
          // Log exactly where we swap in the fresh document
          console.log("[freshness] Replacing SSR content with fresh content", {
            path: route.path,
            candidatePath,
            modified,
            built,
            shown,
          });
          const docState = useState<any>("content-doc", () => null);
          docState.value = fresh;
          const version = useState<number>("content-doc-version", () => 0)
          version.value = (version.value || 0) + 1
          shownAtState.value = modified
        } else {
          // Log fallback refresh when fresh doc query didn't resolve
          console.log("[freshness] Fresh content detected; falling back to refreshNuxtData()", {
            path: route.path,
            candidatePath,
            modified,
            built,
            shown,
          });
          await refreshNuxtData();
          shownAtState.value = modified
        }
      }
    }
  }

  try {
    await poll()
  } catch {}

  // Keep checking periodically for dev UX (low frequency in prod if needed)
  const intervalMs = process.dev ? 5000 : 60000
  const timer = setInterval(() => { poll().catch(() => {}) }, intervalMs)
  onBeforeUnmount(() => clearInterval(timer))
});
