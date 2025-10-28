// @ts-nocheck
export default defineNuxtPlugin(async () => {
  const runtime = useRuntimeConfig();
  if (runtime.public.disableFreshness === '1' || runtime.public.disableFreshness === 1) {
    return;
  }
  const staticHosting = runtime.public.staticHosting === '1' || runtime.public.staticHosting === 1 || runtime.public.staticHosting === true;
  const route = useRoute();
  const ssrRenderedAt = useState<string>("ssrRenderedAt").value;
  const buildAt = ssrRenderedAt || runtime.public.buildAt;
  // Track the timestamp of the version currently shown to the user
  // Start at 0 so the first client poll can always reconcile against the file mtime
  const shownAtState = useState<number>("content-shown-at", () => 0);
  const defaultLocale = runtime.public.defaultLocale || "en";
  // Enrichment gating: disabled until first successful client-side reload
  const enhancementsEnabled = useState<boolean>("content-enhance-ready", () => false);
  const firstCheckDone = useState<boolean>("content-first-check-done", () => false);

  // Attempt a lightweight freshness check on client
  const poll = async () => {
    let updated = false;
    const url = staticHosting
      ? `/content-index.json?ts=${Date.now()}`
      : `/api/content-index?ts=${Date.now()}&locale=${encodeURIComponent(defaultLocale)}`;
    const { data } = await useFetch<{
      items: Array<{ _path: string; dateModified?: string | number }>;
    }>(url, { server: false, headers: { "cache-control": "no-cache" } });
    const items = data.value?.items || [];
    // Normalize path: if route already starts with a locale (e.g., /en, /fi, /sv), use it as-is.
    // Otherwise, prefix with defaultLocale. This avoids generating "/en/fi/..." paths.
    const isLocalized = /^\/[a-z]{2}(?:\/|$)/i.test(route.path);
    const normalize = (p: string) => {
      const withSlash = p.startsWith('/') ? p : `/${p}`
      let collapsed = withSlash.replace(/\/{2,}/g, '/')
      if (collapsed !== '/' && collapsed.endsWith('/')) collapsed = collapsed.slice(0, -1)
      collapsed = collapsed.replace(/^\/(\w{2})\/index$/i, '/$1')
      return collapsed
    }
    const candidatePath = normalize(
      isLocalized
        ? route.path
        : route.path === "/"
          ? `/${defaultLocale}`
          : `/${defaultLocale}${route.path}`,
    );
    const current = items.find((i) => i._path === candidatePath || i._path === route.path);
    if (current?.dateModified) {
      const modified = new Date(current.dateModified).getTime();
      const built = new Date(buildAt).getTime();
      const shown = Number(shownAtState.value || 0);
      const lsKey = `content-mtime:${candidatePath}`;
      const lsRaw = (typeof localStorage !== 'undefined') ? localStorage.getItem(lsKey) : null;
      const lsSeen = lsRaw ? Number(lsRaw) : 0;
      // Update only when server content is newer than anything we've shown/seen
      const seenMax = Math.max(shown, lsSeen);
      const shouldUpdate = modified > seenMax;
      if (process.dev) console.log("[freshness] Modified:", modified, "Shown:", shown, "Built:", built, "LS:", lsSeen, "ShouldUpdate:", shouldUpdate, "Current time:", new Date().getTime());
      if (shouldUpdate) {
        // On static hosting, skip API and use content query
        const fresh = staticHosting
          ? await queryContent(normalize(candidatePath)).findOne()
          : (await $fetch<{ doc: Record<string, unknown> | null }>("/api/content-doc", {
              params: { path: candidatePath, ts: Date.now() },
              headers: { "cache-control": "no-cache" },
            })).doc || (await queryContent(normalize(candidatePath)).findOne());
        if (fresh) {
          // Log exactly where we swap in the fresh document
          const prev = useState<Record<string, unknown> | null>("content-doc", () => null).value as any;
          if (process.dev) console.log("[freshness] Replacing SSR content with fresh content", {
            path: route.path,
            candidatePath,
            modified,
            built,
            shown,
            previous: prev ? { _path: prev?._path, dateModified: prev?.dateModified } : null,
            next: { _path: (fresh as any)?._path, dateModified: (fresh as any)?.dateModified },
          });
          const docState = useState<Record<string, unknown> | null>("content-doc", () => null);
          docState.value = fresh;
          const version = useState<number>("content-doc-version", () => 0);
          version.value = (version.value || 0) + 1;
          shownAtState.value = modified;
          // Persist the last shown content mtime so future polls don't loop
          if (typeof localStorage !== 'undefined') localStorage.setItem(lsKey, String(modified));
          updated = true;
          if (!enhancementsEnabled.value) {
            enhancementsEnabled.value = true;
            if (process.dev) console.log("[freshness] Enhancements enabled after content swap", { path: route.path });
          }
        } else {
          // Log fallback refresh when fresh doc query didn't resolve
          if (process.dev) console.log("[freshness] Fresh content detected; falling back to refreshNuxtData()", {
            path: route.path,
            candidatePath,
            modified,
            built,
            shown,
          });
          await refreshNuxtData();
          shownAtState.value = modified;
          if (typeof localStorage !== 'undefined') localStorage.setItem(lsKey, String(modified));
          updated = true;
          if (!enhancementsEnabled.value) {
            enhancementsEnabled.value = true;
            if (process.dev) console.log("[freshness] Enhancements enabled after refreshNuxtData", { path: route.path });
          }
        }
      }
    }
    return updated;
  };

  // Perform an immediate freshness check on client mount
  try {
    const changed = await poll();
    if (!enhancementsEnabled.value) enhancementsEnabled.value = true;
    if (!firstCheckDone.value && !changed) {
      // Force a one-time re-render so enhanced components can mount even without content change
      const version = useState<number>("content-doc-version", () => 0);
      version.value = (version.value || 0) + 1;
    }
    firstCheckDone.value = true;
  } catch {}

  // Progressive interval: first check after 5s, then +1s more after each reload (5s, 6s, 7s, ...)
  const baseSec = 5;
  let reloadCount = 0; // number of successful client-side content reloads
  let nextDelaySec = baseSec; // time until the next check
  let timer: ReturnType<typeof setTimeout> | null = null;

  const schedule = async () => {
    try {
      const changed = await poll();
      if (changed) {
        reloadCount += 1;
        // Increase the gap between checks by 1s after each reload
        nextDelaySec = baseSec + reloadCount;
      }
      // If no change, keep the current delay as-is
    } catch {}
    timer = setTimeout(schedule, nextDelaySec * 1000);
  };

  timer = setTimeout(schedule, nextDelaySec * 1000);
  onBeforeUnmount(() => {
    if (timer) clearTimeout(timer);
  });
});
