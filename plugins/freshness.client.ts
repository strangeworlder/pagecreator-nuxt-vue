// @ts-nocheck
export default defineNuxtPlugin((nuxtApp) => {
  const runtime = useRuntimeConfig();
  if (runtime.public.disableFreshness === "1" || runtime.public.disableFreshness === 1) {
    return;
  }
  const staticHosting =
    runtime.public.staticHosting === "1" ||
    runtime.public.staticHosting === 1 ||
    runtime.public.staticHosting === true;
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

  const enhancedComponentsLoaded = useState<boolean>("enhanced-components-loaded", () => false);

  const ensureEnhancementsReady = async () => {
    if (enhancementsEnabled.value) {
      return;
    }

    // Wait for enhanced components to be fully loaded in the page component
    // They're loaded via dynamic imports in [slug].vue
    const maxAttempts = 50; // 5 seconds max
    let attempts = 0;

    while (attempts < maxAttempts && !enhancedComponentsLoaded.value) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }

    if (!enhancedComponentsLoaded.value && process.dev) {
      console.warn("[freshness] Enhanced components not loaded after timeout, enabling anyway");
    }

    enhancementsEnabled.value = true;
    if (process.dev)
      console.log("[freshness] Enhancements enabled", {
        path: route.path,
        componentsLoaded: enhancedComponentsLoaded.value,
      });
  };

  // Attempt a lightweight freshness check on client
  const poll = async () => {
    let updated = false;
    // Normalize path: if route already starts with a locale (e.g., /en, /fi, /sv), use it as-is.
    // Otherwise, prefix with defaultLocale. This avoids generating "/en/fi/..." paths.
    const isLocalized = /^\/[a-z]{2}(?:\/|$)/i.test(route.path);
    const normalize = (p: string) => {
      const withSlash = p.startsWith("/") ? p : `/${p}`;
      let collapsed = withSlash.replace(/\/{2,}/g, "/");
      if (collapsed !== "/" && collapsed.endsWith("/")) collapsed = collapsed.slice(0, -1);
      collapsed = collapsed.replace(/^\/(\w{2})\/index$/i, "/$1");
      return collapsed;
    };
    // Prefer the currently rendered document's path (includes locale) to avoid wrong-locale lookups
    const currentDoc = useState<Record<string, unknown> | null>("content-doc", () => null).value;
    const docPath = typeof currentDoc?._path === "string" ? (currentDoc._path as string) : null;
    const candidatePath = normalize(
      docPath ||
        (isLocalized
          ? route.path
          : route.path === "/"
            ? `/${defaultLocale}`
            : `/${defaultLocale}${route.path}`),
    );
    const localeForApi = candidatePath.split("/")[1] || defaultLocale;
    const url = staticHosting
      ? `/content-index.json?ts=${Date.now()}`
      : `/api/content-index?ts=${Date.now()}&locale=${encodeURIComponent(localeForApi)}&path=${encodeURIComponent(candidatePath)}`;
    const { data } = await useFetch<{
      items: Array<{ _path: string; dateModified?: string | number }>;
    }>(url, { server: false, headers: { "cache-control": "no-cache" } });
    const items = data.value?.items || [];
    const current = items.find((i) => i._path === candidatePath || i._path === route.path);
    if (current?.dateModified) {
      const modified = new Date(current.dateModified).getTime();
      const built = new Date(buildAt).getTime();
      const shown = Number(shownAtState.value || 0);
      const lsKey = `content-mtime:${candidatePath}`;
      const lsRaw = typeof localStorage !== "undefined" ? localStorage.getItem(lsKey) : null;
      const lsSeen = lsRaw ? Number(lsRaw) : 0;
      // Update only when server content is newer than anything we've shown/seen
      const seenMax = Math.max(shown, lsSeen);
      const shouldUpdate = modified > seenMax;
      if (process.dev)
        console.log(
          "[freshness] Modified:",
          modified,
          "Shown:",
          shown,
          "Built:",
          built,
          "LS:",
          lsSeen,
          "ShouldUpdate:",
          shouldUpdate,
          "Current time:",
          new Date().getTime(),
        );
      if (shouldUpdate) {
        // On static hosting, skip API and use content query
        const fresh = staticHosting
          ? await queryContent(normalize(candidatePath)).findOne()
          : (
              await $fetch<{ doc: Record<string, unknown> | null }>("/api/content-doc", {
                params: { path: candidatePath, ts: Date.now() },
                headers: { "cache-control": "no-cache" },
              })
            ).doc || (await queryContent(normalize(candidatePath)).findOne());
        if (fresh) {
          // Log exactly where we swap in the fresh document
          const prev = useState<Record<string, unknown> | null>("content-doc", () => null).value;
          if (process.dev)
            console.log("[freshness] Replacing SSR content with fresh content", {
              path: route.path,
              candidatePath,
              modified,
              built,
              shown,
              previous: prev ? { _path: prev?._path, dateModified: prev?.dateModified } : null,
              next: {
                _path: (fresh as Record<string, unknown>)?._path,
                dateModified: (fresh as Record<string, unknown>)?.dateModified,
              },
            });
          const docState = useState<Record<string, unknown> | null>("content-doc", () => null);
          docState.value = fresh;
          const version = useState<number>("content-doc-version", () => 0);
          version.value = (version.value || 0) + 1;
          shownAtState.value = modified;
          // Persist the last shown content mtime so future polls don't loop
          if (typeof localStorage !== "undefined") localStorage.setItem(lsKey, String(modified));
          updated = true;
          await ensureEnhancementsReady();
        } else {
          // Log fallback refresh when fresh doc query didn't resolve
          if (process.dev)
            console.log("[freshness] Fresh content detected; falling back to refreshNuxtData()", {
              path: route.path,
              candidatePath,
              modified,
              built,
              shown,
            });
          await refreshNuxtData();
          shownAtState.value = modified;
          if (typeof localStorage !== "undefined") localStorage.setItem(lsKey, String(modified));
          updated = true;
          await ensureEnhancementsReady();
        }
      }
    }
    return updated;
  };

  // Perform an immediate freshness check on client mount, but delay state changes until after hydration
  nuxtApp.hook("app:mounted", async () => {
    try {
      await poll();
      await ensureEnhancementsReady();
      firstCheckDone.value = true;
    } catch {}

    // Progressive interval with backoff: check at 5s, then back off if no changes
    // If content changed: reset to 5s (content actively updating, check frequently)
    // If no changes: increase delay (5s → 11s → 18s → 26s → ...)
    // Skip polling entirely for static hosting since content won't change until redeployment
    if (!staticHosting) {
      const baseSec = 5;
      let pollsWithoutChange = 0; // number of consecutive polls without finding changes
      let nextDelaySec = baseSec; // time until the next check
      let timer: ReturnType<typeof setTimeout> | null = null;

      const schedule = async () => {
        try {
          const changed = await poll();
          if (changed) {
            // Content changed: reset to frequent polling
            pollsWithoutChange = 0;
            nextDelaySec = baseSec;
          } else {
            // No changes: back off exponentially
            pollsWithoutChange += 1;
            nextDelaySec = nextDelaySec + baseSec + pollsWithoutChange;
          }
        } catch {}
        timer = setTimeout(schedule, nextDelaySec * 1000);
      };

      timer = setTimeout(schedule, nextDelaySec * 1000);

      // Clean up timer when app is unmounted
      nuxtApp.hook("app:beforeUnmount", () => {
        if (timer) clearTimeout(timer);
      });
    }
  });
});
